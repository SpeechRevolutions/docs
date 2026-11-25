"""Run the published SDKs' README code blocks and examples/ against PRODUCTION (2026-11-24).

README blocks go through the docs sweep's own language runners (docs/scripts/run_snippets.py: the same preludes,
placeholder substitutions, fixtures and toolchains), with the SDKs at v1.0.0 beside it in ~/SpeechRevolutions/sweep_pub.
examples/ are whole programs, run as published with their fixtures in the working directory.
    python sdk_readme_run.py [readme] [examples]
"""
import os, pathlib, re, shutil, subprocess, sys, tempfile

SWEEP = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(SWEEP / "docs" / "scripts"))
import run_snippets as R  # noqa: E402
from extract_snippets import Snippet  # noqa: E402

LANG = {"python": "python", "py": "python", "js": "ts", "javascript": "ts", "ts": "ts", "typescript": "ts",
        "go": "go", "csharp": "csharp", "cs": "csharp", "c#": "csharp", "bash": "bash", "sh": "bash", "shell": "bash"}
SDKS = ("python-sdk", "node-sdk", "speechrevolutions-go", "csharp-sdk")
FENCE = re.compile(r"^```([\w#+-]*)[^\n]*\n(.*?)^```", re.S | re.M)


def readme_snippets() -> list[Snippet]:
    out = []
    for sdk in SDKS:
        text = (SWEEP / sdk / "README.md").read_text()
        count: dict[str, int] = {}
        for m in FENCE.finditer(text):
            lang = LANG.get(m.group(1).lower())
            if not lang:
                continue
            count[lang] = count.get(lang, 0) + 1
            out.append(Snippet(page=f"/README/{sdk}", source=f"{sdk}/README.md", kind="block", label="",
                               language=lang, filename="", index=count[lang], code=m.group(2)))
    return out


def run_readmes() -> int:
    os.makedirs(R.WORKSPACE, exist_ok=True)
    by: dict[str, list[Snippet]] = {}
    for s in readme_snippets():
        by.setdefault(s.language, []).append(s)
    res = R.Result()
    for lang, group in sorted(by.items()):
        print(f"running {len(group):3d} {lang} README blocks ...", flush=True)
        R.RUNNERS[lang](group, res)
    for s, why in res.failed:
        print(f"FAIL  {s.page}  [{s.language} #{s.index}]")
        for line in why.splitlines()[-8:]:
            print(f"        {line}")
    for s, why in res.skipped:
        print(f"SKIP  {s.page}  [{s.language} #{s.index}]  {why}")
    print(f"README: {len(res.ok)} ran, {len(res.failed)} failed, {len(res.skipped)} skipped", flush=True)
    return len(res.failed)


def example_cmds() -> list[tuple[str, list[str], pathlib.Path]]:
    cmds = []
    for f in sorted((SWEEP / "python-sdk" / "examples").glob("*.py")):
        cmds.append((f"python-sdk/examples/{f.name}", [sys.executable, str(f)], f))
    for f in sorted((SWEEP / "node-sdk" / "examples").glob("*.*js")):
        cmds.append((f"node-sdk/examples/{f.name}", ["node", str(f)], f))
    go = SWEEP / "speechrevolutions-go" / "examples"  # one module (its own go.mod), three programs
    for pkg in (".", "./progress", "./retrieve"):
        cmds.append((f"speechrevolutions-go/examples/{pkg}", ["go", "run", pkg], go))
    return cmds


def run_examples() -> int:
    bad = 0
    env = {**os.environ, "PYTHONPATH": str(SWEEP / "python-sdk" / "src")}
    for name, cmd, path in example_cmds():
        work = pathlib.Path(tempfile.mkdtemp(prefix="sdkex-"))
        for f in pathlib.Path(R.WORKSPACE).iterdir():
            if f.is_file():
                shutil.copy(f, work / f.name)
        cwd = path if path.is_dir() else work
        placed = []
        if path.is_dir():  # a module dir (Go): the program opens its audio relative to it
            for f in pathlib.Path(R.WORKSPACE).iterdir():
                if f.is_file() and not (path / f.name).exists():
                    shutil.copy(f, path / f.name); placed.append(path / f.name)
        if cmd[0].endswith("go"):
            cmd = [os.path.expanduser("~/.local/go/bin/go")] + cmd[1:]
            e = {**env, "GOFLAGS": "-mod=mod", "GOTOOLCHAIN": "local"}
        else:
            e = env
        try:
            p = subprocess.run(cmd, cwd=cwd, env=e, capture_output=True, text=True, timeout=300)
            good = p.returncode == 0
            tail = (p.stdout + p.stderr).strip()[-500:]
        except subprocess.TimeoutExpired:
            good, tail = False, "timeout"
        bad += not good
        print(f"{'OK  ' if good else 'FAIL'}  {name}")
        if not good:
            print("        " + tail.replace("\n", "\n        "))
        shutil.rmtree(work, ignore_errors=True)
        for f in placed:
            f.unlink(missing_ok=True)
    print(f"examples: {bad} failed of {len(example_cmds())}", flush=True)
    return bad


if __name__ == "__main__":
    want = set(sys.argv[1:]) or {"readme", "examples"}
    n = (run_readmes() if "readme" in want else 0) + (run_examples() if "examples" in want else 0)
    raise SystemExit(1 if n else 0)
