**TWITCH CHAT + OBS DEMO — PREPARE REAL END-TO-END TEST**  
## Objective  
Prepare the current Arena Preview/demo environment for a real Twitch end-to-end integration test.  
Do NOT repeat HeyGuys → VoHiYo as a separate milestone.  
The first successful proof should happen in the actual Arena + OBS + Twitch context:  
**Twitch Viewer C** → Twitch chat !arena → EventSub channel.chat.message → Orbace/Arena listener → Arena-aware status lookup → Twitch Send Chat Message API using Bot B → Bot response appears in Twitch chat.  
At the same time:  
**Orbace Arena** → OBS Browser Source → Twitch broadcast.  
This demonstrates bidirectional Twitch integration.  
  
## Identity model  
Prepare/document three separate Twitch identities:  
## A — Broadcaster / Streamer  
Current configured channel ID:  
```
1548437801

```
Purpose:  
* owns the Twitch channel;  
* receives the live OBS stream;  
* channel in which EventSub listens for chat.  
## B — Orbace Bot  
Current configured bot ID:  
```
1597519737

```
Purpose:  
* authenticated bot user;  
* EventSub/chat integration;  
* sends bot responses.  
B MUST NOT be used as the human test sender.  
## C — Human Viewer  
Separate ordinary Twitch account.  
Purpose:  
* watches A's Twitch stream;  
* types !arena.  
C MUST have a Twitch user ID different from B.  
No Orbace account is required for C.  
A and B may only be the same account if Twitch's current API requirements and our existing implementation explicitly support that configuration; otherwise preserve the currently configured separate IDs.  
  
## 1. Audit current Twitch implementation  
Before changing code, inspect the current implementation and document:  
* OAuth token validation;  
* required OAuth scopes;  
* EventSub WebSocket connection;  
* channel.chat.message subscription;  
* broadcaster ID handling;  
* bot ID handling;  
* chatter/sender ID handling;  
* self-message guard;  
* trigger parser;  
* Send Chat Message API;  
* reconnect behavior;  
* duplicate-event handling if present;  
* send enable/confirmation safeguards;  
* secret/environment handling;  
* interaction with ARENA_ENABLED;  
* compatibility with current Twitch API requirements.  
Do not expose tokens or secrets.  
Use the smallest changes necessary.  
  
## 2. Prepare environment validation  
Current blocker is HTTP 401 during bot-token validation.  
Prepare a safe validation command/script that reports only:  
* token valid/invalid;  
* authenticated Twitch user ID;  
* expected bot user ID;  
* identity match PASS/FAIL;  
* required scopes present/missing;  
* broadcaster/channel ID;  
* send-confirmation ID match;  
* EventSub readiness.  
Never print the access token.  
Expected bot:  
```
1597519737

```
Expected broadcaster:  
```
1548437801

```
Required scopes currently expected by implementation:  
* user:bot  
* user:read:chat  
* user:write:chat  
Verify these against current Twitch requirements and current implementation rather than assuming historical configuration is correct.  
If a new token requires owner interaction, prepare the exact authorization procedure/URL/command and STOP only at the point where Justin must authenticate/authorize Bot B.  
After Justin supplies the refreshed token through the established local secret mechanism, continue automatically.  
  
## 3. Implement minimal Arena-aware command  
If current architecture permits this without material redesign, use:  
```
!arena

```
as the first Twitch proof command.  
Do NOT implement chat voting yet.  
Expected response should contain safe current Arena information such as:  
```
Orbace Arena LIVE — Standard · Extreme · 04:12 remaining

```
Exact wording may vary.  
Use only data already safe for public/audience projections.  
NEVER expose:  
* private puzzle ID;  
* solution;  
* host-only projection;  
* authentication/session tokens;  
* internal database identifiers;  
* private user information.  
If no Arena session is active, return a simple safe response such as:  
```
Orbace Arena is not currently live.

```
Keep this implementation intentionally small.  
  
## 4. Preserve self-message protection  
When a chat event arrives:  
* verify broadcaster is A;  
* obtain chatter/sender identity;  
* ignore messages where chatter ID == Bot B;  
* accept C where C != B;  
* parse !arena;  
* invoke status response;  
* send response as B.  
Log safe evidence:  
broadcaster match chatter ID bot ID self-message guard PASS/IGNORED trigger MATCH/NO MATCH send attempted send accepted/failed  
Do not log tokens.  
  
## 5. Prepare OBS integration  
Use the existing Arena read-only overlay.  
Do not redesign OBS integration.  
Prepare/document:  
* exact Preview overlay URL pattern;  
* recommended OBS Browser Source dimensions;  
* any required query/session parameters;  
* expected overlay states;  
* how to confirm the overlay is connected to the same Arena session being tested.  
Verify:  
Arena state → overlay → OBS → Twitch broadcast.  
Overlay remains read-only.  
  
## 6. Keep current Arena Flow 1 frozen  
Flow 1 is currently demo-ready:  
* anonymous audience works;  
* voting works;  
* host gameplay works;  
* Notes/Pencil works;  
* notes now propagate to audience;  
* terminal results synchronize;  
* authentication UX is clean enough for demo.  
Do not modify these paths unless required to correct a regression caused by this Twitch work.  
Observed intermittent signal aborted without reason should be documented separately. Do not treat it as an Arena blocker unless correlated with reproducible application failure.  
  
## 7. Pre-test everything possible without Justin  
Before requesting owner interaction:  
Run:  
* Twitch offline tests;  
* focused Arena tests affected by !arena;  
* build/typecheck;  
* secret-leak check;  
* trigger parsing tests;  
* self-message guard tests;  
* safe Arena status projection tests;  
* inactive-Arena response test;  
* Send Chat request construction test/mock;  
* relevant regression tests.  
Prepare the environment so Justin's manual work is minimal.  
  
## 8. Owner handoff point  
When everything possible is ready, report exactly:  
**READY FOR TWITCH OWNER ACTION**  
Then provide:  
1. which Twitch account Justin must log into;  
2. whether it is A, B, or C;  
3. exact OAuth/token authorization steps if required;  
4. where the resulting token must be stored locally;  
5. command Codex will run after that;  
6. explicit instruction NOT to paste secrets into ChatGPT/GitHub.  
After token validation succeeds, continue until:  
**READY FOR VIEWER C TEST**  
At that point provide the exact Twitch channel and exact command Justin should send:  
```
!arena

```
Do not have Justin guess when or where to send it.  
  
## 9. Live E2E acceptance  
With Arena running and OBS streaming to Twitch:  
C sends:  
```
!arena

```
in A's Twitch chat.  
Required evidence:  
Twitch receives message → EventSub receives channel.chat.message → broadcaster = A → chatter = C → C != B → self-message guard passes → !arena matches → safe Arena status retrieved → Send Chat Message API called as B → Twitch accepts response → response visibly appears in A's Twitch chat.  
Simultaneously verify:  
Arena → OBS overlay → Twitch broadcast.  
This is the required bidirectional proof:  
**Twitch → Orbace → Twitch**  
plus  
**Orbace → OBS → Twitch**  
  
## 10. Stop after proof  
If this passes:  
**TWITCH CHAT + OBS INTEGRATION PROOF = PASS**  
Capture evidence suitable for the hackathon/demo package.  
Do NOT proceed automatically to:  
* !arena vote;  
* Twitch-based Arena identity;  
* Twitch/Orbace account linking;  
* chat host controls;  
* chat puzzle submission;  
* Twitch Extension;  
* production deployment;  
* production configuration;  
* push/merge.  
Those are separate decisions.  
If the test fails, identify the exact boundary:  
TOKEN → EVENTSUB CONNECTION → SUBSCRIPTION → EVENT DELIVERY → BROADCASTER ID → CHATTER ID → SELF-MESSAGE GUARD → TRIGGER → ARENA STATUS → SEND CHAT API → TWITCH CHAT DISPLAY.  
Apply only small in-scope fixes. Escalate only if owner authorization/credentials or material architecture changes are required.  
## Report format  
**Status**  
**Code/environment readiness**  
**OAuth/token status**  
**A/B/C identities**  
**EventSub status**  
**OBS status**  
**Tests**  
**Owner action required**  
**Risk**  
**Next**  
