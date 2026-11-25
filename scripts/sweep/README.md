# Full public-code sweep (2026-11-24)

Everything public, run against production with the PUBLISHED SDKs. Layout (one folder, siblings):

    sweep/  docs@main  python-sdk@vX  node-sdk@vX (npm ci; npm run build)  speechrevolutions-go@vX  csharp-sdk@vX
            snipfix/   fixtures: meeting.mp3/.wav (a 60 s real meeting), audio/interview/talk/... copies, files.txt,
                       audio/, local.wav, talk.mp4, board-meeting.mp4

Env: SPEECHREVOLUTIONS_API_KEY, SR_SNIPPET_WORKSPACE=<sweep>/snipfix,
SR_SNIPPET_AUDIO_URL=https://docs.speechrevolutions.com/samples/diamond-necklace.mp3, SR_SNIPPET_PROXY_URL (a local
forward proxy, e.g. `proxy --port 8899`), SR_SNIPPET_SRC_BUCKET (a private scratch bucket holding meeting.mp3) + AWS
creds, Go in ~/.local/go, .NET in ~/.local/dotnet. Framework deps: fastapi uvicorn flask django; express, next@14,
react, undici, @aws-sdk/client-s3, @aws-sdk/s3-request-presigner beside node-sdk; `npm ci` in docs.

1. `scripts/run_snippets.py python ts go csharp bash` -- every docs snippet
2. `scripts/run_framework_snippets.py` -- the handlers, booted and driven (signed + forged webhooks)
3. `scripts/sweep/run_sdk_readmes.py` -- the SDK README blocks + examples/ (copy beside the SDKs)
4. `scripts/sweep/run_cookbook_live.py` -- every cookbook recipe's usage line (SR_BUCKET = the scratch bucket);
   plus `pytest tests` in the cookbook (against the mock)
5. `scripts/sweep/run_landing.py` -- every landing-site sample (samples.ts quickstart + install lines, use-case
   pages, blog code blocks); LANDING = a landing checkout, read at origin/main

2026-11-24 result: docs 232 ran / 2 failed (a fragment; a shell call to a receiver it expects running) / 58 skipped
by design; framework 16/16; SDK READMEs 41/43 (two fragments) + examples 12/12; cookbook 15/15 live + 60/60 mock.
2026-11-25: landing 15/15 (published 1.0.0 SDKs).
