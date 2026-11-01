# Orbace Sudoku Arena — evidence capture guide

This guide prepares the screenshots and recordings for the hackathon submission. It covers the three distinct flows and keeps their evidence separate:

1. **Orbace Arena product flow:** authenticated host, anonymous audience, vote, Extreme round, result, and rematch.
2. **Twitch chat flow:** a viewer sends `!arena` and the bot posts the current safe Arena status.
3. **OBS broadcast flow:** the read-only Arena overlay is displayed in OBS and transmitted on the Twitch channel.

The first flow is the Orbace Preview product. The second and third flows use the controlled local Arena/Twitch/OBS demo. The edit must label these flows clearly and must not imply that the local bot is connected to the Preview database.

## What Codex can capture

| Evidence | Codex can capture | Best use |
| --- | --- | --- |
| Browser state | Playwright screenshots and videos from the repository's deterministic E2E suite | Host, audience, voting, playing, result, rematch, and feature-flag evidence |
| Browser source | A screenshot of the local overlay page or a Playwright capture of `/overlay/live` | Board, timer, read-only projection, and result evidence |
| OBS composition | OBS recording or a user-provided screen capture | Proves the Browser Source is visible in the broadcast scene |
| Twitch chat | User captures the Twitch viewer chat window while Codex listener logs provide timing correlation | Proves `!arena` and the automated reply |
| Twitch transmission | User records the Twitch channel while the stream is marked LIVE | Proves OBS output reached Twitch; an OBS preview alone is insufficient |
| Code/Codex build | Short screen recording of the Codex thread, source diff, and passing test command | Satisfies the “built with Codex” evidence requirement |

Codex can reliably create deterministic browser artifacts. A real Twitch message and an OBS transmission require the user to operate the two Twitch accounts and OBS. Do not replace those live proofs with a mocked test or a terminal log.

## Before recording

- Freeze the demo revision and write its commit SHA in the shot log.
- Close unrelated browser tabs and disable notifications.
- Use separate browser profiles for host and audience. Do not use the host cookie in the audience window.
- Prepare the local Arena server and a fresh session. Use the stable OBS URL `http://127.0.0.1:4183/overlay/live` so a rematch does not require editing OBS.
- Keep `ARENA_ENABLED=false` in the Twitch listener environment. Only the separate local Arena process may use the explicit local override.
- Confirm the local supply contains only approved Extreme boards.
- Ensure `.env`, tokens, passwords, cookies, host URLs, database identifiers, and stored solutions cannot appear in any capture.
- Start a screen recording before the first action so the chronology is unambiguous.

## Flow 1 — Orbace Arena product capture

Record one continuous take where possible. The host and guest may be side-by-side or shown in clearly labeled cuts.

| ID | Action | Required visible evidence |
| --- | --- | --- |
| A1 | Host signs in and opens Arena | Authenticated host view and Arena entry point |
| A2 | Host creates a session; guest opens the share link | Guest join confirmation and participant count |
| A3 | Host opens voting; guest votes and changes the vote | Voting phase, countdown, selected time mode, and votes received |
| A4 | Host starts after participation is satisfied | `PLAYING`, Extreme difficulty, board, and server countdown |
| A5 | Host enters/submits the solution | Submission action without exposing a stored solution or private puzzle identifier |
| A6 | Round resolves | Same authoritative result on host and guest |
| A7 | Host rematches | New ballot and fresh eligible puzzle; no silent reuse within the series |

Suggested narration:

> The host creates an Arena and shares the audience link. Viewers join without signing in, vote during the timed ballot, and follow the same Extreme puzzle and server countdown. The server validates the solve and publishes the result. Rematch creates a fresh round with a new eligible puzzle.

## Flow 2 — Twitch chat capture

Start with the listener already showing token validation, EventSub welcome, and an enabled `channel.chat.message` subscription. Do not show token values.

| ID | Action | Required visible evidence |
| --- | --- | --- |
| T1 | Local Arena is `PLAYING` | Current mode, Extreme label, and remaining time |
| T2 | Alex sends exactly `!arena` | Viewer message in the designated channel |
| T3 | Bot replies automatically | Reply such as `Orbace Arena LIVE — Endurance · Extreme · 04:30 remaining` |
| T4 | Listener receives the event | Safe diagnostics or a visible success indicator; no credentials |
| T5 | Optional negative check | End the round and show the safe not-live response |

The reply must be visibly authored by the bot account. A manual broadcaster reply is not evidence of the bridge.

## Flow 3 — OBS and Twitch transmission capture

| ID | Action | Required visible evidence |
| --- | --- | --- |
| O1 | Configure OBS Browser Source | URL uses `/overlay/live`, not a stale hard-coded session ID |
| O2 | Start the stream | OBS shows the scene and Twitch shows the channel as LIVE |
| O3 | Compare views | OBS, host/audience, and Twitch viewer show the same board and countdown |
| O4 | Let the round resolve | Overlay and Twitch transmission show the terminal result |
| O5 | Optional rematch | Overlay follows the newest session without reconfiguration |

The Twitch viewer recording is the proof of transmission. OBS's own preview window proves composition only.

## Recommended capture methods

### Option A — Codex-assisted browser evidence

Run the repository browser suite and retain its screenshots/video for deterministic UI evidence:

```sh
npm ci
npx playwright install chromium
npm run arena:e2e
```

Use this for A2–A7 and for feature-flag/privacy regression evidence. It does not prove a live Twitch reply or Twitch transmission.

### Option B — Manual OBS/Twitch recording

Use OBS's **Start Recording** for the final composite. Keep the Twitch viewer open in a separate window or second device and record the viewer view for the transmission proof. This is the preferred method for T2–T4 and O1–O4.

### Option C — Hybrid capture

Use Playwright screenshots for clean Arena states, then record only the short live Twitch/OBS segment manually. This reduces timing risk while preserving live proof. Add a visible transition card before each flow so the editor does not merge them into a false single deployment story.

## Screenshot and video file plan

Keep raw media outside Git. Suggested names:

```text
flow-a-A1-host-arena.png
flow-a-A2-guest-joined.png
flow-a-A3-vote-ready.png
flow-a-A4-playing-extreme.png
flow-a-A6-result.png
flow-a-A7-rematch.png
flow-b-T1-chat-status.png
flow-b-T2-T3-arena-command-reply.png
flow-c-O1-obs-overlay-playing.png
flow-c-O2-twitch-live.png
flow-c-O4-overlay-result.png
flow-a-preview-raw-YYYYMMDD.mp4
flow-b-twitch-chat-raw-YYYYMMDD.mp4
flow-c-obs-twitch-raw-YYYYMMDD.mp4
```

For each take, record the local time, environment, candidate SHA, session ID only if it is safe to share, and which IDs were captured. Do not put tokens, passwords, cookies, or private solutions in the shot log.

## Three-minute edit outline

| Time | Footage | Caption |
| --- | --- | --- |
| 0:00–0:10 | Hero Arena board and Twitch branding | `Orbace Sudoku Arena` |
| 0:10–1:05 | Flow 1, A2 through A7 | `Orbace Preview product flow` |
| 1:05–1:35 | Flow 2, T1 through T4 | `Twitch chat integration` |
| 1:35–2:15 | Flow 3, O1 through O4 | `OBS broadcast overlay` |
| 2:15–2:35 | Codex thread, source change, passing tests | `Built and tested with Codex` |
| 2:35–2:50 | Result/rematch hero shot | `Audience-driven Extreme Sudoku` |

Keep the final YouTube upload under three minutes and make it public or unlisted. Verify the link in a signed-out browser before pasting it into Devpost.

## Privacy and accuracy review

Before sharing any still or video, inspect every frame for:

- access tokens, client secrets, passwords, stream keys, `.env` contents, cookies, or authorization headers;
- private puzzle IDs, stored solutions, database hostnames, or internal Auth identifiers;
- host-control URLs shown in an audience or OBS capture;
- unrelated tabs, personal email, file paths, or notifications;
- manual text that could be mistaken for an automated Twitch reply;
- a Preview screen and local Twitch screen presented as one connected deployment.

If a required event was not captured, mark it **not captured** in the shot log. Do not describe an earlier test as if it appears in the new video.

## Final checklist

- [ ] Flow 1 shows host → guest join → vote → start → Extreme board → result → rematch.
- [ ] Flow 2 shows Alex sending `!arena` and the bot's automated reply.
- [ ] Flow 3 shows OBS Browser Source and the same state on a Twitch LIVE viewer.
- [ ] Codex build/test evidence appears briefly in the final edit.
- [ ] Image gallery contains clean screenshots from all three flows.
- [ ] Try-it-out links point only to judge-accessible URLs; local `127.0.0.1` links are not useful to judges.
- [ ] YouTube video is public or unlisted, under three minutes, and verified signed out.
- [ ] No secrets, private solutions, or misleading combined-flow claims are visible.
