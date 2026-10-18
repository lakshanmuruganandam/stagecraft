# Demo credentials

These accounts exist only in **demo mode** (`STAGECRAFT_DEMO` not set to `off`), which is how the live site and a fresh local install run. They are seeded automatically and are rejected when demo mode is off, so they never work on a real deployment.

**Live site:** https://stagecraft-xi.vercel.app/login · **Local:** http://localhost:3000/login

**Password for every account:** `house-cup-2026`

| Account | Name | House | Role | What it can do |
|---|---|---|---|---|
| `admin@saranda.demo` | Saranda WebOps | Saranda | **Admin** | Everything, across every house: **Users** (roles, suspensions, password resets, sessions), **Audit log** with CSV export, **Broadcasts**, **Reset demo data** |
| `organizer@saranda.demo` | Ishaan Verma | Saranda | **Organizer** | Creates and runs Saranda events: control room, moderation, polls, brackets, talent-hunt reveal, **Wrap up** (certificates + house points) |
| `organizer@kaziranga.demo` | Mitali Saikia | Kaziranga | Organizer | Same as above for Kaziranga events. Shows that organizers cannot touch another house's events |
| `member@saranda.demo` | Ananya Iyer | Saranda | Member | Watch, chat, ask, upvote, vote, react, predict, check in, collect certificates |
| `guest@kaziranga.demo` | Rehan Bora | Kaziranga | Member | A second audience member from another house, for testing realtime in two windows |

## Tips for judging

- The sign-in page has one-tap persona buttons that fill these in.
- Once signed in, the **avatar menu** switches personas instantly (demo mode only).
- Open the same event as `member@saranda.demo` and `guest@kaziranga.demo` in two windows (one private) to watch chat, reactions and polls arrive live.
- As the admin, **Reset demo data** restores the seed at any time.

## Security notes

- Passwords are hashed with scrypt (N = 2^17). Sessions live on the server and can be revoked; sign-in is throttled.
- Every admin and organizer action is written to the audit log.
- For a real house deployment, set `STAGECRAFT_DEMO=off`. That rejects all of these accounts, hides the persona switcher and requires IITM email sign-ups. See [README → Deploying](README.md#deploying).
