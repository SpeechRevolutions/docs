# Authentication — Speech Revolutions API

Machine-readable summary of how to authenticate against `https://api.speechrevolutions.com`.
The full reference is at https://docs.speechrevolutions.com/authentication and the formal
description, including the security scheme, is at https://docs.speechrevolutions.com/openapi.json

## Scheme

API key in a header. There is no OAuth flow, no token exchange and no scopes.

```
X-API-Key: stt_<64 hex characters>
```

- Send it on every request, including the streaming endpoints.
- `Authorization: Bearer` is **not** accepted. The header is `X-API-Key`.
- A request with no `User-Agent` is rejected at the edge before it reaches the API, so set one.

## Getting a key

Keys are created in the console at https://console.speechrevolutions.com. A key is shown once,
at creation, and only its hash is stored — it cannot be recovered afterwards, only replaced.

## Scope of a key

A key carries the full permissions of the account that owns it: it can create jobs, read and
cancel that account's jobs, and spend that account's credit. There are no read-only keys and no
per-endpoint permissions.

Treat a key as a server-side secret. Never ship one to a browser, a mobile app or any other
client you do not control — anything holding the key can spend the balance. The documented
integration patterns all keep the key on a server and proxy requests through it.

## Rotation and revocation

Create the replacement first, deploy it, then revoke the old key. Revocation takes effect
within an hour at the latest, and usually immediately.

## Failure modes

- `401` — missing, malformed or revoked key.
- `402` — the key is valid but the account has no credit. Reads and cancellations still work.
- `422` — the `X-API-Key` header is absent entirely; the response names the missing field.

## Webhooks

Deliveries to your `callback_url` are signed with HMAC-SHA256 over the raw body, in the
`X-SR-Signature` header, alongside `X-SR-Event` and `X-SR-Delivery`. The signing secret is
issued by Speech Revolutions and is not self-serve yet — ask us for it.
