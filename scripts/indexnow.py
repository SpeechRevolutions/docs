#!/usr/bin/env python3
"""Tell IndexNow (Bing, Yandex, Seznam, Naver) which URLs a deploy changed.

    indexnow.py <old sitemap file> <new sitemap URL or file>

Compares the sitemap that was live before the deploy with the one after it and submits
every URL that is new or whose <lastmod> moved. Bing's index is what ChatGPT search,
Copilot and DuckDuckGo answer from, and IndexNow is how a site gets a changed page
recrawled in minutes rather than whenever Bing next gets round to it.

The key is public by design: IndexNow proves ownership by fetching
https://<host>/<key>.txt, which is in public/.

An empty or missing old sitemap (first run, or the fetch failed) submits everything.
Never fails the deploy: a ping that doesn't land costs a slower recrawl, nothing more.
"""

import json
import re
import sys
import urllib.request
from urllib.parse import urlparse

KEY = "a279fa511aace07850fc982fb6281408"
ENDPOINT = "https://api.indexnow.org/indexnow"


def read(source: str) -> str:
    if source.startswith("https://"):
        req = urllib.request.Request(source, headers={"User-Agent": "sr-deploy-indexnow"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8")
    try:
        with open(source, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def entries(xml: str) -> dict[str, str]:
    """{loc: lastmod}. A regex is enough: Next writes these files, one <url> per entry."""
    out = {}
    for block in re.findall(r"<url>(.*?)</url>", xml, re.S):
        loc = re.search(r"<loc>(.*?)</loc>", block, re.S)
        mod = re.search(r"<lastmod>(.*?)</lastmod>", block, re.S)
        if loc:
            out[loc.group(1).strip()] = mod.group(1).strip() if mod else ""
    return out


def main() -> int:
    old_src, new_src = sys.argv[1], sys.argv[2]
    try:
        new = entries(read(new_src))
    except Exception as e:  # noqa: BLE001 - see the module docstring
        print(f"::warning::indexnow: could not read the new sitemap: {e}")
        return 0
    old = entries(read(old_src))
    changed = sorted(u for u, mod in new.items() if old.get(u) != mod)
    if not changed:
        print("indexnow: no URL changed, nothing to submit")
        return 0

    host = urlparse(changed[0]).netloc
    body = json.dumps(
        {
            "host": host,
            "key": KEY,
            "keyLocation": f"https://{host}/{KEY}.txt",
            "urlList": changed,
        }
    ).encode()
    req = urllib.request.Request(
        ENDPOINT,
        data=body,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
    except urllib.error.HTTPError as e:
        status = e.code
    except Exception as e:  # noqa: BLE001
        print(f"::warning::indexnow: request failed: {e}")
        return 0
    # 200 accepted, 202 accepted pending key check. Anything else is worth seeing in the log.
    level = "" if status in (200, 202) else "::warning::"
    print(f"{level}indexnow: submitted {len(changed)} URL(s) for {host} -> HTTP {status}")
    for u in changed:
        print(f"  {u}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
