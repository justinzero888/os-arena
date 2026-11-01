# Arena Round C - Twitch pilot runbook

## Purpose and boundary

Round C validates a supervised Twitch presentation and invited remote-audience journey: host board, OBS overlay, remote join/vote/watch, terminal result, and one rematch. It is not a production launch, ranking event, or open public test.

The standalone server on `127.0.0.1:4183` must **not** be exposed with port forwarding, a tunnel, router configuration, or a temporary public URL. It keeps state in one process, has no production host authorization or persistent session store, and is suitable only for local rehearsal.

The current production readiness assessment remains **NO-GO**. Start Round C only after the owner and DB owner explicitly authorize the approved staging path and the gates in [ARENA_PHASE5_PRODUCTION_READINESS.md](ARENA_PHASE5_PRODUCTION_READINESS.md) are complete.

## Roles and artifacts to name before scheduling

| Role | Required responsibility |
| --- | --- |
| Pilot owner | Approves the window, invited audience, privacy notice, and go/no-go decision. |
| Host | Uses the separately approved and allowlisted Arena account. |
| Broadcast operator | Owns OBS, the test Twitch channel, scene switching, and stream start/stop. |
| Arena operator | Monitors Arena health, state, errors, and audience count. |
| Incident / kill-switch operator | Has explicit authority and a tested way to disable Arena. |
| Database owner | Approves the staging schema, private puzzle supply, and recovery plan. |

Prepare a private pilot record containing the approved staging URL, pilot date/time, test Twitch channel, host subject, operator contacts, audience cap, and abort decision. Do not place stream keys, access tokens, host subject values, database URLs, or puzzle solutions in this repository or the broadcast.

## Gate 1 - approved remote guest-access method

Use one controlled HTTPS staging deployment of the reviewed, integrated Arena application. The guest URL must be a canonical HTTPS route served by that deployment, for example `https://<approved-staging-origin>/join/<opaque-session-id>`. The session ID is an invitation locator, not an authorization secret.

Before issuing a QR code or invitation link, the staging deployment must demonstrate all of the following:

1. The reviewed source/build identity, Arena migration, RLS, private Extreme supply, retention job, and rollback/disable procedure are approved for the staging target.
2. Host control is authenticated and limited to the approved host subject; anonymous requests cannot read host state, private puzzle data, or solution data.
3. The public guest and overlay projections are safe, rate-limited, same-origin/CSRF-protected where applicable, and work through the real HTTPS proxy. Verify trusted-proxy/client-IP behavior before relying on IP limits.
4. Session, vote, timer, and rematch state live in the approved persistent service/store; no process-local state is used as the remote source of truth.
5. The audience route is available to an external-device test over a non-host network. The host/control route remains protected. Use an opaque, expiring session ID and the agreed audience cap; do not describe browser-cookie identity as one-person-one-vote.
6. The feature is initially disabled. Verify disabled behavior, then enable only under the separately approved staging flag, host allowlist, origin configuration, and pilot window.

**Do not use:** the local `127.0.0.1` URL, router port forwarding, a generic tunnel to the Mac, a broad deployment-protection bypass, copied browser cookies, or a public production URL as a substitute for this gate.

## Gate 2 - OBS broadcast layout rehearsal

Create an OBS scene named **Orbace Arena Pilot** on the test Twitch account.

1. Set the planned canvas/output resolution and frame rate. Record them in the pilot record so captured evidence can be reproduced.
2. Add a host-board source. Prefer a dedicated host-browser/window capture, cropped so browser chrome, host links, private controls, local paths, notifications, credentials, and other applications are not visible.
3. Add a Browser Source for the staging overlay URL: `https://<approved-staging-origin>/overlay/<session-id>`. Size it as a compact, readable panel beside the board. The overlay must contain only the public-safe projection.
4. Add a small static label such as `Test pilot - audience votes set the time mode`; do not show a raw join URL, host URL, secret, or stream key in the scene.
5. In Browser Source properties, enable refresh on scene activation for the refresh check. Switch away from and back to the scene during rehearsal; confirm the overlay recovers its current state and timer.
6. Preview the scene at the intended resolution. Verify board cells, timer, result text, and overlay contrast are readable, and verify no loading/error page is visible.
7. Record the display/Browser Source layout and one preview screenshot in the private pilot evidence folder.

OBS streaming is separate from the repository's Twitch EventSub smoke test. Configure OBS to use the approved test Twitch channel through the broadcaster's account connection or a securely stored stream credential. Do not put a stream credential into `.env`, source code, screenshots, terminal output, or the QR code. Keep `TWITCH_TEST_SEND_ENABLED=false` unless the separate chat-reply smoke test has explicit approval.

## Gate 3 - invitation, QR, and external-device rehearsal

1. Create a fresh staging Arena session as the approved host and copy only its audience `join` URL.
2. Generate a QR code from that exact HTTPS audience URL. Inspect the decoded value before sharing it; it must not contain a host capability, operator-only parameter, credential, or internal hostname.
3. Test the QR code from a phone on a network other than the host machine's network. Confirm it opens the guest page, not a host route, and that it does not expose a solution.
4. Open the same join URL in the planned number of separately identified browser contexts. Record each context label (for example, `guest-1` through `guest-3`); contexts are browser identities, not verified people.
5. Confirm that joins, votes, refreshes, and normal polling stay below the configured limits and show no `RATE_LIMITED` message.
6. Keep the final invitation limited to the approved audience cap and time window. Announce the privacy/identity limitation: browser-based participation is not verified one-person-one-vote.

## Gate 4 - Twitch connection and preflight

1. In OBS, select the test Twitch channel and start a short unlisted/private rehearsal if the channel configuration supports it; otherwise use the approved test visibility and an announced test window.
2. Confirm the Twitch dashboard receives video and audio, and confirm the operator can stop the stream immediately.
3. Verify the live scene: board source and overlay are visible, the overlay URL is the staging origin, and no host-private content or QR code remains on-screen.
4. If the optional EventSub smoke test is in scope, run it as a separate, explicitly approved check with sending disabled first. A successful OBS stream does not prove EventSub, and EventSub success does not prove Arena gameplay.
5. Before inviting viewers, the Arena operator verifies health, correct deployment revision, feature enablement, host authorization, audience cap, error monitoring, kill switch, and the private communication channel for incidents.

## Round C live sequence

1. Start OBS on the test Twitch channel and display the prepared `Orbace Arena Pilot` scene.
2. Host creates a fresh session. The Arena operator verifies the session is fresh and the Browser Source displays its matching overlay.
3. Share the tested join link/QR only with the approved invite list. Record the time invitations were issued.
4. Confirm the expected browser-context count, then open voting. Guests join, vote, and may change a vote within the ballot window.
5. Confirm host and overlay agree on status, selected time mode, audience count, vote count, and countdown. A one-second visual countdown difference is acceptable; state/version disagreement is not.
6. During PLAYING, refresh one guest context and reactivate the OBS scene to refresh the Browser Source. Confirm both recover the current state and timer.
7. Complete one round by solve or expiry. Confirm host, guest, and overlay display the same terminal result.
8. Run one rematch. Confirm it is a new linked session with a fresh approved puzzle, cleared votes, and a newly verified overlay/join URL. Do not reuse the previous session's QR/link.
9. Stop the stream and disable the Arena feature using the approved procedure. Verify disabled behavior and ordinary application health.
10. Preserve only the approved evidence: timestamps, context labels/counts, chosen time mode, timer observations, result/rematch outcome, monitoring summary, and any incident record. Apply the approved retention and cleanup policy.

## Abort conditions

Stop invitations and disable Arena immediately for any answer/private-data exposure, unauthorized host control, wrong session or overlay, terminal-result disagreement, incorrect deadline/winner, sustained unexpected errors, an unapproved audience/link exposure, or a regression in unrelated application traffic. The incident/kill-switch operator owns the stop decision; do not attempt ad-hoc database repair or public debugging during the stream.

## Completion evidence

Round C passes only when the pilot record shows:

- OBS received the test stream and showed the host board plus the correct compact Arena overlay.
- An external device used the HTTPS join URL/QR without reaching a host/private route.
- Invited browser contexts joined, voted, watched the live state, and saw the same terminal result.
- Host and overlay state/timer matched within the accepted one-second display tolerance.
- Guest refresh and Browser Source refresh recovered during PLAYING.
- One rematch completed with a new session/puzzle and cleared vote state.
- No abort condition occurred; the feature was disabled and the stream stopped after the pilot.
