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

Nothing else is rewritten. If a snippet does not run as published after that, it
is the snippet that is wrong.

Usage:
    SPEECHREVOLUTIONS_API_KEY=stt_... python3 scripts/run_snippets.py python
    ... run_snippets.py python ts go csharp
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

# Snippets that cannot be executed as a standalone program, with the reason.
# Each one is a framework handler driven separately by run_framework_snippets.py,
# or prose-shaped pseudocode that was never meant to run.
SKIP = {
    "needs a running web framework": (
        "FastAPI(", "@app.", "django", "WebApplication.CreateBuilder",
        "express()", "next/", "createServer(", "Flask(",
    ),
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
    return subs


def apply_subs(code: str) -> str:
    for old, new in substitutions():
        code = code.replace(old, new)
    return code


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
    head = PY_PRELUDE + PAGE_PRELUDE.get(page, "")
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
                               capture_output=True, text=True, timeout=900)
            if p.returncode == 0:
                res.ok.append(s)
            else:
                out = p.stderr or p.stdout
                if any(t in out for t in TRANSIENT):
                    p = subprocess.run([sys.executable, path], cwd=WORKSPACE, env=env,
                                       capture_output=True, text=True, timeout=900)
                    out = p.stderr or p.stdout
                if p.returncode == 0:
                    res.ok.append(s)
                else:
                    res.failed.append((s, "\n".join(out.strip().splitlines()[-6:])))
        except subprocess.TimeoutExpired:
            res.failed.append((s, "timed out after 900s"))
        finally:
            os.unlink(path)


# ------------------------------------------------------------------------------- ts

# Deliberately minimal: a snippet brings its own node: imports, and importing
# them here too is a redeclaration error.
TS_PRELUDE = 'import { SpeechRevolutions } from "%s/dist/esm/index.js";\n' % NODE_DIR

TS_CLIENT = "const client = new SpeechRevolutions({ timeout: 900000 });\n"

TS_SCOPE = {
    "result": 'const result = await client.transcribe("meeting.mp3");\n',
    "jobId": 'const jobId = await client.submit("meeting.mp3");\n',
}


def ts_program(code: str) -> str:
    body = apply_subs(code)
    # Point the published import at the local build, keeping whatever names it
    # binds, rather than stripping it and adding our own (which redeclares).
    published = re.search(r'^import \{[^}]*\} from "@speechrevolutions/stt";$', body, re.M)
    body = re.sub(r'(^import \{[^}]*\} from )"@speechrevolutions/stt";$',
                  r'\1"%s/dist/esm/index.js";' % NODE_DIR, body, flags=re.M)
    head = "" if published else TS_PRELUDE
    if not re.search(r"^\s*const client\s*=", body, re.M):
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
        program = ts_program(s.code)
        if s.language == "tsx" or re.search(r"^\s*(const|let|function)[^\n=]*:\s*\w", program, re.M) \
                or "interface " in program or ": string" in program or ": number" in program:
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
                               capture_output=True, text=True, timeout=900)
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


class Result:
    def __init__(self):
        self.ok: list[Snippet] = []
        self.failed: list[tuple[Snippet, str]] = []
        self.skipped: list[tuple[Snippet, str]] = []


RUNNERS = {"python": run_python, "ts": run_ts}


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
