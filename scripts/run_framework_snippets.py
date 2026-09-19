#!/usr/bin/env python3
"""Boot the docs' web-framework snippets and drive real requests at them.

run_snippets.py executes the snippets that stand alone. The rest are handlers —
a FastAPI route, an Express receiver, an ASP.NET endpoint — which are not
programs and cannot be run by themselves. They are also the snippets a customer
is most likely to paste into something that matters, so "it compiles" is the
weakest possible claim about them.

Each page's handler snippets ARE the app, in the order the page presents them,
which is how a reader assembles them. This concatenates them, starts the server,
and issues the requests the page says it answers — including, for the webhook
receivers, a correctly signed delivery AND a forged one, because a receiver that
accepts everything passes a happy-path test.

Usage:
    SPEECHREVOLUTIONS_API_KEY=stt_... python3 scripts/run_framework_snippets.py
    ... run_framework_snippets.py fastapi
"""

from __future__ import annotations

import hashlib
import hmac
import re
import io
import json
import os
import signal
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_snippets import extract  # noqa: E402
import run_snippets as R  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIBLING = os.path.dirname(REPO)
PY_SRC = os.path.join(SIBLING, "python-sdk", "src")
NODE_DIR = os.path.join(SIBLING, "node-sdk")
WORKSPACE = R.WORKSPACE
SECRET = "whsec_framework_runner"


def free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def wait_until_up(port: int, proc: subprocess.Popen, seconds: int = 40) -> bool:
    deadline = time.time() + seconds
    while time.time() < deadline:
        if proc.poll() is not None:
            return False
        try:
            socket.create_connection(("127.0.0.1", port), timeout=0.5).close()
            return True
        except OSError:
            time.sleep(0.3)
    return False


def request(port: int, method: str, path: str, body: bytes | None = None,
            headers: dict | None = None, timeout: int = 60):
    req = urllib.request.Request(
        f"http://127.0.0.1:{port}{path}", data=body, method=method,
        headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except (urllib.error.URLError, ConnectionResetError, OSError) as e:
        # The server died mid-request, which is a failure of the snippet, not
        # of the probe — report it as one rather than raising out of the driver.
        return 0, str(e).encode()


def signed(body: bytes) -> str:
    return "sha256=" + hmac.new(SECRET.encode(), body, hashlib.sha256).hexdigest()


def page_snippets(page: str, language: str) -> list[str]:
    out = []
    for s in extract(os.path.join(REPO, "src", "app")):
        if s.page == page and s.language == language:
            if R.skip_reason(s.code) == "needs a running web framework":
                out.append(R.apply_subs(s.code))
    return out


# --------------------------------------------------------------------------- fastapi

def drive_fastapi(results: list) -> None:
    page = "/integrations/fastapi"
    parts = page_snippets(page, "python")
    if not parts:
        results.append((page, "fastapi", "SKIP", "no snippets found"))
        return

    app_src = "\n\n".join(parts)
    d = tempfile.mkdtemp(prefix="fw-fastapi-")
    io.open(os.path.join(d, "app.py"), "w").write(app_src)

    port = free_port()
    env = {**os.environ, "PYTHONPATH": PY_SRC, "STT_WEBHOOK_SECRET": SECRET}
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--port", str(port), "--log-level", "warning"],
        cwd=d, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

    try:
        if not wait_until_up(port, proc):
            out = proc.stdout.read()[-800:] if proc.stdout else ""
            results.append((page, "fastapi", "FAIL", f"server did not start:\n{out}"))
            return

        # The webhook receiver, which is the snippet that matters most.
        body = json.dumps({"job_id": "abc", "status": "completed",
                           "download_url": "https://example/r"}).encode()
        code, _ = request(port, "POST", "/webhooks/stt", body,
                          {"Content-Type": "application/json",
                           "X-SR-Signature": signed(body)})
        if code != 200:
            results.append((page, "fastapi", "FAIL", f"signed webhook -> {code}"))
            return
        code, _ = request(port, "POST", "/webhooks/stt", body,
                          {"Content-Type": "application/json",
                           "X-SR-Signature": "sha256=" + "0" * 64})
        if code != 401:
            results.append((page, "fastapi", "FAIL",
                            f"forged signature accepted -> {code}"))
            return

        # A job that does not exist must 404 rather than 500.
        code, _ = request(port, "GET", "/progress/does-not-exist")
        if code != 404:
            results.append((page, "fastapi", "FAIL", f"unknown job -> {code}"))
            return

        # The upload route, end to end through a real transcription.
        audio = io.open(os.path.join(WORKSPACE, "meeting.mp3"), "rb").read()
        boundary = "----frameworkrunner"
        multipart = (
            f"--{boundary}\r\n"
            'Content-Disposition: form-data; name="file"; filename="meeting.mp3"\r\n'
            "Content-Type: audio/mpeg\r\n\r\n").encode() + audio + f"\r\n--{boundary}--\r\n".encode()
        code, payload = request(
            port, "POST", "/transcribe", multipart,
            {"Content-Type": f"multipart/form-data; boundary={boundary}"})
        if code != 200:
            results.append((page, "fastapi", "FAIL", f"/transcribe -> {code} {payload[:200]}"))
            return
        job_id = json.loads(payload)["job_id"]

        deadline = time.time() + 300
        phase = None
        while time.time() < deadline:
            code, payload = request(port, "GET", f"/progress/{job_id}")
            if code != 200:
                results.append((page, "fastapi", "FAIL", f"/progress -> {code}"))
                return
            snap = json.loads(payload)
            phase = snap["phase"]
            if phase in ("done", "failed"):
                break
            time.sleep(3)

        if phase != "done":
            results.append((page, "fastapi", "FAIL", f"job ended in phase {phase}"))
            return
        if not (snap.get("text") or "").strip():
            results.append((page, "fastapi", "FAIL", "finished with an empty transcript"))
            return

        results.append((page, "fastapi", "OK",
                        f"webhook signed/forged, 404, upload -> {len(snap['text'])} chars"))
    finally:
        proc.send_signal(signal.SIGINT)
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


# --------------------------------------------------------------- fastapi, generically
#
# The other FastAPI pages build their app across several blocks, most of which
# are not handlers (a dataclass, a helper). The page as a whole is the program,
# which is how a reader assembles it, so the whole page is what gets booted.
# Each discovered route is then probed: anything but a 5xx means the handler ran
# and made its own decision, which is what is being checked here. A 500 means
# the published code threw.

def assemble_python(code: str) -> str:
    """A page block, reduced to what an app needs from it.

    Some pages mix handlers with blocks that transcribe a file where they stand.
    Those are worth running (run_snippets does exactly that) but not at import
    time of a server, where they would bill a job and can fail for reasons that
    have nothing to do with the handler. Definitions, imports and routes are
    kept; module-level work is dropped.
    """
    import ast

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return ""  # a fragment that only parses inside a function

    lines = code.splitlines()

    def segment(node) -> str:
        # get_source_segment starts at `def`, which drops the @app.post above it.
        start = node.lineno
        for dec in getattr(node, "decorator_list", []):
            start = min(start, dec.lineno)
        return "\n".join(lines[start - 1:node.end_lineno])

    local_funcs = {n.name for n in tree.body
                   if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}

    def does_work(node) -> bool:
        """True if this assignment runs the page's own machinery at import time."""
        for sub in ast.walk(node):
            if not isinstance(sub, ast.Call):
                continue
            fn = sub.func
            if isinstance(fn, ast.Attribute) and isinstance(fn.value, ast.Name) \
                    and fn.value.id in ("client", "stt"):
                return True
            if isinstance(fn, ast.Name) and fn.id in local_funcs:
                return True
        return False

    kept = []
    for node in tree.body:
        seg = segment(node)
        if isinstance(node, (ast.Import, ast.ImportFrom, ast.FunctionDef,
                             ast.AsyncFunctionDef, ast.ClassDef)):
            kept.append(seg)
        elif isinstance(node, (ast.Assign, ast.AnnAssign)) and not does_work(node):
            kept.append(seg)
    return "\n\n".join(kept)


ROUTE = re.compile(r'@app\.(get|post)\("([^"]+)"\)')


def drive_fastapi_page(page: str, results: list) -> None:
    parts = [assemble_python(R.apply_subs(s.code))
             for s in extract(os.path.join(REPO, "src", "app"))
             if s.page == page and s.language == "python"]
    parts = [p for p in parts if p.strip()]
    if not parts:
        results.append((page, "fastapi", "SKIP", "no python snippets"))
        return

    src = "\n\n".join(parts)
    if "@app." not in src:
        results.append((page, "fastapi", "SKIP", "no routes on this page"))
        return

    d = tempfile.mkdtemp(prefix="fw-fastapi-")
    io.open(os.path.join(d, "app.py"), "w").write(src)
    port = free_port()
    env = {**os.environ, "PYTHONPATH": os.pathsep.join([PY_SRC, d]),
           "STT_WEBHOOK_SECRET": SECRET, "SR_WEBHOOK_SECRET": SECRET}
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app:app", "--port", str(port),
         "--log-level", "warning"],
        cwd=WORKSPACE, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        if not wait_until_up(port, proc):
            out = proc.stdout.read()[-800:] if proc.stdout else ""
            results.append((page, "fastapi", "FAIL", f"server did not start:\n{out}"))
            return

        probed = 0
        for method, path in ROUTE.findall(src):
            concrete = re.sub(r"\{[^}]+\}", "probe", path)
            body, headers = None, {}
            if method == "post":
                body = json.dumps({"job_id": "abc", "status": "completed"}).encode()
                headers = {"Content-Type": "application/json",
                           "X-SR-Signature": signed(body)}
            code, payload = request(port, method.upper(), concrete, body, headers)
            probed += 1
            if code >= 500:
                results.append((page, "fastapi", "FAIL",
                                f"{method.upper()} {concrete} -> {code} {payload[:160]}"))
                return
        results.append((page, "fastapi", "OK", f"booted; {probed} route(s) answered without a 5xx"))
    finally:
        proc.send_signal(signal.SIGINT)
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()


def drive_fastapi_other(results: list) -> None:
    for page in ("/cookbook", "/guides/live-progress", "/tutorials/meeting-app",
                 "/sdks/python"):
        drive_fastapi_page(page, results)


# --------------------------------------------------------------------------- express

JS_WORK = re.compile(r"^(?:(?:const|let|var)\s+\w+\s*=\s*)?await\s+client\.")
JS_ROUTE = re.compile(r'app\.(get|post)\(\s*"([^"]+)"')


def assemble_js(code: str) -> str:
    """Drop the module-level transcribe calls; keep everything structural.

    Same reasoning as the Python assembler: a block that transcribes where it
    stands is right for a reader and wrong at startup of a server.
    """
    out, skipping = [], False
    for line in code.splitlines():
        if skipping:
            if line.startswith((")", "}", "]")) or line.rstrip().endswith((");", "});")):
                skipping = False
            continue
        if JS_WORK.match(line):
            if not line.rstrip().endswith(";"):
                skipping = True
            continue
        out.append(line)
    return "\n".join(out)


SDK_IMPORT = re.compile(r'^import \{([^}]*)\} from "speechrevolutions";\s*$', re.M)


def merge_sdk_imports(src: str, local: str) -> str:
    names: list[str] = []
    for group in SDK_IMPORT.findall(src):
        for n in group.split(","):
            n = n.strip()
            if n and n not in names:
                names.append(n)
    src = SDK_IMPORT.sub("", src)
    if names:
        src = f'import {{ {", ".join(names)} }} from "{local}";\n' + src
    return src


def dedupe_imports(src: str) -> str:
    seen, out = set(), []
    for line in src.splitlines():
        decl = (line.startswith("import ")
                or re.match(r"^(const|let|var)\s+\w+\s*=", line))
        if decl and line.rstrip().endswith(";"):
            if line in seen:
                continue
            seen.add(line)
        out.append(line)
    return "\n".join(out)


def drive_express(results: list) -> None:
    pages = ("/cookbook", "/guides/live-progress", "/tutorials/meeting-app")
    for page in pages:
        # A cookbook page is a list of independent recipes, not one program —
        # each recipe builds its own client, so concatenating them redeclares it.
        # There, only the handler recipe is the app.
        only_handlers = page == "/cookbook"
        parts = [assemble_js(R.apply_subs(s.code))
                 for s in extract(os.path.join(REPO, "src", "app"))
                 if s.page == page and s.language == "ts"
                 and (not only_handlers
                      or R.skip_reason(s.code) == "needs a running web framework")]
        src = dedupe_imports("\n\n".join(p for p in parts if p.strip()))
        if not JS_ROUTE.search(src):
            results.append((page, "express", "SKIP", "no express routes on this page"))
            continue

        port = free_port()
        head = 'import express from "express";\n'
        if "const app = express()" not in src:
            head += "const app = express();\n"
        # A receiver that verifies a signature needs the raw bytes; a global
        # json parser would consume the body before it ever reaches the route.
        if "express.raw" not in src:
            head += "app.use(express.json());\n"
        src = merge_sdk_imports(
            src.replace('import express from "express";', ""),
            f"{NODE_DIR}/dist/esm/index.js")
        src = head + src + f"\napp.listen({port});\n"

        path = os.path.join(NODE_DIR, f"_fw_{port}.mjs")
        io.open(path, "w").write(src)
        env = {**os.environ, "SR_WEBHOOK_SECRET": SECRET, "STT_WEBHOOK_SECRET": SECRET}
        proc = subprocess.Popen([ "node", path], cwd=WORKSPACE, env=env,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        try:
            if not wait_until_up(port, proc):
                out = proc.stdout.read()[-700:] if proc.stdout else ""
                results.append((page, "express", "FAIL", f"server did not start:\n{out}"))
                continue

            probed, verified = 0, ""
            for method, route in JS_ROUTE.findall(src):
                concrete = re.sub(r":(\w+)", "probe", route)
                body, headers = None, {}
                if method == "post":
                    body = json.dumps({"job_id": "abc", "status": "completed",
                                       "jobId": "abc", "url": "https://example/a.mp3"}).encode()
                    headers = {"Content-Type": "application/json",
                               "X-SR-Signature": signed(body)}
                code, payload = request(port, method.upper(), concrete, body, headers)
                probed += 1
                if code == 0 or code >= 500:
                    extra = ""
                    if code == 0 and proc.poll() is not None and proc.stdout:
                        extra = " | server output: " + proc.stdout.read()[:500].replace("\n", " ")
                    results.append((page, "express", "FAIL",
                                    f"{method.upper()} {concrete} -> {code} {payload[:120]}{extra}"))
                    break
                # A receiver that verifies must reject a forged signature.
                if method == "post" and "verifySignature" in src:
                    bad, _ = request(port, "POST", concrete, body,
                                     {"Content-Type": "application/json",
                                      "X-SR-Signature": "sha256=" + "0" * 64})
                    if bad != 401:
                        results.append((page, "express", "FAIL",
                                        f"forged signature at {concrete} -> {bad}"))
                        break
                    verified = ", forged signature rejected"
            else:
                results.append((page, "express", "OK",
                                f"booted; {probed} route(s) answered without a 5xx{verified}"))
        finally:
            proc.kill()
            if os.path.exists(path):
                os.unlink(path)


# --------------------------------------------------------------------------- go

GO_ROUTE = re.compile(r'http\.HandleFunc\("(?:(GET|POST) )?([^"]+)"')


def drive_go(results: list) -> None:
    import check_snippets as C

    for page in ("/cookbook", "/guides/live-progress", "/tutorials/meeting-app"):
        snips = [sn for sn in extract(os.path.join(REPO, "src", "app"))
                 if sn.page == page and sn.language == "go"]
        handlers = [sn for sn in snips
                    if R.skip_reason(sn.code) == "needs a running web framework"]
        if not handlers:
            results.append((page, "go", "SKIP", "no go handlers on this page"))
            continue

        # Same rule as elsewhere: a cookbook page is separate recipes.
        use = handlers if page == "/cookbook" else snips
        context = "\n\n".join(C.go_toplevel_decls(sn.code) for sn in use
                               if sn not in handlers)
        body = "\n\n".join(R.apply_subs(sn.code) for sn in handlers)

        port = free_port()
        body = re.sub(r'ListenAndServe\(":\d+"', f'ListenAndServe(":{port}"', body)
        if "ListenAndServe(" not in body:
            body += f'\nlog.Fatal(http.ListenAndServe(":{port}", nil))\n'
        program = R.real_key(C.go_program(body, context, page))

        work = tempfile.mkdtemp(prefix="fw-go-")
        io.open(os.path.join(work, "go.mod"), "w").write(
            "module fwsnippets\n\ngo 1.22\n\n"
            "require github.com/speechrevolutions/speechrevolutions-go v0.0.0\n\n"
            f"replace github.com/speechrevolutions/speechrevolutions-go => {C.GO_SDK}\n")
        os.makedirs(os.path.join(work, "app"))
        io.open(os.path.join(work, "app", "main.go"), "w").write(program)
        env = {**os.environ, "GOFLAGS": "-mod=mod", "GOTOOLCHAIN": "local",
               "SR_WEBHOOK_SECRET": SECRET, "STT_WEBHOOK_SECRET": SECRET}
        subprocess.run([C.GO_BIN, "mod", "tidy"], cwd=work, env=env,
                       capture_output=True, timeout=300)
        binary = os.path.join(work, "app.bin")
        b = subprocess.run([C.GO_BIN, "build", "-o", binary, "./app/"], cwd=work,
                           env=env, capture_output=True, text=True, timeout=300)
        if b.returncode != 0:
            results.append((page, "go", "FAIL", R.summarize(b.stderr or b.stdout)))
            continue

        proc = subprocess.Popen([binary], cwd=WORKSPACE, env=env,
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        try:
            if not wait_until_up(port, proc):
                out = proc.stdout.read()[:600] if proc.stdout else ""
                results.append((page, "go", "FAIL", f"server did not start: {out}"))
                continue

            probed, verified = 0, ""
            ok = True
            routes = []
            for m, route in GO_ROUTE.findall(program):
                # A mux entry with no method pattern accepts any verb. If the
                # page verifies signatures, the interesting verb is POST.
                routes.append((m or ("POST" if "verifySignature" in program else "GET"), route))
            for method, route in routes:
                concrete = re.sub(r"\{[^}]+\}", "probe", route)
                data, headers = None, {}
                if method == "POST":
                    data = json.dumps({"job_id": "abc", "status": "completed"}).encode()
                    headers = {"Content-Type": "application/json",
                               "X-SR-Signature": signed(data)}
                code, payload = request(port, method, concrete, data, headers)
                probed += 1
                if code == 0 or code >= 500:
                    results.append((page, "go", "FAIL",
                                    f"{method} {concrete} -> {code} {payload[:140]}"))
                    ok = False
                    break
                if method == "POST" and "verifySignature" in program:
                    bad, _ = request(port, "POST", concrete, data,
                                     {"Content-Type": "application/json",
                                      "X-SR-Signature": "sha256=" + "0" * 64})
                    if bad != 401:
                        results.append((page, "go", "FAIL",
                                        f"forged signature at {concrete} -> {bad}"))
                        ok = False
                        break
                    verified = ", forged signature rejected"
            if ok:
                results.append((page, "go", "OK",
                                f"booted; {probed} route(s) answered without a 5xx{verified}"))
        finally:
            proc.kill()
            shutil.rmtree(work, ignore_errors=True)


# ------------------------------------------------------------------------- aspnet

CS_ROUTE = re.compile(r'app\.Map(Get|Post)\("([^"]+)"')


def drive_aspnet(results: list) -> None:
    import check_snippets as C

    if not os.path.exists(C.DOTNET):
        results.append(("(all)", "aspnet", "SKIP", "dotnet not found"))
        return

    root = os.environ.get("DOTNET_ROOT", os.path.dirname(C.DOTNET))
    env = {**os.environ, "DOTNET_ROOT": root, "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
           "DOTNET_NOLOGO": "1", "PATH": root + os.pathsep + os.environ.get("PATH", ""),
           "SR_WEBHOOK_SECRET": SECRET, "STT_WEBHOOK_SECRET": SECRET}

    work = tempfile.mkdtemp(prefix="fw-cs-")
    proj = os.path.join(work, "web")
    subprocess.run([C.DOTNET, "new", "web", "-o", proj, "--no-restore"],
                   env=env, capture_output=True, timeout=300)
    subprocess.run([C.DOTNET, "add", proj, "reference", C.CS_SDK],
                   env=env, capture_output=True, timeout=300)
    ls = os.path.join(proj, "Properties", "launchSettings.json")
    if os.path.exists(ls):
        os.remove(ls)

    # `dotnet run --project` sets the content root to the project, ignoring cwd,
    # so a snippet opening meeting.mp3 has to find it there.
    for name in os.listdir(WORKSPACE):
        src_path = os.path.join(WORKSPACE, name)
        if os.path.isfile(src_path):
            shutil.copy(src_path, os.path.join(proj, name))

    try:
        for page in ("/cookbook", "/guides/live-progress", "/tutorials/meeting-app"):
            snips = [sn for sn in extract(os.path.join(REPO, "src", "app"))
                     if sn.page == page and sn.language == "csharp"]
            handlers = [sn for sn in snips
                        if R.skip_reason(sn.code) == "needs a running web framework"]
            if not handlers:
                results.append((page, "aspnet", "SKIP", "no aspnet handlers"))
                continue

            use = handlers if page == "/cookbook" else snips
            context = "\n\n".join(C.cs_toplevel_decls(sn.code) for sn in use
                                   if sn not in handlers)
            body = "\n\n".join(R.apply_subs(sn.code) for sn in handlers)
            program = R.real_key(C.cs_program(body, context, page))
            if "WebApplication" not in program.split("app.Map")[0]:
                program = program.replace(
                    "var app = WebApplication.Create();",
                    "var app = WebApplication.Create();")
            if "app.Run()" not in program:
                # Routes are registered above; the host has to actually run.
                program = re.sub(r"(\n(?:public |internal )?(?:record|class|sealed) )",
                                 r"\napp.Run();\1", program, count=1)
                if "app.Run();" not in program:
                    program += "\napp.Run();\n"
            io.open(os.path.join(proj, "Program.cs"), "w").write(program)

            port = free_port()
            runenv = {**env, "ASPNETCORE_URLS": f"http://127.0.0.1:{port}"}
            build = subprocess.run([C.DOTNET, "build", proj, "-v", "q", "--nologo"],
                                   env=env, capture_output=True, text=True, timeout=600)
            if build.returncode != 0:
                results.append((page, "aspnet", "FAIL",
                                R.summarize(build.stdout + build.stderr)))
                continue
            proc = subprocess.Popen(
                [C.DOTNET, "run", "--project", proj, "--no-build", "-v", "q", "--nologo"],
                cwd=WORKSPACE, env=runenv, stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT, text=True)
            try:
                if not wait_until_up(port, proc, seconds=60):
                    out = proc.stdout.read()[:600] if proc.stdout else ""
                    results.append((page, "aspnet", "FAIL", f"server did not start: {out}"))
                    continue

                probed, verified, ok = 0, "", True
                for method, route in CS_ROUTE.findall(program):
                    concrete = re.sub(r"\{[^}]+\}", "probe", route)
                    data, headers = None, {}
                    if method == "Post":
                        data = json.dumps({"job_id": "abc", "status": "completed",
                                           "jobId": "abc", "url": "https://x/a.mp3"}).encode()
                        headers = {"Content-Type": "application/json",
                                   "X-SR-Signature": signed(data)}
                    code, payload = request(port, method.upper(), concrete, data, headers)
                    probed += 1
                    if code == 0 or code >= 500:
                        results.append((page, "aspnet", "FAIL",
                                        f"{method.upper()} {concrete} -> {code} {payload[:140]}"))
                        ok = False
                        break
                    if method == "Post" and "VerifySignature" in program:
                        bad, _ = request(port, "POST", concrete, data,
                                         {"Content-Type": "application/json",
                                          "X-SR-Signature": "sha256=" + "0" * 64})
                        if bad != 401:
                            results.append((page, "aspnet", "FAIL",
                                            f"forged signature at {concrete} -> {bad}"))
                            ok = False
                            break
                        verified = ", forged signature rejected"
                if ok:
                    results.append((page, "aspnet", "OK",
                                    f"booted; {probed} route(s) answered without a 5xx{verified}"))
            finally:
                proc.kill()
    finally:
        shutil.rmtree(work, ignore_errors=True)


# ------------------------------------------------------------------------- django
#
# The Django page's blocks are already a project, one file each — models, views,
# webhooks, urls — so they are written out as those files, migrated and served,
# rather than concatenated. Anything less would not exercise the ORM writes the
# views and the receiver actually do.

DJANGO_SETTINGS = '''
SECRET_KEY = "framework-runner"
DEBUG = False
ALLOWED_HOSTS = ["*"]
ROOT_URLCONF = "project.urls"
INSTALLED_APPS = ["django.contrib.contenttypes", "django.contrib.auth", "transcripts"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": "db.sqlite3"}}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
USE_TZ = True
MIDDLEWARE = ["django.middleware.common.CommonMiddleware"]
TEMPLATES = []
STT_WEBHOOK_SECRET = "%s"
'''


def drive_django(results: list) -> None:
    page = "/integrations/django"
    blocks = {sn.index: R.apply_subs(sn.code)
              for sn in extract(os.path.join(REPO, "src", "app"))
              if sn.page == page and sn.language == "python"}
    if not blocks:
        results.append((page, "django", "SKIP", "no python snippets"))
        return

    root = tempfile.mkdtemp(prefix="fw-django-")
    app = os.path.join(root, "transcripts")
    project = os.path.join(root, "project")
    os.makedirs(app)
    os.makedirs(project)
    io.open(os.path.join(app, "__init__.py"), "w").write("")
    io.open(os.path.join(project, "__init__.py"), "w").write("")
    io.open(os.path.join(app, "models.py"), "w").write(blocks.get(1, ""))
    io.open(os.path.join(app, "views.py"), "w").write(blocks.get(2, ""))
    io.open(os.path.join(app, "webhooks.py"), "w").write(blocks.get(3, ""))
    io.open(os.path.join(project, "urls.py"), "w").write(blocks.get(4, ""))
    io.open(os.path.join(project, "settings.py"), "w").write(DJANGO_SETTINGS % SECRET)

    env = {**os.environ, "PYTHONPATH": os.pathsep.join([PY_SRC, root]),
           "DJANGO_SETTINGS_MODULE": "project.settings"}

    for args in (["makemigrations", "transcripts"], ["migrate"]):
        p = subprocess.run([sys.executable, "-m", "django", *args], cwd=root,
                           env=env, capture_output=True, text=True, timeout=300)
        if p.returncode != 0:
            results.append((page, "django", "FAIL",
                            R.summarize(p.stderr or p.stdout)))
            shutil.rmtree(root, ignore_errors=True)
            return

    port = free_port()
    proc = subprocess.Popen(
        [sys.executable, "-m", "django", "runserver", f"127.0.0.1:{port}", "--noreload"],
        cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        if not wait_until_up(port, proc):
            out = proc.stdout.read()[:600] if proc.stdout else ""
            results.append((page, "django", "FAIL", f"server did not start: {out}"))
            return

        body = json.dumps({"job_id": "abc", "status": "completed"}).encode()
        code, payload = request(port, "POST", "/webhooks/stt/", body,
                                {"Content-Type": "application/json",
                                 "X-SR-Signature": signed(body)})
        if code == 0 or code >= 500:
            results.append((page, "django", "FAIL",
                            f"signed webhook -> {code} {payload[:200]}"))
            return
        bad, _ = request(port, "POST", "/webhooks/stt/", body,
                         {"Content-Type": "application/json",
                          "X-SR-Signature": "sha256=" + "0" * 64})
        if bad != 401:
            results.append((page, "django", "FAIL", f"forged signature -> {bad}"))
            return

        code, payload = request(port, "GET", "/jobs/does-not-exist/progress/")
        if code == 0 or code >= 500:
            results.append((page, "django", "FAIL",
                            f"unknown job -> {code} {payload[:200]}"))
            return

        results.append((page, "django", "OK",
                        f"migrated and served; webhook {code and 'ok'}, "
                        f"forged rejected, unknown job -> {code}"))
    finally:
        proc.kill()
        shutil.rmtree(root, ignore_errors=True)


# ------------------------------------------------------------------------- nextjs
#
# The Next.js page names its files in the snippet filenames, and the ones that
# do not are identifiable by what they contain. They go where the App Router
# expects them, and the app is served by next dev — nothing else exercises a
# route handler's runtime, its "@/lib" alias, or a "use server" action.

NEXT_FILES = {
    ("ts", 3): "lib/stt.ts",
    ("ts", 1): "app/api/jobs/route.ts",
    ("ts", 2): "app/api/jobs/[id]/route.ts",
    ("ts", 4): "app/api/transcribe/route.ts",
    ("ts", 5): "app/actions.ts",
    ("ts", 6): "app/api/webhooks/stt/route.ts",
    ("tsx", 1): "app/upload.tsx",
}

NEXT_TSCONFIG = """{
  "compilerOptions": {
    "target": "esnext", "lib": ["dom", "esnext"], "allowJs": true,
    "skipLibCheck": true, "strict": false, "noEmit": true, "esModuleInterop": true,
    "module": "esnext", "moduleResolution": "bundler", "resolveJsonModule": true,
    "isolatedModules": true, "jsx": "preserve", "incremental": true,
    "paths": {"@/*": ["./*"]},
    "plugins": [{"name": "next"}]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"], "exclude": ["node_modules"]
}"""


def drive_nextjs(results: list) -> None:
    page = "/integrations/nextjs"
    blocks = {(sn.language, sn.index): R.apply_subs(sn.code)
              for sn in extract(os.path.join(REPO, "src", "app"))
              if sn.page == page and sn.language in ("ts", "tsx")}
    if not blocks:
        results.append((page, "nextjs", "SKIP", "no snippets"))
        return

    root = tempfile.mkdtemp(prefix="fw-next-")
    os.symlink(os.path.join(REPO, "node_modules"), os.path.join(root, "node_modules"))
    io.open(os.path.join(root, "package.json"), "w").write(
        '{"name":"fw-next","private":true,"type":"module"}')
    io.open(os.path.join(root, "tsconfig.json"), "w").write(NEXT_TSCONFIG)
    io.open(os.path.join(root, "next.config.mjs"), "w").write(
        "export default { eslint: { ignoreDuringBuilds: true } };\n")

    for key, rel in NEXT_FILES.items():
        if key not in blocks:
            continue
        dest = os.path.join(root, rel)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        code = blocks[key].replace('from "speechrevolutions"',
                                   f'from "{NODE_DIR}/dist/esm/index.js"')
        io.open(dest, "w").write(code)

    # The App Router needs a root layout to serve anything at all.
    io.open(os.path.join(root, "app", "layout.tsx"), "w").write(
        "export default function RootLayout({ children }: { children: React.ReactNode }) {\n"
        "  return (<html><body>{children}</body></html>);\n}\n")

    port = free_port()
    env = {**os.environ, "STT_WEBHOOK_SECRET": SECRET, "SR_WEBHOOK_SECRET": SECRET,
           "NEXT_TELEMETRY_DISABLED": "1"}
    proc = subprocess.Popen(
        [os.path.join(REPO, "node_modules", ".bin", "next"), "dev", "-p", str(port)],
        cwd=root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try:
        if not wait_until_up(port, proc, seconds=150):
            out = proc.stdout.read()[:700] if proc.stdout else ""
            results.append((page, "nextjs", "FAIL", f"next dev did not start: {out}"))
            return

        body = json.dumps({"job_id": "abc", "status": "completed"}).encode()
        code, payload = request(port, "POST", "/api/webhooks/stt", body,
                                {"Content-Type": "application/json",
                                 "X-SR-Signature": signed(body)}, timeout=120)
        if code == 0 or code >= 500:
            results.append((page, "nextjs", "FAIL",
                            f"signed webhook -> {code} {payload[:200]}"))
            return
        bad, _ = request(port, "POST", "/api/webhooks/stt", body,
                         {"Content-Type": "application/json",
                          "X-SR-Signature": "sha256=" + "0" * 64}, timeout=120)
        if bad != 401:
            results.append((page, "nextjs", "FAIL", f"forged signature -> {bad}"))
            return

        code, payload = request(port, "GET", "/api/jobs/does-not-exist", timeout=120)
        if code == 0 or code >= 500:
            results.append((page, "nextjs", "FAIL",
                            f"unknown job -> {code} {payload[:200]}"))
            return

        results.append((page, "nextjs", "OK",
                        f"next dev served the routes; webhook ok, forged rejected, "
                        f"unknown job -> {code}"))
    finally:
        proc.kill()
        shutil.rmtree(root, ignore_errors=True)


DRIVERS = {"fastapi": drive_fastapi, "fastapi-pages": drive_fastapi_other,
           "express": drive_express, "go": drive_go, "aspnet": drive_aspnet,
           "django": drive_django, "nextjs": drive_nextjs}


def main() -> int:
    wanted = set(sys.argv[1:]) or set(DRIVERS)
    results: list = []
    for name, fn in sorted(DRIVERS.items()):
        if name in wanted:
            print(f"driving {name} ...", flush=True)
            fn(results)

    print()
    bad = 0
    for page, fw, status, detail in results:
        print(f"{status:4s}  {page}  [{fw}]  {detail}")
        if status == "FAIL":
            bad += 1
    print(f"\n{len(results) - bad} ok, {bad} failed")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
