# Arena POC — Controlling Implementation Directive  
This is the controlling implementation direction for the current Arena POC.  
The Arena PRD/architecture remains the product reference. This directive defines the **POC subset, intentional deviations, execution authority and hard boundaries**.  
Where historical Arena requirements conflict with an explicit POC decision below, this directive controls for the POC. Do not silently reinterpret other PRD requirements.  
## 1. POC hypothesis  
We are testing whether:  
**An authenticated Orbace host plus authenticated audience voting can produce a simple, repeatable and watchable timed Sudoku Arena round using the existing Orbace auth, Sudoku, backend, database and deployment stack without introducing new infrastructure or architecture.**  
This is a POC, not production hardening.  
Optimize for proving this flow reliably, not completing every production requirement in the full PRD.  
## 2. Minimum Arena POC product  
The POC is not merely a voting test.  
The minimum end-to-end product loop is:  
**host authenticates** → **creates Arena** → **audience joins** → **audience votes on round preset** → **preset resolves** → **host starts private Arena Sudoku** → **server-authoritative timer runs** → **host solves or time expires** → **server validates outcome** → **all viewers see the same result** → **basic rematch works**  
The existing read-only overlay must show the current safe Arena state/result.  
Preserve already-working Arena functionality needed for this loop.  
Do not remove working functionality merely to make the POC artificially smaller.  
## 3. Explicit POC account decision  
The full PRD originally specified anonymous guest voting.  
For this POC we **intentionally supersede that requirement**.  
Reason: authenticated voting reuses existing Orbace authentication and gives controlled, deterministic multi-user testing without building anonymous identity, guest-key, Sybil or cookie-voting infrastructure.  
POC access model:  
## Anonymous viewer  
* may watch;  
* may read safe public Arena state;  
* may use the read-only overlay;  
* cannot vote;  
* cannot host.  
## Authenticated Orbace user  
* uses existing Orbace authentication;  
* may watch;  
* may vote;  
* one authenticated Orbace user ID = one effective vote per ballot;  
* voting again before ballot close updates that user's vote.  
## Arena host  
* normal authenticated Orbace user;  
* UUID additionally present in Preview Arena host allowlist;  
* may create and control Arena sessions owned by that authenticated identity.  
Arena MUST NOT implement its own authentication/account/session system.  
Never trust a browser-supplied UUID for authentication or authorization.  
## 4. Controlled Preview test accounts  
Create four synthetic **Preview-only Orbace accounts**:  
* arena-host-test  
* arena-voter-1  
* arena-voter-2  
* arena-voter-3  
First inspect the existing Orbace account/auth provisioning path and determine the **minimum state required for a normal authenticated Orbace account**.  
Reuse that existing mechanism.  
Do NOT:  
* copy production users;  
* copy production credentials/tokens/PII;  
* invent an Arena account schema;  
* redesign Orbace authentication;  
* add unnecessary account tiers or entitlement logic.  
Only the host test UUID is Arena-host allowlisted.  
The three voters remain ordinary authenticated Orbace test users.  
**Preview-only auth DB records, Preview auth configuration required by the existing mechanism, Preview secrets and Preview Arena allowlist are in scope for this controlled POC.**  
**Production auth DB, users, RLS, secrets and authentication configuration are never touched without separate authorization.**  
## 5. POC scope  
## IN  
* existing Orbace authentication;  
* four controlled Preview accounts;  
* host allowlist;  
* Arena session creation/read;  
* authenticated preset voting;  
* vote change before ballot close;  
* private Arena puzzle supply;  
* host Sudoku board;  
* server-authoritative round timer;  
* server-side solution/result validation;  
* consistent host/audience result;  
* basic read-only overlay;  
* refresh/recovery;  
* basic rematch;  
* authorization/privacy boundaries;  
* feature flag / kill switch;  
* enough tests to prove this flow.  
## OUT / DEFER  
Do not add for this POC unless already implemented and required by the working loop:  
* anonymous voting identity;  
* guest-key hashing for voting;  
* device fingerprinting;  
* sophisticated Sybil protection;  
* Twitch authentication/API/EventSub/chatbot;  
* participant allowlists;  
* new entitlement/tier architecture;  
* payments;  
* rankings/leaderboards;  
* production-scale load engineering;  
* SSE/realtime architecture replacement;  
* replay system;  
* advanced analytics/dashboarding;  
* new cloud services;  
* new frameworks or infrastructure;  
* production release work.  
Strike/modifier behavior already implemented may remain, but **do not expand or redesign it for this POC**. It must not block proving the core loop above.  
Do not broaden scope merely because the full PRD discusses a future capability.  
## 6. Security invariants  
These remain mandatory even for the POC:  
* backend derives authenticated identity from trusted Orbace auth;  
* never trust client-supplied user/host UUID;  
* one effective vote per authenticated user per ballot;  
* repeat vote updates rather than creates another voter;  
* host mutations require authenticated allowlisted host and session ownership;  
* server controls authoritative deadline and result;  
* Arena uses private eligible puzzle supply;  
* public/overlay DTO never exposes solution/private puzzle identifiers;  
* overlay exposes no participant UUIDs or host credentials;  
* Arena remains isolated from official ranking/scoring surfaces;  
* feature flag fails closed.  
Do not weaken these invariants to save time.  
## 7. Acceptance  
## Account/voting acceptance  
Using independent browser contexts:  
1. Host test account authenticates and creates Arena.  
2. Voter 1 authenticates and votes.  
3. Voter 2 authenticates and votes.  
4. Voter 3 authenticates and votes.  
5. Exactly **3 authenticated voters / 3 effective votes** exist.  
6. Voter 1 changes vote; effective voter count remains 3.  
7. Anonymous browser can watch but cannot vote.  
8. Ordinary voter cannot host.  
9. Refresh preserves authenticated identity and current Arena state.  
10. Overlay remains read-only and privacy-safe.  
## Arena POC acceptance  
Using the same controlled environment:  
1. Host creates Arena.  
2. Three authenticated voters join and vote on the preset.  
3. Preset resolves consistently.  
4. Host starts a private Arena puzzle.  
5. Host/audience/overlay observe consistent PLAYING state and authoritative countdown.  
6. Host solves correctly before deadline **or** round expires.  
7. Server determines the authoritative result.  
8. Host, voters and overlay show the same terminal result.  
9. Refresh during PLAYING recovers current state.  
10. Basic rematch starts another eligible private puzzle without leaking solution/private identifiers.  
This proves the Arena POC rather than only its voting infrastructure.  
## 8. Reuse and complexity rule  
Use existing Orbace:  
* authentication;  
* account model;  
* frontend/backend patterns;  
* database;  
* Sudoku/game components;  
* Preview deployment.  
**Do not introduce tools, architecture, infrastructure, frameworks, services or product capabilities not specified by or necessary to the approved PRD/architecture and this POC subset.**  
Prefer the smallest existing mechanism.  
Do not solve hypothetical production problems during POC development.  
If something outside the approved architecture is genuinely required to make the defined POC work, stop at that **specific architecture decision** and explain why the existing design is insufficient.  
## 9. Execute to outcome  
For in-scope engineering:  
**inspect → implement → test → local candidate → Preview deploy → validate → fix → retest → cleanup → evidence**  
An in-scope defect is a remediation task, not a new authorization request.  
Within the approved isolated worktree/Preview environment, necessary reversible actions are authorized, including:  
* implementation/tests;  
* local candidate commits;  
* Preview test-account provisioning;  
* Preview auth state required for those synthetic accounts;  
* Preview host allowlist/secrets/config;  
* starting/resuming Preview;  
* Preview deployment/redeployment;  
* temporary Arena enablement;  
* test data;  
* browser/E2E/overlay validation;  
* rollback/cleanup.  
Do not ask for permission for each routine step.  
## 10. Hard boundaries  
Separate authorization is still required for:  
* production mutation/deployment;  
* production DB/RLS/auth/secrets;  
* production user data;  
* push;  
* merge;  
* main publication;  
* global Orbace authentication redesign;  
* irreversible/shared destructive operation;  
* architecture outside the approved POC;  
* material product/security decision outside this directive.  
Preserve unrelated work.  
A real Codex runtime/system restriction remains a valid blocker and must not be bypassed.  
## 11. Candidate and independent review  
A candidate is suitable for Preview when:  
* relevant POC tests pass;  
* unrelated work is excluded;  
* required security regressions pass;  
* it has an immutable local commit SHA;  
* deployed artifact corresponds to that candidate.  
Independent ChatGPT review is **not required before each Preview iteration**.  
Independent review occurs after the milestone produces implementation and Preview evidence.  
Then:  
**builder PASS → review package → codex-review → independent ChatGPT review**  
Codex does not self-approve.  
## 12. Reporting  
Do not return merely because another routine engineering step is required.  
Return when:  
**PASS** — defined POC acceptance is satisfied;  
or  
**BLOCKED_HARD_BOUNDARY** — the next required action genuinely exceeds authorization or runtime capability.  
Report concisely:  
**Status** **Candidate SHA** **Existing Orbace auth/account path reused** **Test accounts created** **Voting result** **Arena end-to-end result** **Tests/evidence** **Final Preview state** **Remaining genuine gate**  
Proceed through account provisioning, authentication correction, voting validation and the defined Arena POC loop without per-step authorization.  
