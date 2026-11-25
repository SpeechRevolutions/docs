"""Run every code sample the published landing site shows (landing origin/main) against PRODUCTION with the published
SDKs, through the docs sweep's language runners (docs/scripts/run_snippets.py). 2026-11-25.

Sources: src/lib/samples.ts (the five quickstart samples + INSTALL commands), src/content/use-cases.ts (code: per page),
src/content/posts.ts (fenced blocks). The TS template-literal escapes are undone the way the page renders them.
    python scripts/sweep/run_landing.py   (LANDING=<landing checkout>; samples are read from its origin/main)
"""
import os, re, subprocess, sys, pathlib

SWEEP = pathlib.Path(__file__).resolve().parents[3]  # sweep_pub: docs/ + the SDK worktrees
sys.path.insert(0, str(SWEEP / "docs" / "scripts"))
import run_snippets as R  # noqa: E402
from extract_snippets import Snippet  # noqa: E402

LANDING = pathlib.Path(os.environ.get("LANDING", "../landing"))
API_DOMAIN = "api.speechrevolutions.com"
LANG = {"python": "python", "js": "ts", "javascript": "ts", "bash": "bash", "go": "go", "csharp": "csharp"}


def show(path: str) -> str:
    return subprocess.run(["git", "-C", str(LANDING), "show", f"origin/main:{path}"], capture_output=True,
                          text=True, check=True).stdout


def rendered(lit: str) -> str:
    """A TS template literal's text as the page renders it."""
    lit = lit.replace("${SITE.apiDomain}", API_DOMAIN)
    return lit.replace("\\`", "`").replace("\\${", "${").replace("\\\\", "\\")


def snippets() -> list[Snippet]:
    out, n = [], {}

    def add(page, lang, code, label=""):
        n[(page, lang)] = n.get((page, lang), 0) + 1
        out.append(Snippet(page=page, source=page, kind="block", label=label, language=lang, filename="",
                           index=n[(page, lang)], code=code))

    s = show("src/lib/samples.ts")
    for m in re.finditer(r'export const (\w+): CodeSample = \{\s*label: "([^"]+)",\s*language: "(\w+)",\s*code: `(.*?)`,\s*\};',
                         s, re.S):
        add("/ (quickstart samples.ts)", LANG[m.group(3)], rendered(m.group(4)), m.group(2))
    for m in re.finditer(r'\{ label: "([^"]+)", command: "([^"]+)" \}', s):
        add("/ (INSTALL samples.ts)", "bash", m.group(2), m.group(1))
    u = show("src/content/use-cases.ts")
    for m in re.finditer(r'slug: "([\w-]+)".*?code: `(.*?)`,', u, re.S):
        add(f"/use-cases/{m.group(1)}", "python", rendered(m.group(2)))
    p = show("src/content/posts.ts")
    for m in re.finditer(r'slug: "([\w-]+)"(.*?)(?=slug: "|\Z)', p, re.S):
        for f in re.finditer(r"\\`\\`\\`(\w+)\n(.*?)\\`\\`\\`", m.group(2), re.S):
            if f.group(1) in LANG:
                add(f"/blog/{m.group(1)}", LANG[f.group(1)], rendered(f.group(2)))
    return out


def main() -> int:
    ws = pathlib.Path(R.WORKSPACE)
    for name in ("episode-142.mp3", "call-8841.wav", "standup-2026-10-21.m4a"):  # the use-case pages' files
        src = ws / ("meeting.wav" if name.endswith(".wav") else "meeting.mp3")
        if not (ws / name).exists():
            if name.endswith(".m4a"):
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(src), "-c:a", "aac", str(ws / name)], check=True)
            else:
                (ws / name).write_bytes(src.read_bytes())
    for name in ("participant-07.mp4", "launch-video.mp4"):
        if not (ws / name).exists():
            (ws / name).write_bytes((ws / "talk.mp4").read_bytes())
    sn = snippets()
    by: dict[str, list[Snippet]] = {}
    for s in sn:
        by.setdefault(s.language, []).append(s)
    print(f"{len(sn)} landing samples: " + ", ".join(f"{k} {len(v)}" for k, v in sorted(by.items())), flush=True)
    res = R.Result()
    for lang, group in sorted(by.items()):
        R.RUNNERS[lang](group, res)
    for s in res.ok:
        print(f"OK    {s.page}  [{s.language} #{s.index} {s.label}]")
    for s, why in res.failed:
        print(f"FAIL  {s.page}  [{s.language} #{s.index} {s.label}]")
        for line in why.splitlines()[-8:]:
            print(f"        {line}")
    for s, why in res.skipped:
        print(f"SKIP  {s.page}  [{s.language} #{s.index}]  {why}")
    print(f"landing: {len(res.ok)} ran, {len(res.failed)} failed, {len(res.skipped)} skipped")
    return 1 if res.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
