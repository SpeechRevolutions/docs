#!/usr/bin/env python3
"""Pull every code snippet the docs publish out of the JSX that carries it.

The docs are React pages, so a snippet lives inside a template literal on a
`<CodeTabs>` tab or a `<CodeBlock>`. That means the published text is not the
authored text: backticks, `${` and backslashes are escaped to survive JSX.
This undoes that, so what lands on disk is byte-for-byte what a reader copies
out of the page.

Used by check_snippets.py. Kept separate because the extraction is the part
that is easy to get subtly wrong, and it is worth being able to eyeball its
output on its own.
"""

from __future__ import annotations

import io
import json
import os
import re
import sys
from dataclasses import dataclass, asdict

# A tab object: label, language, optional filename, then the code literal.
TAB = re.compile(
    r'label:\s*"([^"]+)",\s*\n'
    r'\s*language:\s*"([^"]+)",\s*\n'
    r'(?:\s*filename:\s*"([^"]*)",\s*\n)?'
    r'\s*code:\s*`(.*?)`,\n',
    re.S,
)

# A standalone block: <CodeBlock language="x" code={`...`} /> in either order.
BLOCK = re.compile(
    r'<CodeBlock\b(?=[^>]*\blanguage=\{?"([a-z#+]+)")'
    r'[^>]*?\bcode=\{`(.*?)`\}',
    re.S,
)


@dataclass
class Snippet:
    page: str          # "/guides/timestamps"
    source: str        # file it came from
    kind: str          # "tab" | "block"
    label: str         # tab label, or "" for a block
    language: str      # as written in the page
    filename: str      # suggested filename, if the page gave one
    index: int         # nth snippet of this language on this page
    code: str


def unescape(code: str) -> str:
    """Recover the authored text from a JSX template literal.

    Order matters: `\\\\` must be collapsed last, or a literal backslash in
    the snippet would eat the escape of whatever follows it.
    """
    out = []
    i = 0
    while i < len(code):
        c = code[i]
        if c == "\\" and i + 1 < len(code):
            nxt = code[i + 1]
            if nxt in ("`", "$", "\\"):
                out.append(nxt)
                i += 2
                continue
        out.append(c)
        i += 1
    return "".join(out)


def page_name(path: str, root: str) -> str:
    rel = os.path.relpath(path, root)
    return "/" + rel.replace("/page.tsx", "").replace("page.tsx", "").strip("/")


def extract(root: str) -> list[Snippet]:
    found: list[Snippet] = []
    counts: dict[tuple[str, str], int] = {}

    for dirpath, _, files in os.walk(root):
        for name in sorted(files):
            if not name.endswith(".tsx"):
                continue
            path = os.path.join(dirpath, name)
            text = io.open(path, encoding="utf-8").read()
            page = page_name(path, root)

            def add(kind, label, lang, filename, code):
                key = (page, lang)
                counts[key] = counts.get(key, 0) + 1
                found.append(Snippet(
                    page=page, source=path, kind=kind, label=label,
                    language=lang, filename=filename or "",
                    index=counts[key], code=unescape(code),
                ))

            for m in TAB.finditer(text):
                add("tab", m.group(1), m.group(2), m.group(3), m.group(4))
            for m in BLOCK.finditer(text):
                add("block", "", m.group(1), "", m.group(2))

    return found


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else "src/app"
    snippets = extract(root)
    json.dump([asdict(s) for s in snippets], sys.stdout, indent=1)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
