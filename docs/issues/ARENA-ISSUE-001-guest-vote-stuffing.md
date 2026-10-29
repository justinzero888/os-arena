# ARENA-ISSUE-001: Guest identity is cookie-only, so vote stuffing is rate-limited only by IP

- **Status:** Deferred, awaiting PM decision
- **Severity:** Medium (affects fairness of the audience preset vote)
- **Found by:** Code review of `feat/arena-mvp`
- **Location:** `src/arena-server.js`, `POST /api/arena/sessions/:id/votes`

## Problem
A guest is identified only by the `arena_guest` cookie. A client that omits the cookie is issued a fresh random guest on every vote, and each one counts as a distinct voter. The only limits are 30 POSTs/min per IP and 10 votes/min per guest, and the per-guest limit is never reached when the guest changes every request.

Behind a reverse proxy, `req.socket.remoteAddress` is the proxy, so every user shares one 30/min bucket and legitimate play can be rate-limited.

## Impact
One script can decide the preset (up to 30 votes/min per IP, more with rotating IPs). Pilot audiences are small, so the effect on a single vote is large.

## Options for PM
1. **Require an issued cookie before a vote counts.** Issue it on the join-page snapshot request and reject votes without it (400/403). Cheap, stops casual cookie-less stuffing, but a script can still fetch a fresh cookie per vote.
2. **Join token / per-session voter cap.** Limit distinct guests per IP per session. Moderate effort, still bypassable with rotating IPs.
3. **Twitch identity (login with Twitch / EventSub chat identity).** Real one-person-one-vote. Largest effort, ties into the Twitch integration roadmap.
4. **Accept for pilot.** Document the limitation; the pilot is a trusted audience.

Also decide: trust `X-Forwarded-For` (only if deployed behind a known proxy) so the IP limit keys on the client, not the proxy.

## Acceptance criteria (once decided)
- A request without a server-issued guest credential cannot add a counted vote.
- Tests cover cookie-less, replayed-cookie and rate-limited voting.
- API contract change (if any) is noted in the README.
