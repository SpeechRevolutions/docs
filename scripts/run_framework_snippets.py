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


DRIVERS = {"fastapi": drive_fastapi, "fastapi-pages": drive_fastapi_other}


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
