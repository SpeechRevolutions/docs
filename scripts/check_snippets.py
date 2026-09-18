#!/usr/bin/env python3
"""Compile every code snippet the docs publish.

Docs rot silently. A snippet that no longer compiles keeps rendering perfectly,
and the first person to find out is a customer pasting it into their editor. So
every Go and C# snippet on the site is compiled against the real local SDK, and
every Python and TypeScript snippet is parsed, on demand and in CI.

What each language gets, and why they differ:

  go, csharp  Full compile against a project reference to the local SDK. A
              wrong method name, a wrong arity, a wrong type — all caught.
  python, ts  Parse only. Most snippets are fragments that assume a `client`
              from an earlier block, so the names genuinely do not resolve in
              isolation; requiring them to would mean rewriting every snippet
              into a standalone program and making the docs worse to read.
              Syntax is still pinned, which is what typo-level rot looks like.

Most snippets are fragments, so they are wrapped in the smallest program that
makes them valid: Go gets a main() with a client, a ctx, exactly the imports
the fragment references, and a blank assignment per declared variable (Go
rejects unused variables); C# gets top-level statements with a client, its own
using-directives hoisted above them.

Usage:
    python3 scripts/check_snippets.py            # everything
    python3 scripts/check_snippets.py go csharp  # just those languages
"""

from __future__ import annotations

import ast
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
GO_SDK = os.path.join(SIBLING, "go-sdk")
CS_SDK = os.path.join(SIBLING, "csharp-sdk", "SpeechRevolutions", "SpeechRevolutions.csproj")

GO_BIN = shutil.which("go") or os.path.expanduser("~/.local/go/bin/go")
DOTNET = shutil.which("dotnet") or os.path.expanduser("~/.local/dotnet/dotnet")
TSC = os.path.join(REPO, "node_modules", ".bin", "tsc")

# package path -> the qualifier that proves a fragment needs it
GO_IMPORTS = {
    "context": "context.", "fmt": "fmt.", "log": "log.", "time": "time.",
    "errors": "errors.", "os": "os.", "io": "io.", "strings": "strings.",
    "sort": "sort.", "sync": "sync.", "bytes": "bytes.", "bufio": "bufio.",
    "net/http": "http.", "net/url": "url.", "path/filepath": "filepath.",
    "encoding/json": "json.", "encoding/hex": "hex.", "encoding/base64": "base64.",
    "crypto/hmac": "hmac.", "crypto/sha256": "sha256.", "crypto/subtle": "subtle.",
    "mime/multipart": "multipart.", "strconv": "strconv.", "math": "math.",
}

# Names an SDK reference page establishes in one block and keeps using in the
# next. A page is a narrative, and forcing every block to re-transcribe a file
# just to satisfy the compiler would make it worse to read. So the wrapper
# supplies them, exactly as the prose already promised the reader they exist.
GO_PAGE_SCOPE = {
    "result": 'result, rerr := client.Transcribe(ctx, "a.mp3", stt.TranscribeOptions{}, nil)\n'
              "if rerr != nil {\n\tlog.Fatal(rerr)\n}\n_ = result\n",
    "jobID": 'jobID := "00000000-0000-0000-0000-000000000000"\n_ = jobID\n',
    "status": "",   # defined alongside jobID usage in practice
}

CS_PAGE_SCOPE = {
    "result": 'var result = await client.TranscribeAsync("a.mp3");\n',
    "jobId": 'var jobId = "00000000-0000-0000-0000-000000000000";\n',
}

DECLARED = re.compile(r"^([a-zA-Z_][\w]*(?:\s*,\s*[a-zA-Z_][\w]*)*)\s*:=", re.M)
USING_DIRECTIVE = re.compile(r"^\s*using\s+(?:static\s+)?[A-Za-z_][\w.]*\s*;\s*$")


def go_toplevel_decls(code: str) -> str:
    """The type/func/const/var declarations a Go snippet contributes to its page.

    A guide builds a type in one block and wires it up in the next, exactly as
    the Python and JavaScript versions of the same guide do. To compile the
    second block you need the first one's declarations — but not its main(),
    which would collide with the wrapper's.
    """
    out, lines, i = [], code.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        if re.match(r"^(type|func|const|var)\b", line) and not line.startswith("func main("):
            block = [line]
            if line.rstrip().endswith(("{", "(")):
                depth = line.count("{") + line.count("(") - line.count("}") - line.count(")")
                i += 1
                while i < len(lines) and depth > 0:
                    block.append(lines[i])
                    depth += (lines[i].count("{") + lines[i].count("(")
                              - lines[i].count("}") - lines[i].count(")"))
                    i += 1
            else:
                i += 1
            out.append("\n".join(block))
            continue
        if line.startswith("func main("):  # skip its whole body
            depth = line.count("{")
            i += 1
            while i < len(lines) and depth > 0:
                depth += lines[i].count("{") - lines[i].count("}")
                i += 1
            continue
        i += 1
    return "\n\n".join(out)


def cs_toplevel_decls(code: str) -> str:
    """Class/record declarations a C# snippet contributes to its page."""
    out, lines, i = [], code.splitlines(), 0
    while i < len(lines):
        line = lines[i]
        if re.match(r"^(public|internal|sealed|static|abstract|record|class)\b.*"
                    r"\b(class|record|struct|interface|enum)\b", line) or \
           re.match(r"^public record \w+\(", line):
            if line.rstrip().endswith(";"):      # positional record, one line
                out.append(line)
                i += 1
                continue
            block, depth, started = [line], 0, False
            while i < len(lines):
                depth += lines[i].count("{") - lines[i].count("}")
                if "{" in lines[i]:
                    started = True
                if block[-1] is not lines[i]:
                    block.append(lines[i])
                i += 1
                if started and depth == 0:
                    break
            out.append("\n".join(block))
            continue
        i += 1
    return "\n\n".join(out)


class Result:
    def __init__(self):
        self.ok: list[Snippet] = []
        self.failed: list[tuple[Snippet, str]] = []
        self.skipped: list[tuple[Snippet, str]] = []


# --------------------------------------------------------------------------- go

def go_program(code: str, context: str = "") -> str:
    if re.match(r"^\s*package\s+\w+", code):
        return code

    scan = context + "\n" + code
    needed = [p for p, q in GO_IMPORTS.items()
              if re.search(r"(?<![\w.])" + re.escape(q), scan)]
    body = "\n".join("\t" + line if line.strip() else "" for line in code.splitlines())

    # Go rejects unused variables; blank-assign everything the fragment declares
    # at top level (anything nested is already out of scope by the closing brace).
    names: set[str] = set()
    for group in DECLARED.findall(code):
        for n in group.split(","):
            n = n.strip()
            if n and n != "_":
                names.add(n)
    owns_client = bool(re.search(r"^\s*client\s*(?:,\s*\w+\s*)?:?=", code, re.M))

    for forced in ("context",) if owns_client else ("context", "log"):
        if forced not in needed:
            needed.append(forced)
    needed.sort()
    imports = "\n".join(f'\t"{p}"' for p in needed)
    scope = ""
    for name, decl in (GO_PAGE_SCOPE.items() if not owns_client else []):
        if not decl or name in names:
            continue
        if re.search(r"(?<![\w.])" + name + r"(?![\w])", code):
            scope += "".join("\t" + l + "\n" for l in decl.splitlines())
    prelude = "\tctx := context.Background()\n\t_ = ctx\n"
    if not owns_client:
        prelude += (
            '\tclient, err := stt.NewClient("k")\n'
            "\tif err != nil {\n\t\tlog.Fatal(err)\n\t}\n"
            "\t_ = client\n\t_ = err\n"
        )
        names.discard("client")
        names.discard("err")
    drains = "".join(f"\t_ = {n}\n" for n in sorted(names))

    return (
        "package main\n\n"
        "import (\n" + imports + "\n\n"
        '\tstt "github.com/speechrevolutions/go-sdk"\n'
        ")\n\n"
        "func main() {\n"
        + prelude + scope + body + "\n" + drains +
        "}\n"
        + ("\n" + context + "\n" if context else "")
    )


def check_go(snips: list[Snippet], res: Result) -> None:
    if not os.path.exists(GO_BIN):
        for s in snips:
            res.skipped.append((s, "go toolchain not found"))
        return

    work = tempfile.mkdtemp(prefix="docsnip-go-")
    io.open(os.path.join(work, "go.mod"), "w").write(
        "module docsnippets\n\ngo 1.22\n\n"
        "require github.com/speechrevolutions/go-sdk v0.0.0\n\n"
        f"replace github.com/speechrevolutions/go-sdk => {GO_SDK}\n"
    )
    dirs = {}
    seen: dict[str, list[str]] = {}
    for i, s in enumerate(snips):
        d = os.path.join(work, f"s{i}")
        os.makedirs(d)
        context = "\n\n".join(seen.get(s.page, []))
        io.open(os.path.join(d, "main.go"), "w").write(go_program(s.code, context))
        decls = go_toplevel_decls(s.code)
        if decls:
            seen.setdefault(s.page, []).append(decls)
        dirs[f"s{i}"] = s

    env = {**os.environ, "GOFLAGS": "-mod=mod", "GOTOOLCHAIN": "local"}
    subprocess.run([GO_BIN, "mod", "tidy"], cwd=work, env=env,
                   capture_output=True, timeout=180)

    for name, s in dirs.items():
        p = subprocess.run([GO_BIN, "vet", f"./{name}/"], cwd=work, env=env,
                           capture_output=True, text=True, timeout=180)
        if p.returncode == 0:
            res.ok.append(s)
        else:
            res.failed.append((s, (p.stderr or p.stdout).strip()))
    shutil.rmtree(work, ignore_errors=True)


# ------------------------------------------------------------------------ csharp

def cs_program(code: str, context: str = "") -> str:
    lines = code.splitlines()
    head, rest = [], []
    for i, line in enumerate(lines):
        if USING_DIRECTIVE.match(line):
            head.append(line.strip())
        elif line.strip() == "":
            (head if not rest else rest).append(line)
        else:
            rest = lines[i:]
            break
    else:
        rest = []

    body = "\n".join(rest)
    for u in ("using SpeechRevolutions;", "using System.Net;", "using System.Text;"):
        if u not in head:
            head.append(u)

    prelude = ""
    if "new SttClient" not in body:
        prelude = 'using var client = new SttClient("k");\n'
    for name, decl in (CS_PAGE_SCOPE.items() if prelude else []):
        used = re.search(r"(?<![\w.])" + name + r"(?![\w])", body)
        declared = re.search(r"(?:var|string|int)\s+" + name + r"\b", body)
        if used and not declared:
            prelude += decl
    if re.search(r"(?<![\w.])app\.Map", body) and "WebApplication" not in body:
        prelude += "var app = WebApplication.Create();\n"
    tail = ("\n\n" + context) if context else ""
    return "\n".join(head) + "\n\n" + prelude + body + "\n" + tail


def check_csharp(snips: list[Snippet], res: Result) -> None:
    if not os.path.exists(DOTNET):
        for s in snips:
            res.skipped.append((s, "dotnet not found"))
        return

    root = os.environ.get("DOTNET_ROOT", os.path.dirname(DOTNET))
    env = {**os.environ, "DOTNET_ROOT": root, "DOTNET_CLI_TELEMETRY_OPTOUT": "1",
           "DOTNET_NOLOGO": "1", "PATH": root + os.pathsep + os.environ.get("PATH", "")}

    work = tempfile.mkdtemp(prefix="docsnip-cs-")
    projects = {}
    for kind, template in (("console", "console"), ("web", "web")):
        d = os.path.join(work, kind)
        subprocess.run([DOTNET, "new", template, "-o", d, "--no-restore"],
                       env=env, capture_output=True, timeout=300)
        subprocess.run([DOTNET, "add", d, "reference", CS_SDK],
                       env=env, capture_output=True, timeout=300)
        ls = os.path.join(d, "Properties", "launchSettings.json")
        if os.path.exists(ls):
            os.remove(ls)
        projects[kind] = d

    seen: dict[str, list[str]] = {}
    for s in snips:
        kind = ("web" if "WebApplication" in s.code or re.search(r"(?<![\w.])app\.Map", s.code)
                else "console")
        d = projects[kind]
        context = "\n\n".join(seen.get(s.page, []))
        io.open(os.path.join(d, "Program.cs"), "w").write(cs_program(s.code, context))
        decls = cs_toplevel_decls(s.code)
        if decls:
            seen.setdefault(s.page, []).append(decls)
        p = subprocess.run([DOTNET, "build", d, "-v", "q", "--nologo"],
                           env=env, capture_output=True, text=True, timeout=600)
        if p.returncode == 0:
            res.ok.append(s)
        else:
            errs = [l for l in (p.stdout + p.stderr).splitlines() if ": error " in l]
            res.failed.append((s, "\n".join(errs[:6]) or p.stdout.strip()[-600:]))
    shutil.rmtree(work, ignore_errors=True)


# ------------------------------------------------------------------------ python

def check_python(snips: list[Snippet], res: Result) -> None:
    for s in snips:
        try:
            ast.parse(s.code)
            res.ok.append(s)
        except SyntaxError as e:
            res.failed.append((s, f"line {e.lineno}: {e.msg}"))


# ---------------------------------------------------------------------------- ts

def check_ts(snips: list[Snippet], res: Result) -> None:
    if not os.path.exists(TSC):
        for s in snips:
            res.skipped.append((s, "tsc not found (npm install)"))
        return

    work = tempfile.mkdtemp(prefix="docsnip-ts-")
    names = {}
    for i, s in enumerate(snips):
        ext = ".tsx" if s.language == "tsx" else ".ts"
        f = f"s{i}{ext}"
        # @ts-nocheck keeps the parse but drops resolution: fragments reference a
        # `client` that, by design, is defined in an earlier block on the page.
        io.open(os.path.join(work, f), "w").write("// @ts-nocheck\n" + s.code + "\n")
        names[f"s{i}"] = s

    p = subprocess.run(
        [TSC, "--noEmit", "--skipLibCheck", "--allowJs", "--jsx", "react-jsx",
         "--target", "esnext", "--module", "esnext", "--moduleResolution", "bundler",
         *[f for f in sorted(os.listdir(work))]],
        cwd=work, capture_output=True, text=True, timeout=600)

    bad: dict[str, list[str]] = {}
    for line in (p.stdout + p.stderr).splitlines():
        m = re.match(r"(s\d+)\.tsx?\(", line)
        if m:
            bad.setdefault(m.group(1), []).append(line.strip())

    for key, s in names.items():
        if key in bad:
            res.failed.append((s, "\n".join(bad[key][:4])))
        else:
            res.ok.append(s)
    shutil.rmtree(work, ignore_errors=True)


CHECKERS = {
    "go": check_go, "csharp": check_csharp,
    "python": check_python, "ts": check_ts, "tsx": check_ts,
}


def main() -> int:
    wanted = set(sys.argv[1:]) or set(CHECKERS)
    snippets = extract(os.path.join(REPO, "src", "app"))

    res = Result()
    by_lang: dict[str, list[Snippet]] = {}
    for s in snippets:
        if s.language in CHECKERS and s.language in wanted:
            by_lang.setdefault(s.language, []).append(s)

    # ts and tsx share one compiler invocation.
    merged = {k: v for k, v in by_lang.items() if k not in ("ts", "tsx")}
    ts_all = by_lang.get("ts", []) + by_lang.get("tsx", [])

    for lang, group in sorted(merged.items()):
        print(f"checking {len(group):3d} {lang} snippets ...", flush=True)
        CHECKERS[lang](group, res)
    if ts_all:
        print(f"checking {len(ts_all):3d} ts snippets ...", flush=True)
        check_ts(ts_all, res)

    print()
    for s, why in res.failed:
        where = s.label or s.kind
        print(f"FAIL  {s.page}  [{s.language} #{s.index} {where}]")
        for line in why.splitlines():
            print(f"        {line}")
    for s, why in res.skipped:
        print(f"SKIP  {s.page}  [{s.language} #{s.index}]  {why}")

    print(f"\n{len(res.ok)} ok, {len(res.failed)} failed, {len(res.skipped)} skipped")
    return 1 if res.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
