"""Run every cookbook recipe's published usage line against PRODUCTION with the published SDK (2026-11-24).

The cookbook's own tests drive the recipes against the python-sdk mock API; this runs them for real. Each usage line is
taken verbatim from the recipe's docstring; only stand-in names are made real: the audio files they name (a 60-s AMI
meeting excerpt), example.com URLs (the hosted docs sample), and the S3 bucket (a private scratch bucket).
    python cookbook_live.py      (SPEECHREVOLUTIONS_API_KEY, AWS creds in env; SR_BUCKET = scratch bucket)
"""
import os, pathlib, re, shutil, subprocess, sys, tempfile

COOK = pathlib.Path("/home/ameen/SpeechRevolutions/cookbook")
FIX = pathlib.Path("/home/ameen/SpeechRevolutions/sweep_pub/snipfix")
PY = sys.executable
SAMPLE_URL = "https://docs.speechrevolutions.com/samples/diamond-necklace.mp3"
BUCKET = os.environ["SR_BUCKET"]
SERVERS = {"live_progress_webapp.py", "webhook_receiver_fastapi.py"}  # covered by tests/ against the mock


def usage_lines(path: pathlib.Path) -> list[str]:
    doc = path.read_text().split('"""')[1] if '"""' in path.read_text() else ""
    return [l.strip() for l in doc.splitlines() if l.strip().startswith("python ")]


def run(recipe: pathlib.Path, line: str, work: pathlib.Path) -> tuple[bool, str]:
    cmd = line.replace("https://example.com/episode-42.mp3", SAMPLE_URL).replace("my-bucket", BUCKET)
    cmd = cmd.replace("recordings/meeting.mp3", "meeting.mp3")
    cmd = re.sub(r"^python \S+", f"{PY} {recipe}", cmd)
    p = subprocess.run(cmd, shell=True, cwd=work, capture_output=True, text=True, timeout=900)
    out = (p.stdout + p.stderr).strip()
    return p.returncode == 0, out[-400:]


def main() -> int:
    ok = bad = 0
    for recipe in sorted(COOK.glob("*/*.py")):
        if recipe.parent.name == "tests" or recipe.name in SERVERS:
            continue
        for line in usage_lines(recipe):
            work = pathlib.Path(tempfile.mkdtemp(prefix="cooklive-"))
            for f in FIX.iterdir():
                if f.is_file():
                    shutil.copy(f, work / f.name)
            for n in ("panel.mp3",):
                shutil.copy(FIX / "meeting.mp3", work / n)
            shutil.copy(FIX / "talk.mp4", work / "movie.mp4")
            (work / "glossary.txt").write_text("Remote control\nproject manager\nkick-off\n")
            (work / "audio").mkdir(exist_ok=True)
            for n in ("standup.mp3", "interview.mp3"):
                shutil.copy(FIX / "meeting.mp3", work / "audio" / n)
            good, tail = run(recipe, line, work)
            ok += good; bad += not good
            print(f"{'OK  ' if good else 'FAIL'}  {recipe.parent.name}/{recipe.name}: {line}")
            if not good:
                print("      " + tail.replace("\n", "\n      "))
            shutil.rmtree(work, ignore_errors=True)
    print(f"{ok} ok, {bad} failed")
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
