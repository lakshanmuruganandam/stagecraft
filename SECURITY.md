# Security policy

StageCraft handles sign-ins, roles and signed credentials, so security reports are taken seriously.

## Reporting a vulnerability
Please **do not open a public issue**. Email the maintainer via the address on the GitHub profile with:
- a description of the issue and its impact,
- steps to reproduce (URL, account role, request),
- any suggested fix.

You'll get an acknowledgement within 72 hours and a fix or mitigation plan within 7 days for confirmed issues.

## What's in place
- scrypt password hashing, constant-time checks, no account enumeration
- server-side, revocable sessions (SHA-256 token hashes only), login throttling
- role- and house-scoped authorization on every page, action and command
- Origin checks on mutation endpoints, strict CSP, HSTS, `frame-ancestors 'none'`
- Ed25519-signed certificates with revocation, rotating HMAC proof-of-presence codes
- audit log of authentication events and every privileged action
