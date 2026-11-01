# Arena Round B observations

## 2026-10-30 — Attempt 1 / PARTIAL PASS

**Evidence:** [R-B Attempt 1](../e2e/R-B%20Attempt%201.pdf), pages 2–4.

The supplied PDF establishes that multiple guest windows joined, four votes were recorded, Quick was selected, the visible host/guest state and countdown agreed, and visible windows showed `Audience wins — time expired.` It does not identify the four browser contexts, show an OBS Browser Source, or show guest/overlay refresh recovery. Treat it as a partial pass only.

## 2026-10-30 — B-01 remediation and automated verification

**Triggering request:** `POST /api/arena/sessions/<session-id>/join`, the guest presence heartbeat. This is not snapshot polling: every view makes an unmetered `GET` snapshot request once per second, while a guest posts `join` immediately and then no more than once every five seconds.

**Cause:** The previous server placed every `POST` from an IP in one 30-request/60-second bucket. Three normal, independently cookie-isolated guests generate `3 × 12 = 36` heartbeat requests per minute. The initial joins, opening voting, four vote submissions (including a vote change), and Start also used the same bucket, so the local shared `127.0.0.1` bucket could return `RATE_LIMITED` even though each guest behaved normally.

**Correction:** Existing interactive mutations and first-time guest registrations remain limited to **30 per IP per 60 seconds**. A snapshot-minted cookie is not considered established until its first successful `join`, so it cannot bypass that registration cap. Existing guest vote protection remains **10 votes per browser identity per 60 seconds**. Established guest heartbeats now have their own **15 per browser identity per 60 seconds** bucket. The normal rate is 12/minute, leaving three requests of tolerance per browser; no guest-identity, host-capability, or vote-isolation behavior was broadened.

**Actual automated evidence:**

- `npm test` — **45 passed**. The new controlled-clock test sent 36 successful `join` heartbeats (12/minute from each of three independent cookie jars), then three votes plus one vote replacement. The resulting count was exactly three votes. The per-browser vote rate-limit test, a new 16th-heartbeat rejection test, and a snapshot-minted-cookie registration-cap test also passed.
- `npm run check` — passed.
- `npm run arena:e2e` — **4 passed**. The new Round B browser test created three separate browser contexts and one `/overlay/<session-id>` context. It recorded no API `429`, obtained three votes despite one replacement, selected Standard, observed PLAYING in all five views, and found snapshot countdowns no more than one second apart. It reloaded one guest and the overlay during PLAYING; both recovered. The host then solved and all five views displayed the same terminal host-win result.

The automated overlay context is a browser-equivalent check of the exact Browser Source URL; it is not a claim that the OBS desktop application was operated in this run. The manual OBS procedure is in [README.md](../README.md#repeat-round-b--host-three-browser-identities-and-obs).

## Browser identity and vote accounting

The server creates an HttpOnly `arena_guest` cookie per browser context and uses a salted hash of that cookie as the guest key. Each key owns one map entry in the session's vote ledger. A new vote from the same context changes that key's selection; it does not add a second vote. Therefore, three independent profiles/private windows should produce three guest identities and three counted votes even if one guest changes selection. Multiple tabs in one profile share the cookie and must not be treated as separate people.

The Attempt 1 PDF does not contain enough identity evidence to attribute its four windows/votes to three unique people or contexts. The repeatable Round B procedure now requires recording the three independently opened browser contexts and confirming three connected guests and three counted votes before Start.

## Automated coverage before human OBS verification

The automated checks established rate-limit, identity, overlay-route, and refresh coverage before the subsequent human OBS verification recorded below. No production change or architecture rework was made.

## 2026-10-30 — Attempt 2 / B-01 verified

**Evidence:** [R-B Attempt 2](../e2e/R-B%20Attempt%202.pdf), pages 1–3.

The `RATE_LIMITED` screenshot on page 1 was captured before the local server restart. After restart, the clean host Create Arena page and the rest of the evidence were captured with the corrected server: the fresh session progresses through LOBBY, READY, PLAYING, and the shared `Audience wins — time expired.` result. During PLAYING, the host and visible guest windows each show Standard with `Time remaining: 4:49`, providing visual timer/state agreement.

**B-01 status:** **PASS.** The restart cleared the stale pre-fix server process; the corrected local pilot then completed without an unexpected `RATE_LIMITED`. The 36-heartbeat/minute regression test and four-context browser test provide matching code-level coverage.

## 2026-10-30 — Round B verification / PASS

The pilot operator verified the `Orbace Arena Pilot` OBS scene with the Arena Browser Source visible in the OBS preview. The overlay showed `Round in progress`, Quick time mode agreed between host and OBS, and the countdowns were within one second (host `2:41`, OBS `2:42`). OBS displayed no loading or rendering error.

The run recorded **4 connected guest browser identities and 4 votes**. This exceeds the three-context/three-vote minimum. Browser identity is still intentionally cookie/session based, so these are not represented as four verified people.

**Round B status:** **PASS.** B-01 is corrected; OBS overlay rendering and state/countdown synchronization were observed. No production change or broad architecture rework was made.
