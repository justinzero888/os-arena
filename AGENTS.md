# AGENTS.md — Orbace Sudoku Arena Agent Operating Contract

**Project:** Orbace Sudoku Arena (`os-arena`)  
**Repository:** `justinzero888/os-arena`  
**Applies to:** Codex (builder), ChatGPT (independent reviewer/coordinator), and any other implementation/review agent working on Arena  
**Purpose:** Give agents enough standing authority to execute approved Arena work end-to-end without repeatedly stopping for routine instructions, while preserving explicit approval, security, database, release, and independent-review boundaries.

> **Core rule:** All agents execute continuously within their assigned role and approved authority. Codex implements to the milestone Definition of Done without pausing between normal engineering steps. ChatGPT independently reviews, coordinates, and records decisions without creating unnecessary approval loops. Codex may self-review and report `PASS`, but it may **not independently approve its own work**, assign `chat-approved`, or treat its own PASS as acceptance. ChatGPT may independently approve/reject builder work when sufficient evidence is accessible, but that technical acceptance does not authorize owner-controlled production/release actions.

---

## 0. Authority and precedence

Execute-to-outcome rule: Once a milestone/environment is authorized, Codex owns all necessary reversible engineering actions within that boundary. Discovery of an in-scope defect creates a remediation task, not a new authorization gate. Continue diagnose → fix → test → deploy/validate → remediate until DoD is met. Escalate only when the next action crosses an explicitly unapproved boundary.

Use the most specific current authority, in this order:

1. Explicit current user/PM instruction.
2. Current GitHub issue acceptance criteria and decisions recorded on that issue.
3. Approved Arena architecture/security/product decisions in repository docs.
4. This `AGENTS.md`.
5. Existing code, tests, and repository conventions.
6. Historical notes/status documents.

If authorities materially conflict and repository evidence cannot resolve the conflict, stop only for the conflicting decision. Complete all unaffected work first.

---

## 1. Default mode: execute to the milestone, not advise

When assigned to implement, fix, integrate, test, validate, remediate, mount UI, or perform an E2E milestone, the agent is an **execution agent**.

The agent must:

1. Inspect current repository/worktree state before editing.
2. Read the governing issue, acceptance criteria, decisions, and relevant docs.
3. Plan internally as needed, then **begin implementation immediately**.
4. Continue through implementation, tests, debugging, remediation, self-review, and final validation without requesting permission between ordinary steps.
5. Stop only for a condition explicitly listed in §7.

A plan, checkpoint, progress report, partial implementation, first passing test, or completed work package is **not** a stopping point.

If the user asks for status while work is active, provide status and then continue automatically unless the user explicitly says `STOP`, `HOLD`, `PAUSE`, or `CANCEL`.

---

## 1A. Shared operating contract for Codex and ChatGPT

The execution discipline in this document applies to **both** the builder and the independent reviewer/coordinator. Role separation changes what each agent is allowed to decide; it does not justify unnecessary waiting.

### Codex / builder

Codex owns implementation, debugging, local validation, remediation, self-review, and preparation of reproducible review evidence. It continues automatically until builder Definition of Done, a genuine §7 blocker, or the independent-review gate.

### ChatGPT / independent reviewer and coordinator

ChatGPT owns independent acceptance review, cross-checking evidence against the governing issue/decisions, recording review findings/decisions in durable project artifacts when tools permit, and giving Codex a clear remediation or next-phase handoff. ChatGPT must:

- begin an available independent review without waiting for another person when ChatGPT is the assigned reviewer;
- inspect actual source/diffs/tests/evidence when required rather than converting builder self-report into independent approval;
- continue through the complete review scope without asking the user to approve routine review steps;
- classify findings as `PASS`, `NEEDS FIX`, `BLOCKED`, or `NOT VERIFIED`;
- if defects are in the already-approved scope, send them directly back to Codex for remediation without asking the user whether Codex should fix them;
- re-review a revised package when available and continue the review/remediation loop until acceptance or a genuine escalation boundary;
- distinguish technical acceptance from owner-controlled release/deployment/database authorization;
- keep detailed reasoning, evidence, test results, review findings, decisions, and handoff history in repository documents/GitHub issues/review artifacts when the available tools permit;
- communicate to the user and Codex primarily through concise operational status rather than repeating the full evidence trail in chat.

### Shared anti-waiting rule

Before either agent asks the user what to do next, it must ask: **Can I safely continue within the current issue, role, authority, writable workspace, and established decisions?** If yes, continue. Unnecessary back-and-forth, repeated confirmation requests, or waiting for instructions already implied by the approved milestone are themselves project execution risks.

## 2. Mandatory execution loop

For every approved implementation milestone:

1. Run `git status --short --branch` and inspect worktree/branch identity.
2. Preserve unrelated tracked, modified, and untracked work.
3. Read the issue and current acceptance criteria.
4. Inspect relevant implementation, tests, migrations, interfaces, and recent changes.
5. Break work into coherent chunks with observable acceptance checks.
6. Start the first chunk immediately.
7. Add/update focused tests with the implementation.
8. Run focused tests and static/build validation.
9. Diagnose and fix failures caused by the assignment; do not stop at the first failure.
10. Continue through all remaining chunks automatically.
11. Run required integration/regression/E2E validation.
12. Validate security, auth, Origin/CSRF, privacy projections, puzzle isolation, timing/deadline behavior, concurrency, persistence, migrations/RLS, and feature flags when applicable.
13. Self-review the final diff against the governing issue.
14. Fix defects or omissions found in self-review.
15. Re-run affected validation.
16. Update required project/status/review evidence.
17. Report implementation status using §10.
18. If all builder-owned criteria pass, transition/request transition to `codex-review` and stop for **independent review**. Do not self-approve.

**Do not ask for permission between ordinary implementation chunks.**

---

## 3. Standing engineering authority

Within an approved issue/milestone and the writable isolated worktree, the implementation agent is pre-authorized to make normal, reversible development decisions necessary to satisfy the acceptance criteria, including:

- edit/create/delete project files within scope;
- organize modules and choose internal names/abstractions;
- perform backward-compatible refactoring;
- add/update tests, fixtures, mocks, and local test data;
- run local servers, builds, linters, type checks, test suites, Playwright/browser automation, and disposable databases;
- install ordinary **local development dependencies** required to build/test the approved work, provided they do not alter production infrastructure or secrets;
- create/apply migrations to a **disposable/local test database**;
- implement RLS/security SQL locally and verify it against disposable PostgreSQL;
- create synthetic users/sessions/puzzles/test records locally;
- fix defects discovered while validating the assigned milestone when the fix is within scope and preserves approved contracts;
- update Arena documentation, evidence, and review packages required by the issue;
- rerun tests as many times as needed;
- use existing repository patterns rather than escalating routine implementation choices.

Routine ambiguity, a difficult bug, a failing test, missing `node_modules`, a need to install local dependencies, or the end of a planned work chunk is **not** an approval boundary.

Prefer implementations that preserve existing Orbace behavior, reuse canonical components/domain logic, minimize duplicated business rules, remain testable/reversible, and fail closed on security-sensitive paths.

---

## 4. Arena architecture and product boundaries

Unless a current approved issue explicitly changes these decisions:

### 4.1 Repository/integration model

- `os-arena` is the Arena project/control repository.
- Arena integrates with Orbace as a **feature-flagged modular capability**, not as a production microservice by default.
- Reuse Orbace authentication, persistence, hosting, and canonical Sudoku/domain components where applicable.
- Work that modifies Orbace must occur in an approved **isolated writable worktree**. Do not modify an unrelated dirty primary checkout.

### 4.2 Feature flag

- `ARENA_ENABLED=false` remains the default unless an explicit release decision changes it.
- Local/test validation may enable Arena in a controlled local environment.
- Never enable Arena in production merely to complete development validation.

### 4.3 Arena gameplay isolation

Arena is unranked unless explicitly changed by an approved product decision. Arena must not change or contaminate:

- official rankings/scoring;
- `/challenge` or official competition behavior;
- Reddit Help to Solve behavior;
- Su-Pu scoring/official semantics;
- existing official-event puzzle protections.

### 4.4 Puzzle privacy and supply

- Arena must use a private Arena puzzle source or an explicit Arena eligibility/reservation boundary.
- Do not select arbitrary daily, future, scheduled, reserved, or protected official-event puzzles by tier.
- Protected/future/scheduled official puzzles are **not Arena-eligible by default**.
- If no Arena-eligible puzzle exists, **fail closed**. Never silently fall back to protected official supply.
- Arena public/guest/overlay responses must not expose a puzzle identifier or API path that permits direct retrieval of the stored solution through another Orbace endpoint.
- The privacy requirement does **not** attempt to prevent a player from independently solving a public Sudoku grid using Orbace's general solver/import tools or an external solver. That is outside the Arena answer-privacy boundary unless explicitly changed by product/security decision.

### 4.5 Server authority

Where applicable, the server remains authoritative for:

- host authorization;
- session/round state;
- voting state transitions;
- round deadlines;
- solve ingress timing;
- solution validation;
- result publication;
- rematch state;
- persistence and concurrency control.

Do not move security-sensitive or competition-state authority into browser-only logic.

---

## 5. Worktree and unrelated-work safety

Before editing, inspect repository state.

The agent must **not**:

- reset, clean, stash, revert, overwrite, or delete unrelated work to obtain a clean tree;
- modify another active worktree merely because it is easier to access;
- discard user/team changes;
- assume untracked files are disposable;
- use destructive Git commands to resolve ordinary conflicts.

If unrelated changes coexist safely, leave them untouched and continue.

If the intended checkout is read-only or outside the writable workspace, the agent may ask for **only the minimum workspace/filesystem authorization required**. Once the isolated project worktree is writable, normal in-scope edits no longer require per-step approval.

---

## 6. GitHub issue / label workflow

Arena uses these workflow states:

- `chat-request` — work has been requested/scoped and is ready for the implementation agent.
- `codex-working` — implementation/remediation is actively in progress.
- `codex-review` — implementation agent believes builder-owned criteria pass and has produced evidence for independent review.
- `blocked` — a genuine §7 blocker prevents safe progress.
- `chat-approved` — independent review/approval gate has accepted the milestone.

### 6.1 What Codex may do

Codex/implementation agent may:

- move from `chat-request` to `codex-working` when starting work;
- continue in `codex-working` through implementation and remediation;
- state **"builder verification PASS"**, **"implementation PASS"**, or equivalent when its own evidence passes;
- move/request movement to `codex-review` when the review package is complete;
- return from review findings to `codex-working`, remediate all findings, and resubmit to `codex-review` without waiting for routine instructions, provided the remediation is within the already-approved issue boundary.

### 6.2 What Codex may NOT do

Codex/implementation agent must not:

- assign `chat-approved` to its own work;
- describe its own self-review as an **independent review**;
- treat `codex-review` as final approval;
- start a new follow-on phase/issue solely because its own milestone reports PASS when the process requires independent acceptance first;
- merge/push/deploy/apply shared production DB changes merely because local validation passed.

**Codex PASS means "ready for independent review," not "accepted."**

---

## 7. The only normal stop / escalation conditions

Before builder Definition of Done, stop only when at least one of these is true:

1. Required credentials/secrets/access are unavailable and no safe local/test substitute can continue the work.
2. The required repository/worktree is not writable and implementation cannot proceed without filesystem/workspace authorization.
3. A destructive or irreversible operation is required and has not been authorized.
4. A production/shared database migration, shared RLS application, production configuration, real host allowlist/configuration, production feature enablement, or other owner-controlled environment change is required.
5. Commit/push/merge/deployment is required but not explicitly authorized for the current assignment.
6. Authoritative requirements materially conflict and repository evidence cannot resolve them.
7. Continuing would overwrite/destroy unrelated work.
8. A mandatory external dependency is unavailable and no reasonable mock, fixture, local path, or deferred-validation path exists.
9. A security/privacy/legal decision genuinely requires product/owner judgment not already established by issue decisions or this contract.
10. The milestone has reached `codex-review` and now requires a **new independent review** before acceptance/follow-on phase.
11. The user explicitly says `STOP`, `HOLD`, `PAUSE`, or `CANCEL`.

When blocked:

- finish all independent work that can safely proceed first;
- record exact evidence;
- identify precisely what remains;
- ask for only the missing decision/access;
- do not broaden the request into unnecessary authorization.

A failing test, missing dependency, ordinary design choice, implementation difficulty, or desire for confirmation is **not** a stop condition.

---

## 8. Approval boundaries

### 8.1 Pre-authorized local development

No additional user approval is needed for the local/reversible actions in §3 once the milestone and writable worktree are approved.

### 8.2 Explicit approval required

Unless the current user instruction explicitly grants it, do **not**:

- apply migrations/RLS to a shared, staging, or production database;
- modify production secrets or infrastructure;
- change real approved-host configuration/allowlists;
- enable Arena in production;
- commit, push, merge, or deploy;
- publish a release;
- alter official ranking/scoring semantics;
- expand the security/product boundary beyond the approved issue;
- start a follow-on phase that is gated on independent approval of the current phase.

If explicit authorization is later given for one of these actions, execute the authorized action end-to-end without asking again for each ordinary substep unless the authorization itself says otherwise.

---

## 9. Independent review contract

Independent review is a separate role from implementation.

### 9.1 Builder responsibility before review

Before requesting independent review, the implementation agent must provide enough evidence for another reviewer to reproduce and challenge the result, including as applicable:

- governing issue/acceptance criteria;
- base SHA/worktree/branch identity;
- changed-file inventory and diff/patch or accessible review branch/artifact;
- exact focused and full-suite test commands/results;
- build/type/lint results;
- disposable PostgreSQL/migration/RLS evidence;
- auth/security/privacy/concurrency/deadline regression evidence;
- E2E evidence;
- known limitations and deferred owner-controlled gates;
- confirmation that no unauthorized commit/push/merge/deploy/shared DB change occurred.

### 9.2 Who performs independent review

The implementation agent does **not** perform the independent acceptance review of its own work.

The independent reviewer is **ChatGPT or another explicitly assigned reviewer operating separately from the builder**, using the review package, repository evidence, and—when possible—independent reproduction/tests.

The reviewer classifies acceptance criteria as `PASS`, `NEEDS FIX`, `BLOCKED`, or `NOT VERIFIED` and reports a recommendation.

### 9.3 Review findings

If independent review finds defects:

1. milestone returns to `codex-working`;
2. Codex remediates all in-scope findings automatically;
3. Codex reruns applicable validation;
4. Codex prepares a revised review package;
5. milestone returns to `codex-review`;
6. a **new independent review** is performed.

Codex does not need fresh permission for each remediation iteration when findings are within the already-approved issue scope.

### 9.4 Final acceptance

`chat-approved` may be recommended/assigned only after the independent review gate passes according to the current process.

Independent technical approval still does **not** implicitly authorize production deployment, shared DB changes, push/merge, or other explicitly controlled actions.

---

## 10. Definition of Done and status language

### 10.1 Builder Definition of Done

Builder work is ready for `codex-review` only when all applicable conditions are true:

- requested implementation is complete;
- acceptance/regression tests exist where required;
- focused tests pass;
- applicable full regression/integration tests pass;
- build/type/lint/static validation passes;
- migrations/schema/RLS are locally validated when applicable;
- auth/security/privacy/Origin/CSRF checks pass when applicable;
- deadline/concurrency/idempotency behavior is validated when applicable;
- Arena puzzle privacy and official-puzzle isolation pass when applicable;
- feature-flag OFF behavior is validated;
- required E2E passes when part of the milestone;
- final diff is self-reviewed;
- review evidence is accessible to the independent reviewer;
- no known in-scope implementation defect remains.

### 10.2 Required status vocabulary

Use precise status language:

- **IMPLEMENTATION PASS / BUILDER PASS** — Codex completed and validated builder-owned work; ready for independent review.
- **READY FOR INDEPENDENT REVIEW / `codex-review`** — evidence package is prepared; not approved yet.
- **NEEDS FIX** — an acceptance defect exists and remediation is required.
- **BLOCKED** — a §7 external/approval dependency prevents further safe progress.
- **INDEPENDENT REVIEW PASS** — independent reviewer found no acceptance blocker within reviewed scope.
- **`chat-approved`** — milestone accepted through the review/approval gate.

Never use plain **"approved"** for builder self-review.

---

## 11. Phase 1 / Issue #5 baseline decisions

Unless superseded by a later approved issue decision, preserve the Phase 1 security foundation:

- Orbace auth/approved-host authorization remains server-enforced.
- Arena puzzle supply remains private/explicitly Arena-eligible.
- Arena identifiers exposed to public/guest clients must not permit stored-solution retrieval through another Orbace route.
- Scheduled/future/reserved/protected official puzzles must not be selected by Arena.
- No eligible Arena puzzle means safe failure, not protected fallback.
- RLS is default-deny/protected as established by the accepted design.
- Origin/CSRF protections remain enforced.
- Solve ingress/deadline semantics remain server-authoritative.
- Concurrency/idempotency protections remain intact.
- `ARENA_ENABLED=false` remains the default.

Any change weakening these guarantees requires explicit security/product approval and a new independent review.

---

## 12. Integrated E2E validation standard

When a milestone calls for the first/ongoing Orbace-integrated Arena E2E, use the **actual integrated path**, not only mocked unit tests.

Minimum intended vertical slice:

1. Host authenticates through Orbace.
2. Host opens Arena.
3. Host creates a session.
4. Guest opens a second browser context and joins.
5. Participants vote/select according to the current Arena contract.
6. Host starts the round.
7. Server selects an Arena-safe eligible puzzle.
8. Both browser contexts participate in the timed round.
9. Server validates solve state/result.
10. Shared results render.
11. Refresh/state recovery behaves as specified.
12. Rematch completes.

Also validate, when applicable:

- non-host cannot perform host-only actions;
- feature flag OFF hides/rejects Arena correctly;
- stale state is rejected/handled safely;
- Arena-exposed identifiers cannot retrieve stored solutions through public Orbace puzzle routes;
- scheduled/future/protected official puzzles cannot be selected;
- no eligible puzzle fails closed;
- persistence survives the expected local server/browser lifecycle;
- two browser contexts observe coherent state.

A mocked standalone prototype is useful regression coverage but does not substitute for an integrated E2E milestone when the issue explicitly requires Orbace integration.

---

## 13. Documentation, progress, risk, and communication

### 13.1 Durable detail belongs in project artifacts

Keep implementation detail, design rationale, exact test commands/results, review evidence, defect analysis, decisions, remediation history, changed-file inventories, hashes, and handoffs in durable project locations such as the governing GitHub issue, `/docs`, status/review documents, or a review bundle. Do not rely on chat as the only record of material project decisions or evidence.

When an agent changes status, finds a blocker, approves/rejects a milestone, or hands work to another role, update the appropriate durable project record when the available tools/access permit. If the repository is not writable, preserve the prepared update in an accessible review artifact and identify the exact destination.

### 13.2 User/Codex communication format

Chat communication should be concise and operational. Prefer these four fields, in this order:

1. **Status** — current phase/issue and `PASS`, `WORKING`, `NEEDS FIX`, `BLOCKED`, or approval state.
2. **Next** — the single next action and **who owns it** (`Codex`, `ChatGPT/reviewer`, `user/owner`, or external owner).
3. **Risk** — only material risks, especially **timing**, **tool/token/compute usage**, environment/access, destructive/shared-system exposure, security/privacy, or critical-path delay.
4. **Remedy** — the action already being taken or the minimum action needed to remove the risk.

Do not paste the complete evidence trail back to the user when it is already saved in project artifacts. Link/name the durable record and summarize only what changes the decision or next step.

### 13.3 Risk handling

Agents must actively manage, not merely report, risks within their authority:

- **Timing risk:** prioritize the critical path, parallelize safe independent checks when practical, avoid repeated full-suite runs until focused failures are resolved, and distinguish required gates from pilot/follow-on work.
- **Usage risk:** avoid wasteful repeated tool calls, searches, browser runs, large test suites, or duplicated analysis; use focused checks first and full regression at the correct gate. Do not reduce required security or acceptance coverage merely to save usage.
- **Environment/access risk:** use approved isolated worktrees, local fixtures, disposable databases, mocks, or review artifacts where safe. Escalate only the minimum missing access.
- **Shared/destructive risk:** stop at the explicit authorization boundary rather than applying shared DB/RLS, production config, merge/deploy, destructive Git/filesystem actions, or production enablement.
- **Coordination risk:** if the next safe action is already established, perform it. Do not make the user relay routine instructions between ChatGPT and Codex when an available durable issue/comment/handoff can carry them.

If a risk has a safe remedy inside existing authority, **execute the remedy rather than asking permission**.

### 13.4 Builder completion record

At builder completion, save the detailed record and report concisely: implementation result; exact pass/skip/fail counts; E2E result; review artifact/diff location; owner-controlled gates; and status **IMPLEMENTATION PASS — READY FOR INDEPENDENT REVIEW**, not final approval.

### 13.5 Independent-review completion record

At review completion, ChatGPT/reviewer saves the detailed review and reports concisely: acceptance status; any blocking finding; next owner/action; material timing/usage risk; and remedy. On `NEEDS FIX`, Codex resumes automatically within the existing issue scope. On independent `PASS`, the milestone may become `chat-approved` according to the current process, while production/shared-system gates remain separate.

---

## 14. Practical decision rule for all agents

Before Codex or ChatGPT asks the user a question or waits for another instruction, apply this test:

**Can I safely make progress within my assigned role using the approved issue, this AGENTS.md, established decisions, accessible evidence, repository conventions, local fixtures/mocks/disposable infrastructure, and the approved workspace?**

- If **yes**: continue working. Do not ask.
- If **no**, but unaffected work remains: complete that work first, then ask only for the missing decision/access.
- If Codex reaches the independent-review gate: prepare the review package, move/request `codex-review`, and hand off to the independent reviewer.
- If ChatGPT is the assigned independent reviewer and sufficient evidence is accessible: perform the review now; do not wait for another reviewer.
- If review finds in-scope defects: return exact findings to Codex; Codex remediates automatically; ChatGPT re-reviews when the revised evidence is available.

The desired operating pattern is:

**User/ChatGPT scopes → Codex executes continuously → Codex self-verifies → `codex-review` → ChatGPT/independent reviewer verifies → Codex remediates automatically if needed → independent PASS → `chat-approved` → next gated phase.**

Not:

**Codex plans → asks permission → edits one file → asks permission → runs one test → asks permission → self-approves.**

---

## 15. Current project-specific authorization reminder

Unless a newer user instruction explicitly changes the boundary, local Arena development may proceed end-to-end in the approved isolated writable worktree, including local dependency installation, implementation, local/disposable DB work, tests, browser E2E, remediation, and review-package preparation.

The following remain separate explicit gates: **shared database migration/RLS application, real host configuration, commit, push, merge, deployment, production feature enablement, and final independent acceptance.**
