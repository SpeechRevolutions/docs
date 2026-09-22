#!/usr/bin/env python3
"""Execute every code snippet the docs publish, against the real API.

check_snippets.py proves a snippet COMPILES. That is not the same as proving it
works: a call can have the right name, arity and types and still be wrong about
what the server does. This runs them.

Snippets are written for a reader, not for a test runner, so a few placeholders
have to be made real before they can execute. Only placeholders the docs
themselves present as stand-ins are substituted, and the substitution table is
printed with the results so it is obvious what was swapped:

  meeting.mp3, audio.mp3, ...  -> a real clip in the fixture workspace
  https://example.com/...      -> a reachable URL (SR_SNIPPET_AUDIO_URL)
  https://you.example.com/...  -> a reachable webhook sink (SR_SNIPPET_HOOK_URL)
  http://proxy.internal:8080   -> a real local forward proxy, when one is running
  ${SITE.apiBase}              -> the URL the page renders (it is a JSX
                                  interpolation, so the reader never sees the
                                  literal)
  export ...API_KEY=stt_...    -> neutralised; the key comes from the environment
                                  and is never written into a snippet or a log

Nothing else is rewritten. If a snippet does not run as published after that, it
is the snippet that is wrong.

The shell snippets are covered too -- the cURL calls, the install commands and
the ffmpeg lines. Install commands run verbatim but inside a throwaway sandbox
with that toolchain's bin first on PATH, so `pip install speechrevolutions` is
the published command and still cannot touch this machine. Shell snippets that
start a job are cancelled afterwards; see cancel_created_jobs for why that is
load-bearing rather than tidy.

Usage:
    SPEECHREVOLUTIONS_API_KEY=stt_... python3 scripts/run_snippets.py python
    ... run_snippets.py python ts go csharp bash
"""

from __future__ import annotations

import io
import os
import re
import shutil
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_snippets import Snippet, extract  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIBLING = os.path.dirname(REPO)
WORKSPACE = os.environ.get("SR_SNIPPET_WORKSPACE", "/tmp/snipfix")

PY_SRC = os.path.join(SIBLING, "python-sdk", "src")
NODE_DIR = os.path.join(SIBLING, "node-sdk")

AUDIO_URL = os.environ.get("SR_SNIPPET_AUDIO_URL", "")
HOOK_URL = os.environ.get("SR_SNIPPET_HOOK_URL", "")
PROXY_URL = os.environ.get("SR_SNIPPET_PROXY_URL", "")
SRC_BUCKET = os.environ.get("SR_SNIPPET_SRC_BUCKET", "")
OUT_BUCKET = os.environ.get("SR_SNIPPET_OUT_BUCKET", SRC_BUCKET)

# Snippets that cannot be executed as a standalone program, with the reason.
# Each one is a framework handler driven separately by run_framework_snippets.py,
# or prose-shaped pseudocode that was never meant to run.
SKIP = {
    "needs a running web framework": (
        "FastAPI(", "@app.", "django", "WebApplication.CreateBuilder",
        "express()", "next/", "createServer(", "Flask(",
        "app.post(", "app.get(", "app.listen(", "NextRequest", "NextResponse",
        '"server-only"', '"use server"', '"use client"', 'from "@/',
        "ListenAndServe(", "http.HandleFunc(", "HttpListener(", "app.Map",
    ),
    "needs a Supabase project": ("@supabase/supabase-js", "from supabase import",
                                 "SUPABASE_SERVICE_ROLE_KEY", "postgres_changes"),
    # Competitor "before" examples on the migration pages. Running these needs a
    # paid account with that provider, which we do not have and should not buy.
    # verify_competitor_snippets.py checks instead that every symbol they use
    # still resolves against the current library, which is the rot that matters.
    "needs a paid third-party account (competitor 'before' example)": (
        "import assemblyai", "from deepgram import", "from openai import",
        "from elevenlabs", "from faster_whisper import", "whisper.cpp",
    ),
}


# Failures that are the network rather than the snippet, retried once.
SNIPPET_TIMEOUT = 420


def summarize(out: str) -> str:
    """The useful part of a failure.

    Python puts the exception last and node puts it first, so neither a head nor
    a tail alone is right. Prefer the lines that actually name the error.
    """
    lines = [l for l in out.strip().splitlines() if l.strip()]
    named = [l for l in lines
             if re.search(r"(Error|Exception|error TS\d+):", l)
             or "ERR_MODULE_NOT_FOUND" in l or "Cannot find package" in l]
    if named:
        return "\n".join(named[:4])
    return "\n".join(lines[:6])


TRANSIENT = (
    "RemoteDisconnected",
    "Connection aborted",
    "Connection reset by peer",
    "Temporary failure in name resolution",
)


def substitutions() -> list[tuple[str, str]]:
    subs: list[tuple[str, str]] = []
    if AUDIO_URL:
        subs += [
            ("https://example.com/audio.mp3", AUDIO_URL),
            ("https://example.com/a.mp3", AUDIO_URL),
            ("https://example.com/", AUDIO_URL.rsplit("/", 1)[0] + "/"),
        ]
    if HOOK_URL:
        subs += [
            ("https://you.example.com/hook", HOOK_URL),
            ("https://you.example.com/webhooks/stt", HOOK_URL),
            ("https://your-app.example.com/webhooks/speechrevolutions", HOOK_URL),
        ]
    if PROXY_URL:
        subs += [("http://proxy.internal:8080", PROXY_URL)]
    if SRC_BUCKET:
        # The S3 page's placeholder buckets, pointed at one that exists.
        subs += [("my-audio", SRC_BUCKET), ("example-audio", SRC_BUCKET),
                 ("my-transcripts", OUT_BUCKET), ("example-transcripts", OUT_BUCKET)]
    return subs


def apply_subs(code: str) -> str:
    for old, new in substitutions():
        code = code.replace(old, new)
    return code


_REAL_JOB: list[str] = []


def real_job_id() -> str:
    """A job id that actually exists, created once per run.

    check_snippets injects an all-zero UUID for the `jobID` a page established
    earlier, which is enough to compile and useless to run — the API rightly
    answers "job not found". Snippets that fetch a job by id need a real one.
    """
    if _REAL_JOB:
        return _REAL_JOB[0]
    sys.path.insert(0, PY_SRC)
    from speechrevolutions import SpeechRevolutions  # noqa: E402

    with SpeechRevolutions(timeout=600) as c:
        result = c.transcribe(os.path.join(WORKSPACE, "meeting.mp3"))
    _REAL_JOB.append(result.job_id)
    return result.job_id


PLACEHOLDER_JOB = "00000000-0000-0000-0000-000000000000"


def real_key(program: str) -> str:
    """check_snippets injects a placeholder key so a snippet compiles. To RUN it
    the client has to read the real key from the environment, so the placeholder
    becomes an empty string, which is what every SDK treats as "use the env"."""
    program = (program
               .replace('stt.NewClient("k")', 'stt.NewClient("")')
               .replace('new SpeechRevolutionsClient("k")', 'new SpeechRevolutionsClient()'))
    if PLACEHOLDER_JOB in program:
        program = program.replace(PLACEHOLDER_JOB, real_job_id())
    return program


def skip_reason(code: str) -> str | None:
    for reason, markers in SKIP.items():
        if any(m in code for m in markers):
            return reason
    return None


# --------------------------------------------------------------------------- python

PY_PRELUDE = '''import os, sys, json, time, asyncio
from pathlib import Path
from speechrevolutions import SpeechRevolutions, AsyncSpeechRevolutions
'''

PY_CLIENT = "client = SpeechRevolutions(timeout=900)\n"
# A snippet that awaits was lifted from an async handler; give it the async client.
PY_ASYNC_CLIENT = "client = AsyncSpeechRevolutions(timeout=900)\n"

# Names a page establishes in an earlier block and keeps using.
PY_SCOPE = {
    "result": 'result = client.transcribe("meeting.mp3")\n',
    "job_id": 'job_id = client.submit("meeting.mp3")\n',
    "path": 'path = "meeting.mp3"\n',
    "key": 'key = "meeting.mp3"\n',
}


PAGE_PRELUDE = {
    # Names an integration page builds in its first block and keeps using.
    # Explicit and per page, because concatenating a page's earlier blocks
    # breaks far more snippets than it fixes — they are written to be read in
    # sequence, not executed in sequence.
    "/integrations/s3": (
        'import boto3\n'
        's3 = boto3.client("s3")\n'
        'SRC_BUCKET = "example-audio"\n'
        'OUT_BUCKET = "example-transcripts"\n'
    ),
}


def py_program(code: str, page: str = "") -> str:
    body = apply_subs(code)
    head = PY_PRELUDE + apply_subs(PAGE_PRELUDE.get(page, ""))
    awaits = (re.search(r"(?<![\w])(await |async with |async for )", body)
              and "asyncio.run(" not in body
              and not re.search(r"^\s*(async )?def ", body, re.M))
    if not re.search(r"^\s*client\s*=", body, re.M):
        head += PY_ASYNC_CLIENT if awaits else PY_CLIENT
        for name, decl in PY_SCOPE.items():
            used = re.search(r"(?<![\w.])" + name + r"(?![\w])", body)
            declared = re.search(r"^\s*" + name + r"\s*(?::[^=\n]+)?=(?!=)", body, re.M)
            if used and not declared:
                head += decl
    # Top-level await is legal for a reader following a page that is already
    # inside an async handler, but not for the interpreter. Wrap it.
    if awaits:
        indented = "\n".join("    " + l if l.strip() else "" for l in body.splitlines())
        body = "async def _main():\n" + indented + "\n\nasyncio.run(_main())\n"

    return head + "\n" + body + "\n"


def run_python(snips: list[Snippet], res) -> None:
    env = {**os.environ, "PYTHONPATH": PY_SRC, "PYTHONUNBUFFERED": "1"}
    env.setdefault("STT_WEBHOOK_SECRET", "whsec_snippet_runner")
    env.setdefault("SR_WEBHOOK_SECRET", "whsec_snippet_runner")
    env.setdefault("SUPABASE_URL", "https://example.supabase.co")
    env.setdefault("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")

    for s in snips:
        why = skip_reason(s.code)
        if why:
            res.skipped.append((s, why))
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".py", dir=WORKSPACE,
                                         delete=False) as f:
            f.write(py_program(s.code, s.page))
            path = f.name
        try:
            p = subprocess.run([sys.executable, path], cwd=WORKSPACE, env=env,
                               capture_output=True, text=True, timeout=SNIPPET_TIMEOUT)
            if p.returncode == 0:
                res.ok.append(s)
            else:
                out = p.stderr or p.stdout
                if any(t in out for t in TRANSIENT):
                    p = subprocess.run([sys.executable, path], cwd=WORKSPACE, env=env,
                                       capture_output=True, text=True, timeout=SNIPPET_TIMEOUT)
                    out = p.stderr or p.stdout
                if p.returncode == 0:
                    res.ok.append(s)
                else:
                    res.failed.append((s, summarize(out)))
        except subprocess.TimeoutExpired:
            res.failed.append((s, "timed out after 900s"))
        finally:
            os.unlink(path)


# ------------------------------------------------------------------------------- ts

# Deliberately minimal: a snippet brings its own node: imports, and importing
# them here too is a redeclaration error.
TS_PRELUDE = 'import { SpeechRevolutions } from "%s/dist/esm/index.js";\n' % NODE_DIR

TS_CLIENT = "const client = new SpeechRevolutions({ timeout: 900000 });\n"

TS_PAGE_PRELUDE = {
    # What the S3 page builds in its first block and keeps using in the second.
    "/integrations/s3": (
        'import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";\n'
        'import { getSignedUrl } from "@aws-sdk/s3-request-presigner";\n'
        'const s3 = new S3Client({});\n'
        'const SRC_BUCKET = "example-audio";\n'
        'const OUT_BUCKET = "example-transcripts";\n'
        'const key = "meeting.mp3";\n'
    ),
}

TS_SCOPE = {
    "result": 'const result = await client.transcribe("meeting.mp3");\n',
    "jobId": 'const jobId = await client.submit("meeting.mp3");\n',
    "filePath": 'const filePath = "meeting.mp3";\n',
}


def ts_program(code: str, page: str = "") -> str:
    body = apply_subs(code)
    # Point the published import at the local build, keeping whatever names it
    # binds, rather than stripping it and adding our own (which redeclares).
    published = re.search(r'^import \{[^}]*\} from "speechrevolutions";$', body, re.M)
    body = re.sub(r'(^import \{[^}]*\} from )"speechrevolutions";$',
                  r'\1"%s/dist/esm/index.js";' % NODE_DIR, body, flags=re.M)
    # A snippet may import only the error types; the injected client still needs
    # SpeechRevolutions itself, so the two decisions are independent.
    binds_sdk = bool(published and "SpeechRevolutions" in published.group(0))
    needs_client = not re.search(r"^\s*const (client|stt)\s*=", body, re.M)

    head = "" if binds_sdk or (published and not needs_client) else TS_PRELUDE
    prelude = apply_subs(TS_PAGE_PRELUDE.get(page, ""))
    if prelude and not re.search(r"new S3Client\(|createClient\(", body):
        head += prelude
    if needs_client:
        head += TS_CLIENT
        for name, decl in TS_SCOPE.items():
            used = re.search(r"(?<![\w.])" + name + r"(?![\w])", body)
            declared = re.search(r"^\s*(const|let|var)\s+" + name + r"\b", body, re.M)
            if used and not declared:
                head += decl
    return head + "\n" + body + "\n"


def run_ts(snips: list[Snippet], res) -> None:
    for s in snips:
        why = skip_reason(s.code)
        if why:
            res.skipped.append((s, why))
            continue
        program = ts_program(s.code, s.page)
        program = transpile_ts(program)
        # The file lives beside node-sdk/node_modules so bare specifiers like
        # "@aws-sdk/client-s3" resolve, but runs with the fixture workspace as
        # cwd so "meeting.mp3" does too. Node uses the file for the first and
        # the cwd for the second.
        with tempfile.NamedTemporaryFile("w", suffix=".mjs", dir=NODE_DIR,
                                         delete=False) as f:
            f.write(program)
            path = f.name
        try:
            p = subprocess.run(["node", path], cwd=WORKSPACE, env=os.environ,
                               capture_output=True, text=True, timeout=SNIPPET_TIMEOUT)
            if p.returncode == 0:
                res.ok.append(s)
            else:
                tail = (p.stderr or p.stdout).strip().splitlines()[-6:]
                res.failed.append((s, "\n".join(tail)))
        except subprocess.TimeoutExpired:
            res.failed.append((s, "timed out after 900s"))
        finally:
            os.unlink(path)


def transpile_ts(program: str) -> str:
    """Strip TypeScript types with tsc so node can run the snippet.

    The docs publish real .ts for the integration pages, and node 18 has no
    type stripping of its own.
    """
    tsc = os.path.join(REPO, "node_modules", ".bin", "tsc")
    if not os.path.exists(tsc):
        return program
    d = tempfile.mkdtemp(prefix="ts-strip-")
    src = os.path.join(d, "s.ts")
    io.open(src, "w").write(program)
    subprocess.run([tsc, src, "--target", "esnext", "--module", "esnext",
                    "--moduleResolution", "bundler", "--skipLibCheck",
                    "--noResolve", "--noEmitOnError", "false"],
                   capture_output=True, text=True, timeout=180)
    out = os.path.join(d, "s.js")
    result = io.open(out).read() if os.path.exists(out) else program
    shutil.rmtree(d, ignore_errors=True)
    return result


# --------------------------------------------------------------------------- go/csharp
#
# check_snippets.py already builds a compilable program from each Go and C#
# snippet, including the page-scope machinery. Reuse that exactly, so what runs
# here is the same text that is proven to compile there, and only the execution
# is new.

def run_go(snips: list[Snippet], res) -> None:
    import check_snippets as C

    if not os.path.exists(C.GO_BIN):
        for s in snips:
            res.skipped.append((s, "go toolchain not found"))
        return

    work = tempfile.mkdtemp(prefix="runsnip-go-")
    io.open(os.path.join(work, "go.mod"), "w").write(
        "module runsnippets\n\ngo 1.22\n\n"
        "require github.com/speechrevolutions/speechrevolutions-go v0.0.0\n\n"
        f"replace github.com/speechrevolutions/speechrevolutions-go => {C.GO_SDK}\n"
    )
    env = {**os.environ, "GOFLAGS": "-mod=mod", "GOTOOLCHAIN": "local"}

    # Write every program FIRST. `go mod tidy` prunes anything no package in the
    # module imports, so tidying between snippets drops the AWS modules that
    # only the S3 page needs.
    planned: list[tuple[str, Snippet]] = []
    seen: dict[str, list[str]] = {}
    for i, sn in enumerate(snips):
        why = skip_reason(sn.code)
        if why:
            res.skipped.append((sn, why))
            continue
        context = "\n\n".join(seen.get(sn.page, []))
        program = real_key(C.go_program(apply_subs(sn.code), context, sn.page))
        decls = C.go_toplevel_decls(sn.code)
        if decls:
            seen.setdefault(sn.page, []).append(decls)
        if not re.search(r"^package main\b", program, re.M):
            res.skipped.append((sn, "library package, nothing to run"))
            continue
        name = f"s{i}"
        os.makedirs(os.path.join(work, name), exist_ok=True)
        io.open(os.path.join(work, name, "main.go"), "w").write(program)
        planned.append((name, sn))

    all_code = "\n".join(sn.code for _n, sn in planned)
    for _path, (q, module) in C.GO_EXTRA.items():
        if re.search(r"(?<![\w.])" + re.escape(q), all_code):
            subprocess.run([C.GO_BIN, "get", module], cwd=work, env=env,
                           capture_output=True, timeout=300)
    subprocess.run([C.GO_BIN, "mod", "tidy"], cwd=work, env=env,
                   capture_output=True, timeout=600)

    for name, sn in planned:
        binary = os.path.join(work, name + ".bin")
        b = subprocess.run([C.GO_BIN, "build", "-o", binary, f"./{name}/"],
                           cwd=work, env=env, capture_output=True, text=True,
                           timeout=300)
        if b.returncode != 0:
            res.failed.append((sn, summarize(b.stderr or b.stdout)))
            continue
        # Built inside the module, run inside the fixture workspace: the binary
        # needs meeting.mp3 next to it, not go.mod.
        try:
            p = subprocess.run([binary], cwd=WORKSPACE, env=os.environ,
                               capture_output=True, text=True, timeout=SNIPPET_TIMEOUT)
            out = p.stderr or p.stdout
            if p.returncode != 0 and any(t in out for t in TRANSIENT):
                p = subprocess.run([binary], cwd=WORKSPACE, env=os.environ,
                                   capture_output=True, text=True, timeout=SNIPPET_TIMEOUT)
                out = p.stderr or p.stdout
            if p.returncode == 0:
                res.ok.append(sn)
            else:
                res.failed.append((sn, summarize(out)))
        except subprocess.TimeoutExpired:
            res.failed.append((sn, f"timed out after {SNIPPET_TIMEOUT}s"))
    shutil.rmtree(work, ignore_errors=True)


def run_csharp(snips: list[Snippet], res) -> None:
    import check_snippets as C

    if not os.path.exists(C.DOTNET):
        for s in snips:
            res.skipped.append((s, "dotnet not found"))
        return

    root = os.environ.get("DOTNET_ROOT", os.path.dirname(C.DOTNET))
    env = {**os.environ, "DOTNET_ROOT": root, "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
           "DOTNET_NOLOGO": "1", "PATH": root + os.pathsep + os.environ.get("PATH", "")}

    work = tempfile.mkdtemp(prefix="runsnip-cs-")
    proj = os.path.join(work, "console")
    subprocess.run([C.DOTNET, "new", "console", "-o", proj, "--no-restore"],
                   env=env, capture_output=True, timeout=300)
    subprocess.run([C.DOTNET, "add", proj, "reference", C.CS_SDK],
                   env=env, capture_output=True, timeout=300)
    if any("Amazon.S3" in x.code for x in snips):
        subprocess.run([C.DOTNET, "add", proj, "package", "AWSSDK.S3"],
                       env=env, capture_output=True, timeout=600)
    ls = os.path.join(proj, "Properties", "launchSettings.json")
    if os.path.exists(ls):
        os.remove(ls)

    seen: dict[str, list[str]] = {}
    for s in snips:
        why = skip_reason(s.code)
        if why:
            res.skipped.append((s, why))
            continue
        context = "\n\n".join(seen.get(s.page, []))
        io.open(os.path.join(proj, "Program.cs"), "w").write(
            real_key(C.cs_program(apply_subs(s.code), context, s.page)))
        decls = C.cs_toplevel_decls(s.code)
        if decls:
            seen.setdefault(s.page, []).append(decls)
        try:
            p = subprocess.run([C.DOTNET, "run", "--project", proj, "-v", "q", "--nologo"],
                               cwd=WORKSPACE, env=env, capture_output=True, text=True,
                               timeout=SNIPPET_TIMEOUT + 120)
            out = p.stdout + p.stderr
            if p.returncode == 0:
                res.ok.append(s)
            else:
                res.failed.append((s, summarize(out)))
        except subprocess.TimeoutExpired:
            res.failed.append((s, f"timed out after {SNIPPET_TIMEOUT}s"))
    shutil.rmtree(work, ignore_errors=True)


# --------------------------------------------------------------------------- bash

# The docs render these inside a JSX template literal, so `${SITE.apiBase}` is an
# interpolation, not literal text: the published page shows the resolved URL.
# Resolving it here reproduces what a reader copies.
SITE_API_BASE = "https://api.speechrevolutions.com"

BASH_SKIP = {
    "an illustrative request body, not a runnable request": ("-d '{ ... }'",),
    "clones a repo and runs the whole benchmark suite against production":
        ("git clone https://github.com/SpeechRevolutions/benchmarks",),
    # The migration page's "before" example: the reader's existing setup, which
    # is a binary they compiled and model weights they downloaded.
    "needs a locally compiled whisper.cpp binary and model weights":
        ("./main -m models/",),
}

# Commands that install something. Each is run verbatim, but inside a throwaway
# sandbox with that toolchain's `bin` first on PATH, so `pip install ...` is the
# published command yet cannot touch the machine's environment.
INSTALL_MARKERS = ("pip install", "npm install", "go get", "dotnet add package",
                   "spacy download")


def bash_is_install(code: str) -> bool:
    return any(m in code for m in INSTALL_MARKERS)


def bash_program(code: str) -> str:
    """Make a published shell snippet runnable without rewriting what it does."""
    code = code.replace("${SITE.apiBase}", SITE_API_BASE)
    # `export SPEECHREVOLUTIONS_API_KEY=stt_...` is the docs telling a reader to
    # set their key. Executing it verbatim would overwrite the real key with the
    # literal "stt_...", so the line is neutralised rather than the key inlined --
    # inlining would put a live credential in the log.
    code = re.sub(r"^export SPEECHREVOLUTIONS_API_KEY=.*$",
                  r"# (key comes from the environment)", code, flags=re.M)
    if "$JOB_ID" in code:
        code = f'JOB_ID="{real_job_id()}"\n' + code
    return code


def bash_fixtures(work: str) -> None:
    """Materialise the files the shell snippets name."""
    src = os.path.join(WORKSPACE, "meeting.mp3")
    for name in ("meeting.mp3", "audio.mp3"):
        shutil.copy(src, os.path.join(work, name))
    # /tutorials/subtitles burns captions.srt into talk.mp4.
    with io.open(os.path.join(work, "captions.srt"), "w", encoding="utf-8") as fh:
        fh.write("1\n00:00:00,000 --> 00:00:02,000\nhello\n\n")
    subprocess.run(
        ["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=320x240:d=3",
         "-i", src, "-shortest", "-c:v", "libx264", "-pix_fmt", "yuv420p",
         os.path.join(work, "talk.mp4")],
        capture_output=True, timeout=180,
    )


def bash_sandbox(code: str, work: str) -> dict[str, str]:
    """A PATH that isolates an install command, or {} when nothing is installed."""
    env = {**os.environ}
    if "pip install" in code or "spacy download" in code:
        venv = os.path.join(work, ".venv")
        subprocess.run([sys.executable, "-m", "venv", venv], capture_output=True, timeout=300)
        env["PATH"] = os.path.join(venv, "bin") + os.pathsep + env["PATH"]
        env["VIRTUAL_ENV"] = venv
    if "npm install" in code:
        subprocess.run(["npm", "init", "-y"], cwd=work, capture_output=True, timeout=300)
    if "go get" in code:
        subprocess.run(["go", "mod", "init", "snippet/check"], cwd=work,
                       capture_output=True, timeout=300)
        env["GOTOOLCHAIN"] = "local"
    if "dotnet add package" in code:
        subprocess.run(["dotnet", "new", "console", "-o", "."], cwd=work,
                       capture_output=True, timeout=600)
        env.setdefault("DOTNET_CLI_TELEMETRY_OPTOUT", "1")
        env.setdefault("DOTNET_NOLOGO", "1")
    return env


# Job ids created by snippets that only START an upload. `POST /api/v1/upload`
# mints a job and returns a presigned URL; actually uploading the bytes is a
# separate step the snippet does not show, so running it verbatim leaves a job
# registered that will never complete and never fail.
#
# That is not untidiness. Production sheds customer intake when two such jobs sit
# past their deadline, so a harness that left them behind would take the platform
# down for everyone, every time it ran. It is exactly how this was discovered.
_CREATED_JOBS: list[str] = []

_JOB_ID_RE = re.compile(
    r'"job_id"\s*:\s*"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})"')


def _collect_jobs(output: str) -> None:
    _CREATED_JOBS.extend(_JOB_ID_RE.findall(output))


def cancel_created_jobs() -> None:
    """Give every job a snippet started a terminal state."""
    if not _CREATED_JOBS:
        return
    sys.path.insert(0, PY_SRC)
    from speechrevolutions import SpeechRevolutions  # noqa: E402

    cancelled = 0
    with SpeechRevolutions() as c:
        for job_id in dict.fromkeys(_CREATED_JOBS):
            try:
                if c.get_job_status(job_id).status != "processing":
                    continue
                c.cancel_job(job_id)
                cancelled += 1
            except Exception as exc:  # noqa: BLE001
                print(f"  [WARN] could not cancel {job_id}: {exc}", file=sys.stderr)
    if cancelled:
        print(f"cleaned up {cancelled} job(s) left open by create-only snippets")


def run_bash(snippets: list[Snippet], res: Result) -> None:
    for s in snippets:
        # Deliberately NOT skip_reason(): those markers describe program source
        # ("django", "whisper.cpp") and match shell text that merely mentions the
        # same words -- `pip install django speechrevolutions` is a runnable
        # install command, not a Django app.
        why = _bash_skip_reason(s.code)
        if why:
            res.skipped.append((s, why))
            continue
        work = tempfile.mkdtemp(prefix="snipbash-")
        try:
            program = bash_program(apply_subs(s.code))
            bash_fixtures(work)
            env = bash_sandbox(program, work)
            path = os.path.join(work, "snippet.sh")
            with io.open(path, "w", encoding="utf-8") as fh:
                # -e so a failing line fails the snippet; -o pipefail so a failure
                # part-way through a pipeline is not masked by a succeeding tail.
                fh.write("set -euo pipefail\n" + program + "\n")
            timeout = 900 if bash_is_install(program) else SNIPPET_TIMEOUT
            p = subprocess.run(["bash", path], cwd=work, env=env,
                               capture_output=True, text=True, timeout=timeout)
            _collect_jobs(p.stdout)
            if p.returncode == 0:
                res.ok.append(s)
            else:
                res.failed.append((s, summarize(p.stdout + p.stderr)))
        except subprocess.TimeoutExpired:
            res.failed.append((s, f"timed out after {timeout}s"))
        finally:
            shutil.rmtree(work, ignore_errors=True)
    cancel_created_jobs()


def _bash_skip_reason(code: str) -> str | None:
    for reason, markers in BASH_SKIP.items():
        if any(m in code for m in markers):
            return reason
    return None


class Result:
    def __init__(self):
        self.ok: list[Snippet] = []
        self.failed: list[tuple[Snippet, str]] = []
        self.skipped: list[tuple[Snippet, str]] = []


RUNNERS = {"python": run_python, "ts": run_ts, "go": run_go,
           "csharp": run_csharp, "bash": run_bash}


def main() -> int:
    wanted = set(sys.argv[1:]) or set(RUNNERS)
    os.makedirs(WORKSPACE, exist_ok=True)

    snippets = extract(os.path.join(REPO, "src", "app"))
    by_lang: dict[str, list[Snippet]] = {}
    for s in snippets:
        if s.language in RUNNERS and s.language in wanted:
            by_lang.setdefault(s.language, []).append(s)

    res = Result()
    for lang, group in sorted(by_lang.items()):
        print(f"running {len(group):3d} {lang} snippets against the live API ...",
              flush=True)
        RUNNERS[lang](group, res)

    print()
    for s, why in res.failed:
        print(f"FAIL  {s.page}  [{s.language} #{s.index} {s.label or s.kind}]")
        for line in why.splitlines():
            print(f"        {line}")
    for s, why in res.skipped:
        print(f"SKIP  {s.page}  [{s.language} #{s.index}]  {why}")
    print(f"\n{len(res.ok)} ran, {len(res.failed)} failed, {len(res.skipped)} skipped")
    return 1 if res.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
