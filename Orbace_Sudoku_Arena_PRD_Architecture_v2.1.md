# Orbace Sudoku Arena (擂台) — Pilot PRD & Architecture

**Version:** 2.1  
**Date:** 2026-10-28  
**Status:** Scope locked for MVP; review clarifications incorporated; implementation subject to Day 0 feasibility gate  
**Target:** Three development days after infrastructure readiness  
**Supersedes:** v0.1 Pilot RPD & Architecture Design

## 1. Executive decision

Build **Challenge Show Lite**: one authenticated Orbace host runs a timed Sudoku round. Anonymous audience members vote on a difficulty/time preset, watch the host solve, and cast one bounded audience-strike vote. The host wins only when the server validates a complete correct solution before the deadline; otherwise the audience wins. The host can immediately run a rematch.

Twitch is a broadcast/discovery channel, not an identity provider or source of truth. Audience participation happens through an Orbace web URL, so viewers arriving from other platforms can participate too.

**Product principle:** the audience controls challenge conditions, not puzzle logic. Viewers do not submit Sudoku moves, hints, or free text. Arena is unranked entertainment: no Ranking Points, Scorecard, competition enrollment, prizes, or changes to official Orbace scoring.

### 1.1 Locked MVP scope

**Included**
- One authenticated Orbace host; one active Arena session per host.
- Three fixed challenge presets and a 20-second preset ballot.
- Anonymous guest participation using a first-party guest cookie; no account required for guests.
- One 15-second strike ballot, opened once at 30% of effective elapsed play time.
- Host Sudoku board with server-authoritative move/solution validation and deadline.
- Technical pause/resume and host cancellation.
- Public guest page, host controls, read-only OBS browser overlay, result view, and rematch.
- Basic sanitized append-only event log, operational error/health metrics, rate limits, feature flag and operator cancellation procedure.
- Regression tests for existing `/challenge`, Reddit Help to Solve, Su-Pu capture/replay, and official scoring.

**Explicitly out of scope**
- Twitch OAuth/API/EventSub, native Twitch Extension, Twitch chat bot, Twitch polls, and Twitch identity.
- Payments, prizes, rankings, persistent public leaderboards, viewer gameplay, viewer hints/free text, and multi-host sessions.
- Side-by-side Su-Pu integration, full replay renderer, AI puzzle generation, multi-platform SDKs, advanced operator dashboard, elaborate animations, multiple overlay themes, and SSE if versioned polling is sufficient.
- New microservices, Redis, queues, or new cloud accounts unless repository inspection proves an existing-stack solution impossible and the owner approves the change.

**Scope rule:** do not add features during the three-day pilot unless they are necessary for correctness, security, accessibility, regression safety, or the acceptance criteria below. Defer polish rather than weaken correctness.

## 2. Personas and core journey

**Host:** signs in through existing Orbace authentication, creates a session, opens preset voting, shares the join link/QR, starts the selected round, solves the board, uses technical pause only when necessary, sees the overlay preview, reviews the result, and starts a rematch.

**Guest voter:** opens the public Arena URL, receives a first-party guest cookie, votes on the preset, sees the result after close, watches play, and may vote once on the strike ballot. Guests do not need Twitch or Orbace accounts. The UI explains that the cookie identifies a browser, not a unique human.

**Spectator:** watches the broadcast and sees the read-only OBS overlay. Twitch chat alone does not cast votes.

**Operator:** can disable Arena for new sessions, inspect basic health/error information, and cancel/revoke a session without exposing unnecessary personal information.

**Primary journey:** host creates session → guests join → preset ballot opens/closes → preset and puzzle are locked → host starts the authoritative clock → host enters Sudoku values → strike ballot opens once → effect is applied or host is spared → host solves or time expires → all views show the same result → rematch creates a new linked session.

## 3. Locked game rules

### 3.1 Preset ballot
- Duration: **20 seconds**.
- Fixed presets: **Easy Sprint** (Easy, 180 seconds), **Medium Match** (Medium, 300 seconds), **Hard Survival** (Hard, 480 seconds). These are pilot defaults; change only through a reviewed configuration change, not ad hoc feature expansion.
- The host may select a default from the fixed pool before the ballot opens.
- Guests may change their vote until close; the last valid vote counts.
- During the open preset ballot, show total votes cast but not per-choice counts. Reveal the breakdown and winning preset when the ballot closes.
- If no votes are cast, use the host-selected default. Ties use a fixed, documented priority order shown in the UI; do not choose silently.

### 3.2 Strike ballot and modifier
- One strike ballot opens once when **effective elapsed play time reaches 30% of the round's configured duration**. Effective elapsed time excludes technical pauses.
- Ballot duration: **15 seconds**. Options: **Activate No Notes (20 seconds)** and **Spare the Streamer**.
- Host continues solving and the game clock continues while the strike ballot is open.
- Strike counts may be shown live during this short ballot. The UI states that **Spare wins ties** and **zero votes means Spare**.
- If the host wins before the ballot closes, the round finishes immediately and the outstanding ballot is voided. If the round times out or is cancelled, the ballot is also voided.
- If No Notes wins, hide candidate-note rendering and entry for 20 seconds while preserving note data. On effect expiry or reload, the original notes data remains intact.
- **Day 0 fallback:** if No Notes cannot be safely implemented without invasive board changes, use a one-time clock penalty instead. Calculate `penaltySeconds = min(10, max(0, remainingSeconds - 30))`. If 30 seconds or less remain, apply no penalty. Clearly label “Time penalty variant” in the UI and telemetry. Do not implement both modifier variants in the same pilot round.

### 3.3 Timing, pause, solve and timeout
- Server time is authoritative; browser countdowns are presentation only.
- A move is eligible to win only if it is received by the server before the deadline and is valid against the authoritative puzzle/solution and current board revision. A move received at or after the deadline loses.
- The implementation must serialize move adjudication and terminal-state resolution using the existing database/concurrency facilities. Capture a trusted server ingress timestamp and test deadline-boundary races. Do not let application processing latency alone invalidate a qualifying pre-deadline move. If the current architecture cannot guarantee this property, document the limitation and obtain an explicit product decision before claiming deadline-race correctness.
- Technical pause is allowed only for technical issues. It is available during `PRESET_VOTE` and `PLAYING` (including an open strike ballot or active modifier). Pausing freezes effective game elapsed time, game deadline remaining, open ballot close time, strike trigger progress, and active modifier remaining time. The host UI, guest page, and overlay show **“Paused — technical.”**
- While paused, reject board moves with deterministic `409 PAUSED`; do not silently queue or apply them. Log a sanitized rejection event without including private move/notes data.
- Disconnect does not automatically pause the round.
- Cancellation ends the session with no winner. A confirmation is required for pause and cancel actions to prevent accidental live disruption.
- A terminal session cannot transition backward or accept further gameplay effects.

### 3.4 Winner and fairness
- Host wins only when the authoritative server validates the complete board against a private authoritative solution before the deadline.
- Otherwise the audience wins on timeout.
- The client never decides victory. If puzzle data or solution validation is inconsistent, fail closed and do not launch or declare a host win.
- Arena results never affect official rankings, points, scorecards, or competition state.

## 4. Session state machine and transaction semantics

### 4.1 Session status

```text
CREATED → PRESET_VOTE → READY → PLAYING → FINISHED
                                └──────→ CANCELLED

PAUSED is a substate of PRESET_VOTE and PLAYING, not a separate session status. If the existing lifecycle cannot support pausing during `PRESET_VOTE` safely, document the blocker on Day 0 and require an explicit decision before implementation.
STRIKE is a ballot kind under PLAYING, not a session status.
```

Allowed lifecycle transitions are monotonic. `CANCELLED` and `FINISHED` are terminal. The strike ballot and modifier have their own status/timers and do not block gameplay.

### 4.2 Central state advancement

Implement a single transactional `advanceSessionState(sessionId, now)` or equivalent repository-native mechanism. State-dependent reads and writes must resolve due transitions consistently under a session row lock, serializable transaction, or equivalent optimistic concurrency scheme. Do not introduce a background queue solely for timer transitions if existing requests/polling can safely advance state.

The state advancement logic must handle:
- preset ballot close and deterministic result;
- strike trigger and ballot open/close;
- technical pause/resume time accounting;
- modifier activation/expiry;
- deadline expiry and terminal result;
- cancellation and terminal-state invariants.

**Race-resolution requirements**
1. Adjudicate by trusted ingress timestamps, not by the order in which deadline checks happen. Within the serialized transaction, first evaluate any pending move with `ingress_ts < deadline_at` against the private authoritative solution and current revision. If it is a valid solve, the host wins and open ballots are voided.
2. Only if there is no qualifying valid solve may `now >= deadline_at` produce an audience win. A move with `ingress_ts >= deadline_at` cannot win.
3. A valid solve terminates the round and voids any outstanding strike ballot.
4. A terminal session never activates a new strike effect.
5. A vote is accepted only if its trusted receipt time is before ballot close and the transaction validates that the ballot/session is still eligible.
6. Concurrent commands must produce one valid state transition; stale or duplicate commands receive deterministic responses.

The implementation must document its concrete transaction/locking approach after the repository audit. Capture `ingress_ts` at the earliest server-controlled point before queueing (for example, validated edge/load-balancer metadata or application middleware). Choose one authoritative clock source (database server time or NTP-synchronized application servers), compare timestamps consistently with `deadline_at`, and document failure behavior if trustworthy ingress time is unavailable. Tests must cover just-before, exactly-at, and just-after deadlines, including simultaneous move, ballot-close, and timeout requests.

### 4.3 Time and event ordering
Use one authoritative server time source consistently. Persist or derive the round deadline, pause start, remaining time on pause, ballot open/close times, and modifier remaining duration. Avoid mixing browser time with server time.

After the repository audit, choose and document one concrete concurrency-safe event-sequence method (prefer the session-row lock/transaction if compatible with the existing database). Allocate the sequence and commit the event with its state change in the same transaction; publish/notify only after commit. Event payloads must be sanitized and contain no solution, private notes, guest identifiers, or raw IP addresses.

## 5. Architecture and reuse policy

Use a **modular monolith** inside the existing Orbace web/backend deployment. Reuse existing database, authentication, hosting, Sudoku engine, and deployment/migration process. Prefer existing polling/SSE support; if SSE is not already straightforward, use versioned polling every 2–3 seconds with ETag/version. No new infrastructure without evidence and owner approval.

Logical modules:
- `arena-session`: lifecycle, host authorization, deadlines, pause/cancel/rematch, version checks.
- `arena-ballot`: choices, ballot cutoffs, vote changes, tally, tie resolution.
- `arena-modifier`: No Notes effect or fallback penalty.
- `arena-game`: adapter to existing puzzle selection, authoritative givens/solution, move validation and solved detection.
- `arena-events`: sanitized append-only events.
- `arena-web`: host controls, guest participation, and overlay.

Before implementation, inspect the real repository and produce a reuse/gap matrix for the existing Sudoku board/engine, `/challenge`, Reddit Help to Solve, Su-Pu capture/replay, authentication, persistence, timers, deployment, and tests. Do not assume conceptual modules or routes already exist.

### 5.1 Day 0 board feasibility gate

Pass only if the audit demonstrates:
1. The existing board can be used without coupling Arena results to official competition submission.
2. Moves can be serialized and validated server-side.
3. The server can compare the board against the full private authoritative solution (or a private validation oracle) and never exposes it publicly. A hash alone is integrity metadata, not a solution-validation mechanism.
4. The deadline and terminal result can be decided consistently.
5. No Notes can safely hide note entry/rendering and preserve data, **or** the time-penalty fallback is selected.

If existing-board integration fails, preferred fallback is an Arena-native minimal board only if it can meet all correctness and confidentiality criteria within the schedule. Otherwise provide a clearly labeled **“Unverified demonstration”** mode with no claim of reliable win detection. Do not present demonstration mode as a competitive or verified round.

## 6. Data and privacy model

Conceptual schema only; adapt to existing conventions and avoid redundant tables if existing models can safely serve the same purpose. The full solution or private validation oracle must be accessible to server-side validation; never rely on a hash alone to compare submitted cells.

- `arena_sessions`: session ID, host user ID, source platform (initially `web`), status, pause state/timing, preset, puzzle/givens reference or hash, **private solution reference and/or full private solution in protected storage**, optional solution hash for integrity, start/deadline, remaining time on pause, winner, version, prior session ID, optional series ID, timestamps.
- `arena_ballots`: session ID, kind (`PRESET` or `STRIKE`), open/close times, status, resolved choice, version.
- `arena_votes`: ballot ID, salted guest-key hash, choice, update time; unique per ballot and guest key.
- `arena_events`: session ID, monotonic sequence, type, sanitized payload, timestamp; unique `(session_id, seq)`.
- `arena_game_state`: session ID, board snapshot, private notes snapshot, revision and update time; reuse existing game-state storage if safe.

Store only data required for the pilot. Salt guest-key hashes. Avoid retaining raw IP addresses beyond transient rate-limit needs. Default event/session retention is 30 days, subject to existing privacy/legal policy. Add a short cookie/privacy notice to the join page. Do not claim anonymous cookies guarantee one vote per human.

## 7. API contract

Routes below are **proposed contract**, not claims about existing endpoints. Adapt naming to repository conventions. All mutating requests must be authorized and version-aware. The move request must distinguish value entry/clear from `set_note`/`clear_note`; note operations are host-only and must be revision-checked. No Notes hides note entry/rendering without deleting stored notes, and expiry/reload restores them.

| Method | Route | Caller | Purpose |
|---|---|---|---|
| `POST` | `/api/arena/sessions` | Host | Create session |
| `GET` | `/api/arena/sessions/{id}` | Public | Safe public snapshot |
| `GET` | `/api/arena/sessions/{id}/host` | Authenticated host | Host-only state, notes, private revision |
| `POST` | `/api/arena/sessions/{id}/preset-vote/open` | Host | Open preset ballot |
| `POST` | `/api/arena/sessions/{id}/votes` | Guest | Cast/change vote |
| `POST` | `/api/arena/sessions/{id}/start` | Host | Resolve preset, lock puzzle, start clock |
| `POST` | `/api/arena/sessions/{id}/moves` | Host | Apply a value move or note operation (`set_note`/`clear_note`) with expected revision |
| `POST` | `/api/arena/sessions/{id}/pause` | Host | Technical pause |
| `POST` | `/api/arena/sessions/{id}/resume` | Host | Resume |
| `POST` | `/api/arena/sessions/{id}/cancel` | Host/operator | Cancel with no winner |
| `POST` | `/api/arena/sessions/{id}/rematch` | Host | Create linked new session |
| `GET` | `/api/arena/sessions/{id}/events?after={seq}` | Public | Sanitized events or stream |
| `GET` | `/api/arena/sessions/{id}/overlay` | Public | Read-only overlay |

Guest vote responses may include `myVote`, `totalVotesCast`, and `canChangeUntil` only for the current guest cookie. Guest-specific responses use `Cache-Control: private, no-store`. Public and overlay snapshots contain only public-safe data and may use version/ETag caching. The overlay must not embed host tokens or credentials.

### 7.1 Command and error semantics
- Host commands: `Idempotency-Key` and `expectedVersion`. Same key within the session lifetime returns the original response/result; a different key with a stale version returns `409 STALE_VERSION`.
- Moves: `expectedRevision`; same `Idempotency-Key` within the session lifetime returns the original response/result; a different key with a stale revision returns `409 STALE_REVISION`. Stale moves must not overwrite newer board state.
- Votes: `Idempotency-Key`; atomic upsert by ballot and salted guest key; optional ballot version check if supported by the existing model.
- Pause and cancel require confirmation in the UI.
- Distinct machine-readable error codes include `BALLOT_CLOSED`, `PAUSED`, `STALE_REVISION`, `STALE_VERSION`, `INVALID_TRANSITION`, `RATE_LIMITED`, `ORIGIN_REJECTED`, `SESSION_TERMINAL`, and `NOT_AUTHORIZED`.
- Use HTTP `409 Conflict` for state/revision conflicts, `429 Too Many Requests` for rate limits, and `403 Forbidden` for rejected Origin checks where appropriate. Do not force every error into HTTP 409.
- Host mutations require existing Orbace authentication and CSRF protection. Guest mutations require a secure first-party SameSite cookie, Origin validation, and rate limits. Validate authorization on every session-scoped operation.

### 7.2 Snapshot separation
- **Public/guest-safe:** session status, phase, preset, givens, entered digits, public timer/deadlines, ballot status and allowed public counts, active modifier, result.
- **Guest-specific:** only the current guest's `myVote` and voting eligibility in addition to public-safe data.
- **Host-only:** private notes, host board revision, validation feedback, and host controls.
- **Overlay:** read-only, minimal display state; no notes, solution, guest identifiers, host token, or secret references.

Never return solution values, candidate notes, private solution references, or raw guest keys from public, guest, event, or overlay endpoints.

## 8. Voting, abuse controls and late joins

- Guest vote limit: 10 requests/minute per IP and per guest cookie, adjusted to existing platform conventions. Host mutations are limited to 30 commands/minute/session. A `429` response includes `Retry-After` where supported and a concise UI message; the client does not auto-retry before that interval.
- Origin validation and secure SameSite cookie protections apply to guest mutations.
- Duplicate vote updates the same guest's choice while ballot is open; last valid choice wins.
- During an open `PRESET_VOTE`, a newly joined guest may vote. After it closes, late joiners see the winning preset and current session state but cannot vote on that ballot.
- Strike ballot open: late joiners may vote before close. After close, they see the outcome.
- No free-text viewer inputs. Do not claim strong Sybil resistance; this is an unranked casual pilot.
- Do not persist raw IPs in the event log or application telemetry. Keep only what is required for transient throttling.

## 9. Host, audience and OBS UX

### Host
- Create panel shows preset pool/default, join URL/QR, and exact overlay preview.
- Preset voting shows countdown, guest/crowd count, total votes cast, and tie rule; choice breakdown appears at close.
- Start is the primary action after preset resolution.
- Playing HUD shows large timer, phase, strike trigger/countdown, modifier status, and one technical-pause control.
- Use non-blocking notices during play; do not obscure the puzzle.
- Pause/cancel confirmations prevent accidental disruption. If a session remains in `CREATED`, `READY`, or `PRESET_VOTE` with no state change for 30 minutes, cancel it with no winner and log the sanitized reason; provide the host a clear stale-session message.
- Result shows winner/deciding cause, preset, strike outcome and **Run it back** action. Use explicit outcomes such as “Host wins — solved before the deadline,” “Audience wins — time expired,” or “Round cancelled — no winner.”

### Audience
- “You're in the crowd. No account needed.”
- During preset voting: “Vote counted. You can change until 0:07.”
- After close: reveal the preset and aggregate breakdown.
- During play: show current phase and, if available, approximate crowd count. Do not imply that browser identifiers equal unique people.
- Strike options: “Activate No Notes (20s)” and “Spare the Streamer.” State “Spare wins ties; zero votes = Spare.”
- Effect state: “No Notes active — 0:20” or “Crowd spared the streamer.” Show the active modifier's remaining time on the host HUD and overlay. For fallback, show the actual penalty applied.
- Result clearly says “Host wins — solved before the deadline” or “Audience wins — time expired,” with rematch link.

### OBS overlay
- Read-only browser source; puzzle remains unobscured.
- Display session title, timer, phase, join URL/QR, voting status, strike outcome, active modifier, pause state and result.
- Show “Paused — technical” and clearly label the time-penalty variant if used. Keep the active modifier's remaining time visible; test QR and join-URL legibility at 1280×720.
- Recover from reload by fetching the current server snapshot; never reconstruct authoritative remaining time locally.
- Preview the exact overlay in the host UI.
- Human/streamer owns OBS configuration and broadcasting. Test at 1920×1080 and 1280×720. OBS setup must not block core application development.

### Accessibility
Keyboard-operable controls, large tap targets, non-color-only state, live-region announcements for phase changes, mobile viewport support, and reduced-motion support.

## 10. Feature flag and operator runbook

- `ARENA_ENABLED=false` by default. Disabled means no new Arena sessions.
- Existing active sessions may finish unless the operator explicitly revokes/cancels them.
- Operator revocation/cancellation produces a no-winner result, records a sanitized `SESSION_CANCELLED_BY_OPERATOR` event, and is visible consistently to host, guests and overlay. Record operator identity internally for audit, never in public snapshots/events.
- Provide a documented operator path using the existing admin mechanism or a reviewed manual procedure. Do not create an unauthenticated administrative endpoint.
- Activate only for the allowlisted pilot host after smoke tests.
- Reuse the existing secret manager and deployment configuration. Never put stream keys, database URLs, OAuth secrets, deployment tokens, or auth signing secrets into prompts, issues, public chat, or committed `.env` files. `.env.example` contains placeholders only.

Example configuration (illustrative; adapt to existing config conventions). `ARENA_MODIFIER_MODE` must be exactly `no_notes` or `time_penalty`; reject an invalid value and execute only the selected mode. The other mode's numeric setting may remain as an unused default but must not be activated in the same round. Record the active mode in sanitized telemetry. The two modifier variants must use separate test fixtures, not be mixed in one end-to-end pilot run:

```dotenv
ARENA_ENABLED=false
ARENA_ALLOWED_HOST_IDS=host-id-1
ARENA_MAX_ACTIVE_SESSIONS_PER_HOST=1
ARENA_MAX_GUESTS_TARGET=50
ARENA_PRESET_VOTE_SECONDS=20
ARENA_STRIKE_VOTE_SECONDS=15
ARENA_STRIKE_TRIGGER_PERCENT=30
ARENA_MODIFIER_MODE=no_notes # allowed: no_notes | time_penalty; choose exactly one for the pilot
ARENA_NOTES_HIDE_SECONDS=20
ARENA_FALLBACK_TIME_PENALTY_SECONDS=10
ARENA_MIN_TIME_AFTER_PENALTY_SECONDS=30
ARENA_GUEST_VOTE_RATE_LIMIT_PER_MIN=10
ARENA_HOST_COMMAND_RATE_LIMIT_PER_MIN=30
ARENA_IDLE_SESSION_TTL_MINUTES=30
ARENA_IDEMPOTENCY_RETENTION=session_lifetime
ARENA_EVENT_RETENTION_DAYS=30
ARENA_PUBLIC_BASE_URL=https://orbacesudoku.com
# Reuse existing DATABASE_URL, auth, logging, and deployment secret mechanisms.
```

## 11. Rematch and show continuity

- A rematch always creates a new session and a new puzzle/ballots; it does not reset or mutate the finished session.
- Store `prior_session_id`. A lightweight `series_id` and host-versus-crowd series score are optional and **deferred by default**; implement only if essentially free after core acceptance tests pass.
- Reuse the guest cookie across sessions.
- Prefer stable per-host join and overlay URLs that resolve to the current active session **only if existing routing makes this safe and inexpensive**. Otherwise return the new join and overlay URLs with copy buttons and a clear “update OBS overlay” instruction.
- Old session results and event logs remain read-only until retention expiry.

## 12. Day 0–3 execution plan and gates

### Day 0 — environment and feasibility (must pass before Day 1)
- Inspect repository instructions, Git state, existing app/runtime, database/migrations, auth, Sudoku board/solution validation, `/challenge`, Su-Pu, deployment and tests.
- Produce a reuse/gap matrix and exact local build/test commands.
- Confirm the local app runs and migrations can be applied safely.
- Prove board integration and server-side solution validation; confirm the full private solution/private validation oracle is available; decide `ARENA_MODIFIER_MODE` (`no_notes` or `time_penalty`) and verify the chosen mode only. Confirm the existing puzzle engine can supply the Easy/Medium/Hard difficulty pools and rematch selects a fresh puzzle.
- Confirm feature-flag/allowlist pattern and staging path.
- Confirm OBS machine/streamer availability and whether stable URLs are feasible.
- No new accounts, infrastructure, external credentials, or production activation are required for this gate.

**Gate:** no implementation plan may claim a verified competitive round until server-authoritative solution checking and deadline behavior are feasible.

### Day 1 — lifecycle and voting
- Implement session lifecycle, state advancement, preset voting, deterministic tally, auth, guest cookie, rate limits, idempotency semantics, stale-session TTL, error contracts, and event ordering.
- Test 1 host + 3 independent browsers, vote changes, late/duplicate votes, tie/no-vote behavior, and concurrency.
- Feature flag remains OFF outside controlled tests.

### Day 2 — gameplay and overlay
- Integrate the existing board, authoritative timer, pause/resume during preset voting and play, strike ballot, the single selected modifier mode, notes operations where applicable, public/host/guest snapshots, and overlay.
- Test solve during strike, pause before trigger/during ballot/during modifier, modifier data preservation, refresh recovery, and 1080p/720p overlay rendering.

### Day 3 — end-to-end and regression
- Complete result/rematch/cancel/timeout behavior, sanitized event log, basic metrics, and smoke test toward 50 guests if feasible.
- Run two complete rounds and test deadline boundaries, duplicate host commands, authorization, Origin/CSRF, rate limits, late joiners, and feature-flag OFF behavior.
- Run regression tests for `/challenge`, Reddit Help to Solve, Su-Pu capture/replay, and official scoring.
- Conduct staging rehearsal before considering any production activation.

The three-day estimate starts only after infrastructure readiness and is conditional on the Day 0 gate. If a gate fails, report the blocker and propose the smallest safe fallback; do not quietly relax acceptance criteria.

## 13. Locked acceptance criteria

MVP is accepted only when all applicable criteria pass:

1. One host and three independent browsers complete two consecutive rounds.
2. Guests can participate without Orbace/Twitch accounts; vote changes and cutoffs behave correctly.
3. The server—not the browser—determines the result against a private authoritative solution.
4. Deadline boundary behavior is documented and tested; a qualifying pre-deadline move is not rejected solely because processing crosses the deadline.
5. Solve during strike voids the ballot; timeout/cancel also void any open ballot.
6. Pause freezes game time, ballot deadlines, strike-trigger progress and active modifier time consistently.
7. Public, guest, host, overlay and event payloads pass leakage tests for solutions, private notes, guest identifiers, raw IPs and secrets.
8. Host commands are authorized, version-aware and idempotent; concurrent/stale commands cannot create invalid transitions.
9. Origin/CSRF checks and rate limits are tested; appropriate status codes and machine-readable error codes are returned.
10. No Notes preserves note data across effect expiry and reload, or the fallback is clearly labeled in UI and telemetry.
11. Overlay reload/reconnect uses authoritative server state and displays correct remaining time.
12. Rematch creates a linked new session; guest cookie continuity works; stable URLs work if included, otherwise new URLs are clearly provided.
13. Feature flag OFF blocks new sessions; active-session and operator-revoke behavior follows the runbook.
14. Existing `/challenge`, Reddit Help to Solve, Su-Pu capture/replay and official scoring show no regressions.
15. Voting/state updates converge within one polling interval plus normal processing under the pilot target; if polling is configured at 2–3 seconds, do not claim a hard 3-second worst-case bound. 50 guests is a smoke-test target, not a capacity guarantee.
16. The operator can cancel a session with no winner, and the result is consistent in host, guest and overlay views; the sanitized operator-cancel event is recorded and operator identity remains internal.
17. Pausing during `PRESET_VOTE` freezes ballot time; moves during `PAUSED` are rejected as `409 PAUSED`.
18. Same idempotency key returns the original result; a different key with stale revision/version is rejected deterministically. Host command rate limit and `429` behavior are testable, including `Retry-After` where supported and a clear UI message.
19. The chosen modifier mode is explicit and used consistently for the entire pilot; the test matrix does not mix modifier modes within a single end-to-end run.

Optional series scoring, multiple overlay modes, SSE, elaborate animations, advanced dashboards, and full replay are not acceptance requirements.

## 14. Risks and fallbacks

| Risk | Required response |
|---|---|
| Existing game UI is coupled to official competition | Use an isolated Arena adapter; never submit Arena results to official ranking/competition flows. |
| No Notes requires invasive refactoring | Use the specified time-penalty fallback and label it. |
| Server-authoritative solution validation is not feasible | Use an Arena-native minimal board only if it meets all security/correctness gates; otherwise explicitly label demo as unverified. |
| Hosting does not support SSE | Use versioned polling every 2–3 seconds. |
| Anonymous vote manipulation | Secure guest cookie, per-IP/per-cookie rate limits, unranked framing; no claims of one-human-one-vote. |
| Twitch setup delays | Test through the Orbace web link and OBS local recording; no Twitch API dependency. |
| Stable URLs are not cheap | Return new URLs and provide copy/update instructions. |
| Schedule slips | Cut polish and optional series score first; do not cut authorization, state correctness, privacy, or regression tests. |

## 15. Repository audit and Codex kickoff instruction

> Inspect the existing Orbace Sudoku web/backend repositories before coding. First report the current Git state, app stack, build/test/migration commands, and a reuse/gap matrix covering the Sudoku board/engine, `/challenge`, Reddit Help to Solve, Su-Pu capture/replay, authentication, persistence, timers, deployment, and regression tests.
>
> Then implement only the locked Challenge Show Lite MVP in this document. Reuse the existing stack and deployment. Keep Arena behind a feature flag defaulting to OFF. Implement server-authoritative state and solution validation, the transactional state-advance mechanism, preset and strike ballots, host/guest/public/overlay separation, pause/cancel, results/rematch, sanitized events, and the required tests.
>
> Do not modify official rankings, Reddit Help to Solve semantics, Su-Pu behavior, or competition scoring. Do not add Twitch API/OAuth/EventSub, new cloud accounts, Redis, queues, microservices, or other infrastructure unless repository evidence proves it necessary and the owner approves.
>
> Report Day 0 blockers immediately, especially board integration, private solution validation, deadline-race guarantees, and No Notes feasibility. Do not deploy, push, enable the production feature flag, or change secrets without explicit authorization. Preserve uncommitted work.

## 16. Account and infrastructure requirements

Required for the pilot: access to the existing repository, existing Orbace runtime/database/auth, a staging or safe test environment, a pilot host identity, and an available OBS machine for the overlay rehearsal. Use the existing deployment and secret-management mechanisms.

**Not required for the MVP:** Twitch Developer Console registration, Twitch OAuth credentials, EventSub, chat bot, YouTube/Discord/Reddit developer apps, new cloud accounts, or a new service/database. Set up those only if a future approved feature actually needs them.

Cookie scope/name and first-party domain must follow existing Orbace conventions; state the scope in the join-page privacy notice. Confirm the 30-day retention default against the existing privacy policy before production activation.

References:
- Twitch app registration (future integration only): https://dev.twitch.tv/docs/authentication/register-app/
- Twitch authentication (future integration only): https://dev.twitch.tv/docs/authentication/
- Twitch EventSub (future integration only): https://dev.twitch.tv/docs/eventsub/
- OBS Browser Source: https://obsproject.com/kb/browser-source
