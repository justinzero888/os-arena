# Orbace Arena — submission video capture brief

**Prepared:** 2026-10-31  
**Recording target:** 2026-11-01  
**Status:** Capture plan; footage and final submission have not been approved by this document.

## 1. Purpose and evidence boundary

The submission video should show two independently verified flows. Record and label them separately. The Orbace Preview application and the local Twitch/OBS demonstration are **not one deployed end-to-end environment**; editing must not imply that the local chat bot or OBS source is connected to the Preview session.

| Flow | What to demonstrate | Environment | Existing evidence |
| --- | --- | --- | --- |
| **A — Orbace Arena product** | Authenticated host, anonymous audience, time-mode vote, private Extreme puzzle, synchronized play, authoritative result, rematch | Dedicated Orbace Arena Preview | [Flow 1 freeze request](../review-packages/ARENA-POC-DEMO-FREEZE-REVIEW-REQUEST.md) and `docs/evidence/arena-poc-preview-demo-mode-2026-10-31.json` |
| **B — Twitch chat + OBS broadcast** | Viewer `!arena` → EventSub → local Arena public status → bot reply; local read-only overlay → OBS → Twitch live video | Local Arena at `127.0.0.1:4183`, designated Justinzero Twitch channel, OBS | [Twitch/OBS readiness record](TWITCH_CHAT_OBS_DEMO_READINESS_2026-10-31.md) and [runbook](TWITCH_CHAT_OBS_DEMO_RUNBOOK.md) |

Flow A's frozen candidate is `d78178c4cd20040bf6e6da3b8ffaac4d0615c87d` on `codex/arena-phase4-preview`. This is a demo candidate, not a production release. Flow B uses the standalone local Arena and its stable `/api/arena/sessions/live` and `/overlay/live` aliases. The source/default setting remains `ARENA_ENABLED=false`; the local Arena process is enabled only for a controlled recording.

## 2. Required raw recordings

Capture **continuous raw takes with audio or a spoken slate**, even if the final edit is short. Keep the original files so an editor can verify chronology. Use separate browser profiles/contexts for host and audience; do not stage a guest view inside the host's authenticated profile.

### Flow A — Preview product journey

Record one complete take showing these beats in order:

1. Host signs in through Orbace and opens Arena. Show the host view and clearly identified audience view side by side or with unambiguous cuts.
2. Host creates a new session; anonymous audience opens its share link and joins without signing in. Show connected/watching count separately from votes received.
3. Host opens the time-mode ballot. Audience casts a vote, then changes it; show that the effective voter count does not increase. Show the selected mode and that puzzle difficulty remains **Extreme**.
4. Host starts the round. Show host grid, audience read-only grid, and the same countdown. Capture at least one host entry and, if practical, Notes/Pencil appearing on audience and overlay.
5. Host submits the solution. Show the authoritative result on host and audience. Then create a rematch and show a fresh ballot and fresh private puzzle.

**Required stills:** (A1) joined audience plus host presence/vote counts; (A2) active Extreme board and matching timer in host and audience; (A3) shared result; (A4) rematch ballot/new board. A continuous recording is stronger evidence than stills alone.

### Flow B — local Twitch/OBS proof

Record one take with the local Arena round already in `PLAYING` and the Twitch listener subscribed:

1. Show the local host round and read-only audience or overlay grid with the selected time mode and countdown.
2. From the separate Alex viewer account, send `!arena` in the designated Justinzero channel. Capture the bot's **automated** status reply in Twitch chat, with mode, **Extreme**, and a plausible remaining time. Do not substitute a manual broadcaster reply.
3. Show OBS Browser Source using the stable `/overlay/live` URL, with the same public grid and a moving timer. Then show the actual Twitch channel marked **LIVE** with the OBS scene visible to a viewer. A scene visible only in OBS Preview is insufficient evidence of transmission.
4. If the round ends during capture, show the terminal result in the overlay and Twitch video. This is useful additional proof, not a substitute for a visible active timer.

**Required stills:** (B1) Alex's `!arena` and the bot status reply together; (B2) OBS source with grid/timer; (B3) Twitch LIVE badge with the transmitted Arena scene. Capture B1 and B3 from the viewer account where possible.

Use the established [local runbook](TWITCH_CHAT_OBS_DEMO_RUNBOOK.md) for start, identity, send opt-in, and cleanup. The listener must retain `ARENA_ENABLED=false`; only the separate local Arena process uses a temporary local override. The OBS source should use `/overlay/live` (or `/overlay/live?obs=1` if that is the verified display variant), so a new session does not require a hard-coded ID.

## 3. Proposed edit and narration

The verified [submission rubric](ARENA_SUBMISSION_RUBRIC_2026-10-31.md) requires a YouTube video **under three minutes** showing both the Twitch experience **and how Codex was used**. A provisional **120–150 second** cut can use:

| Approximate segment | Picture | On-screen/narration claim |
| --- | --- | --- |
| 0–10 s | Title and one active Arena grid | “Orbace Sudoku Arena: host versus audience, Extreme puzzle.” |
| 10–65 s | Flow A: host, guest, vote, play, result, rematch | “This is the Orbace Preview product journey.” |
| 65–110 s | Transition card, then Flow B chat, OBS, Twitch LIVE | “Separately, a local bridge reads public Arena status for Twitch chat and broadcasts the read-only overlay through OBS.” |
| 110–135 s | Genuine Codex thread/build evidence: a short screen capture showing the Arena request, code/test work or verified build result; hide private data | “Codex helped implement and test the Arena gameplay and Twitch bridge.” |
| Final seconds | Result/brand card | “Demo build; production rollout is separate.” |

Put a visible **“Orbace Preview product flow”** card before A and **“Local Twitch + OBS integration proof”** card before B. Avoid a seamless cut that suggests B's Twitch reply came from A's Preview session. Do not claim production deployment, a public pilot, or one-person-one-vote protection.

## 4. Recording setup for tomorrow

- Use the [verified rubric](ARENA_SUBMISSION_RUBRIC_2026-10-31.md): deadline **Nov 2, 2026, 2:00 p.m. PST / 5:00 p.m. EST**; video **under 3 minutes**, hosted on YouTube and linked from Devpost. The published rules do not set an aspect ratio or file-size limit; inspect the live form for any additional field constraints.
- Prepare a 1920×1080 screen capture at 30 fps or better, with legible browser text and OBS grid. Record a short audio test. Disable desktop notifications and hide unrelated windows/tabs.
- Arrange host, audience, OBS, and Twitch viewer windows before starting the timed round. Start screen recording **before** host creation or `!arena`, so the sequence is captured without rushing the timer.
- Keep the frozen Flow A candidate and Flow B code unchanged for the recording. If a defect requires a code change, record the new candidate identity and revalidate the affected flow before presenting it as the freeze build.
- Do not record `.env`, tokens, stream key, cookies, authentication headers, password entry, private solution, database identifiers, terminal environment dumps, or host capability URLs. Crop or mask such material in raw footage before sharing it with editors or uploading it.
- Store raw footage and exported stills outside Git. Suggested names: `flow-a-preview-raw-YYYYMMDD.mp4`, `flow-b-twitch-obs-raw-YYYYMMDD.mp4`, and `flow-a-A1.png` through `flow-b-B3.png`. Record take time and candidate SHA in a small local shot log.

## 5. Capture acceptance checklist

- [ ] Flow A raw take shows host sign-in → create → anonymous join → vote/change → start → Extreme board → shared result → rematch.
- [ ] Flow B raw take shows viewer `!arena` → automated bot reply → moving OBS overlay → transmitted Twitch LIVE scene.
- [ ] A short genuine Codex-build capture is available and the final edit shows how Codex was used.
- [ ] The two flows have explicit labels and no combined-deployment claim.
- [ ] Timers, selected mode, and active state are legible; the OBS source follows `/overlay/live` without a session-ID edit.
- [ ] No secrets, private solution, host capability, or sensitive local configuration appear in shareable footage.
- [ ] Final edit meets the actual submission specifications, and the raw clips/stills remain available for review.

If any beat cannot be captured tomorrow, mark it **not captured** in the shot log and adjust the narration. Do not replace missing proof with a claim based only on an earlier screenshot.
