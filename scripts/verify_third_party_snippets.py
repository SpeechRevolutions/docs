#!/usr/bin/env python3
"""Check the third-party snippets against the libraries they actually import.

Five migration pages show what a customer's code looked like on Deepgram,
AssemblyAI, OpenAI, ElevenLabs or faster-whisper, and the Supabase integration
page talks to Supabase. None can be executed here: they need a paid account with
that provider, or a Supabase project. run_snippets skips them for that reason.

Skipping is not the same as knowing they are right, and the realistic way these
rot is not our doing — a provider renames an export or moves a method, and our
"before" example quietly stops matching the library the reader has installed.
That is checkable without an account, so it is checked here:

  * every imported name still exists in the module it is imported from
  * every attribute chain used on a module (aai.Transcriber) still resolves
  * every attribute chain used on a client (client.audio.transcriptions.create)
    resolves, constructing the client with a dummy key where the library allows
    it offline

What this does NOT verify is behaviour: that the call returns what the snippet
prints. That needs the provider. The gap is stated rather than papered over.

Usage:
    python3 scripts/verify_third_party_snippets.py
"""

from __future__ import annotations

import ast
import importlib
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract_snippets import extract  # noqa: E402
import run_snippets as R  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

THIRD_PARTY_REASONS = {
    "needs a paid third-party account (competitor 'before' example)",
    "needs a Supabase project",
}

# Dummy credentials so a client constructs offline. None of these are used for a
# request; construction is all that is needed to walk its attributes.
DUMMY_ENV = {
    "OPENAI_API_KEY": "sk-dummy",
    "DEEPGRAM_API_KEY": "dummy",
    "ELEVENLABS_API_KEY": "dummy",
    "ASSEMBLYAI_API_KEY": "dummy",
}

# Constructing these would download model weights or need a GPU, so the class is
# checked and the instance chain is reported as unresolved instead.
DO_NOT_CONSTRUCT = {"WhisperModel", "create_client", "SpeechRevolutions"}

# faster-whisper pulls in torch and ctranslate2 — hundreds of megabytes for one
# snippet — so it is reported as unverified rather than silently installed.
OPTIONAL_MODULES = {"faster_whisper"}

# A migration "before" block depicts the SDK the reader is leaving, not the
# newest one, so checking it against whatever happens to be installed is the
# wrong question. These are verified in a throwaway venv pinned to the major the
# snippet targets. Bump the pin when the page is rewritten for a newer major.
PINNED = {"deepgram": "deepgram-sdk>=3,<4"}
VENV_ROOT = os.path.join(tempfile.gettempdir(), "sr-thirdparty-venvs")


def pinned_python(module: str, spec: str) -> str | None:
    """Path to a python with `spec` installed, created once and reused."""
    venv = os.path.join(VENV_ROOT, module)
    py = os.path.join(venv, "bin", "python")
    if os.path.exists(py):
        return py
    os.makedirs(VENV_ROOT, exist_ok=True)
    if subprocess.run([sys.executable, "-m", "venv", venv],
                      capture_output=True, timeout=300).returncode != 0:
        return None
    pip = os.path.join(venv, "bin", "pip")
    if subprocess.run([pip, "install", "-q", spec],
                      capture_output=True, timeout=900).returncode != 0:
        return None
    return py


def check_pinned(code: str, module: str, spec: str) -> tuple[str, str]:
    py = pinned_python(module, spec)
    if py is None:
        return "SKIP", f"could not build a venv pinned to {spec}"
    script = (
        "import sys, warnings, json\n"
        "warnings.simplefilter('ignore')\n"
        "sys.path.insert(0, %r)\n"
        "import verify_third_party_snippets as V\n"
        "res = []\n"
        "V.check(%r, 'pinned', res)\n"
        "print(json.dumps(res[0][1:]))\n"
    ) % (os.path.dirname(os.path.abspath(__file__)), code)
    p = subprocess.run([py, "-c", script], capture_output=True, text=True, timeout=300)
    if p.returncode != 0:
        return "FAIL", (p.stderr.strip().splitlines() or ["pinned check failed"])[-1]
    status, detail = json.loads(p.stdout.strip().splitlines()[-1])
    return status, f"{detail} (against {spec})"


def chains(tree: ast.AST) -> dict[str, list[list[str]]]:
    """Attribute chains used, grouped by the root name they start from."""
    found: dict[str, list[list[str]]] = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Attribute):
            continue
        parts: list[str] = []
        cur: ast.AST = node
        while isinstance(cur, ast.Attribute):
            parts.append(cur.attr)
            cur = cur.value
        if isinstance(cur, ast.Name):
            found.setdefault(cur.id, []).append(list(reversed(parts)))
    # Keep only the longest chain per root, which subsumes its prefixes.
    return {root: sorted(cs, key=len, reverse=True)[:1] for root, cs in found.items()}


def resolve(obj, parts: list[str]) -> str | None:
    cur = obj
    walked: list[str] = []
    for part in parts:
        walked.append(part)
        if not hasattr(cur, part):
            return ".".join(walked)
        cur = getattr(cur, part)
    return None


def check(code: str, page: str, results: list) -> None:
    tree = ast.parse(code)

    modules: dict[str, object] = {}     # local alias -> module
    classes: dict[str, object] = {}     # local name  -> class/callable
    problems: list[str] = []
    unresolved: list[str] = []
    unverified: list[str] = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                if alias.name.split(".")[0] in ("os", "json", "time", "speechrevolutions"):
                    continue
                try:
                    modules[alias.asname or alias.name] = importlib.import_module(alias.name)
                except ImportError:
                    if alias.name in OPTIONAL_MODULES:
                        unverified.append(alias.name)
                    else:
                        problems.append(f"import {alias.name}: not installed")
                except Exception as e:
                    problems.append(f"import {alias.name}: {type(e).__name__}: {e}")
        elif isinstance(node, ast.ImportFrom):
            if not node.module or node.module.split(".")[0] in (
                    "os", "json", "time", "speechrevolutions", "pathlib"):
                continue
            try:
                mod = importlib.import_module(node.module)
            except ImportError:
                if node.module.split(".")[0] in OPTIONAL_MODULES:
                    unverified.append(node.module)
                    continue
                problems.append(f"import {node.module}: not installed")
                continue
            except Exception as e:
                problems.append(f"import {node.module}: {type(e).__name__}: {e}")
                continue
            for alias in node.names:
                if not hasattr(mod, alias.name):
                    problems.append(f"{node.module} has no {alias.name!r}")
                else:
                    classes[alias.asname or alias.name] = getattr(mod, alias.name)

    # var = ClassName(...)  ->  remember what the variable holds
    instances: dict[str, object] = {}
    for node in tree.body:
        if not isinstance(node, ast.Assign) or not isinstance(node.value, ast.Call):
            continue
        fn = node.value.func
        name = fn.id if isinstance(fn, ast.Name) else None
        if not name or name not in classes or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name):
            continue
        if name in DO_NOT_CONSTRUCT:
            unresolved.append(f"{target.id} ({name}, not constructed here)")
            continue
        try:
            instances[target.id] = classes[name]()
        except Exception as e:
            unresolved.append(f"{target.id} ({name} would not construct: {type(e).__name__})")

    for root, cs in chains(tree).items():
        base = modules.get(root) or instances.get(root) or classes.get(root)
        if base is None:
            continue
        for parts in cs:
            missing = resolve(base, parts)
            if missing:
                problems.append(f"{root}.{missing} does not exist")

    if unverified:
        results.append((page, "SKIP",
                        f"{', '.join(unverified)} not installed (heavy local-model dependency)"))
    elif problems:
        results.append((page, "FAIL", "; ".join(problems[:4])))
    else:
        note = f" ({len(unresolved)} chain(s) not resolvable offline)" if unresolved else ""
        results.append((page, "OK", f"imports and attribute chains resolve{note}"))


def main() -> int:
    env_backup = {k: os.environ.get(k) for k in DUMMY_ENV}
    os.environ.update(DUMMY_ENV)
    try:
        results: list = []
        for s in extract(os.path.join(REPO, "src", "app")):
            if s.language != "python":
                continue
            if R.skip_reason(s.code) not in THIRD_PARTY_REASONS:
                continue
            page = f"{s.page} #{s.index}"
            pin = next((m for m in PINNED if f"import {m}" in s.code
                        or f"from {m} " in s.code), None)
            try:
                if pin:
                    status, detail = check_pinned(s.code, pin, PINNED[pin])
                    results.append((page, status, detail))
                else:
                    check(s.code, page, results)
            except SyntaxError as e:
                results.append((page, "FAIL", f"does not parse: {e}"))

        bad = 0
        for page, status, detail in results:
            print(f"{status:4s}  {page:34s} {detail}")
            if status == "FAIL":
                bad += 1
        print(f"\n{len(results) - bad} ok, {bad} failed")
        return 1 if bad else 0
    finally:
        for k, v in env_backup.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


if __name__ == "__main__":
    raise SystemExit(main())
