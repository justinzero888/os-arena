# Orbace Sudoku Arena (擂台) — Environment, Accounts & Handoff

**Version:** 1.0  
**Date:** 2026-10-28  
**Purpose:** Transfer the three-day hackathon pilot to a separate ChatGPT/Codex account without consuming the existing Plus account's Codex allowance.  
**Status:** New ChatGPT account and empty GitHub repository have been created by the project owner. Other setup items below are **not yet verified**.

> **Security:** This document contains no credentials. Never paste API keys, GitHub tokens, Twitch stream keys, session cookies, or recovery codes into ChatGPT, a repository, screenshots, or shared documents.

## 1. Project mission and approved scope

**Project:** Orbace Sudoku Arena (擂台), also called *Arena Challenge Show Lite*. This is a **new livestream entertainment product**, distinct from Orbace's existing Reddit *Help to Solve* feature and its official ranking competitions.

- **Host/streamer:** Selects or starts a curated Sudoku challenge and solves it live.
- **Audience:** Joins a public Arena URL without Twitch or Orbace registration, votes on the challenge preset, and makes one bounded audience-intervention decision.
- **Pilot intervention:** Hide candidate notes for a short interval; if existing UI integration is too expensive, substitute a bounded time penalty.
- **Outcome:** Host wins by completing the puzzle within the time limit; otherwise audience wins. Offer rematch and basic event history.
- **Broadcast:** OBS Browser Source overlay on a Twitch livestream; web-based guest voting. Twitch chat integration is optional only if schedule permits and the rules require it.
- **Architecture:** Arena session logic and platform-neutral participation APIs, with future adapters for Twitch, YouTube, Discord, Reddit.
- **Out of scope:** Native Twitch Extension, viewer OAuth, monetization, AI judging, full multiplayer race, official RP, production-grade leaderboards, deep Su-Pu video production.

**Target:** Three development days, then reserve time for demo, submission, and fixes. **Hackathon eligibility is not confirmed**: obtain organizer clarification about reuse of proprietary Orbace Sudoku components and ensure Twitch connectivity meets the event's rules. Verify current deadline and submission requirements from the official rules rather than relying on this document.

## 2. Account inventory and isolation

| System | Purpose | Status | Action |
|---|---|---|---|
| Existing ChatGPT Plus account | Other ongoing projects | Existing; keep separate | Do not use its Codex sign-in for Arena work |
| New ChatGPT Free account | Primary Arena Codex login | **Created (user confirmed)** | Verify Codex availability and usage limits in this account |
| GitHub repository (new, empty) | New Arena code, issues, commits | **Created (user confirmed)** | Record URL below; verify permissions and clone |
| OpenAI API Platform project | Metered fallback if Free Codex limit reached | Not confirmed | Create project under intended billing account; set billing controls |
| Twitch broadcaster account | Broadcast the pilot | Not confirmed | Verify channel and stream permissions |
| OBS Studio | Livestream with Arena browser overlay | Not confirmed | Install, create scene, test Browser Source |
| Hosting/database | Arena staging and persistence | Not confirmed | Reuse available infrastructure after repository audit |
| Hackathon registration | Eligibility and submission | Not confirmed | Confirm individual/team entrant, rules, and submission artifacts |

**Fill in locally (no secrets):**

- New Arena GitHub repository URL: `________________________`
- Local working directory: `________________________`
- Arena deployment URL: `________________________`
- Twitch channel URL: `________________________`
- Hackathon submission/project URL: `________________________`
- New account's email identifier (optional; do not include in public docs): `________________________`

**Important:** ChatGPT subscription usage and OpenAI API billing are separate. The Free account's Codex limits are not guaranteed to cover the entire build. An API project can be used as a fallback, but its charges are metered and must be monitored. Using an API key does not spend the existing Plus account's Codex allowance; ensure the key belongs to the intended separately billed API organization/project.

## 3. Local Mac development setup

Prerequisites: macOS terminal, Git, Node.js LTS/npm (if applicable), VS Code or preferred IDE, Codex CLI, and access to the new GitHub repository. Check the repository's actual stack before adding frameworks or services.

```bash
# Inspect installed tools
git --version
node --version
npm --version

# Install Codex CLI if absent
npm install -g @openai/codex
codex --version

# Clone the NEW Arena repository (replace placeholder)
git clone <ARENA_REPO_URL>
cd <ARENA_REPO_DIRECTORY>
git remote -v
git status

# Recommended new work branch
git switch -c feat/arena-mvp
```

**Git identity:** Configure the name/email appropriate to the hackathon contributor. Confirm repository access using `gh auth status` if GitHub CLI is installed. GitHub authentication is separate from ChatGPT/Codex authentication. Use SSH or GitHub's supported credential flow; do not put a personal access token in the remote URL.

**Protect the Plus account:** Use a separate browser profile for the new ChatGPT account. For the local Codex CLI, `codex logout` may change the active local authentication state; check which account is active before working on any project. For stronger isolation, use separate OS users or separately managed Codex home/config directories, after confirming support in your installed Codex version. Avoid sharing a single active Codex login across two concurrently running project sessions.

## 4. Primary Codex login: ChatGPT Free

1. Open a dedicated browser profile and sign in to the **new Free ChatGPT account**.
2. In Terminal, run:

```bash
codex logout
codex login
```

3. Choose **Sign in with ChatGPT**, complete browser authorization with the **new account**, and start Codex in the Arena repository:

```bash
cd <ARENA_REPO_DIRECTORY>
codex
```

4. Within Codex, use `/status` where supported to inspect the login/usage state. Verify the active account before doing substantial work.
5. Record progress in Git commits and `IMPLEMENTATION_STATUS.md`; don't depend on chat history as the only project memory.

**Account handoff caveat:** ChatGPT conversation history, saved memories, attached files, and Codex sessions are not automatically shared between two accounts. Upload this Markdown document plus the RPD/architecture file to the new account, and use the GitHub repository as the source of truth.

## 5. API fallback: set up before Free usage is exhausted

### 5.1 Create an API project

1. With the intended billing identity, open https://platform.openai.com/ .
2. Select or create the appropriate organization and create a project, e.g. `orbace-arena-hackathon`.
3. Open the Billing and Limits sections. Add a payment method and, if prepaid billing is available, fund a **small initial amount** (e.g. $10); leave automatic recharge off unless explicitly desired.
4. Set the lowest suitable project/organization budget and alert thresholds. **Budgets/alerts are not guaranteed hard spending caps**; prepaid balances and usage reporting may also have delays. Monitor billing manually.
5. Create a **project-scoped API key** with the permissions required by Codex; store it in a password manager or local secret store. Do not commit it.
6. Verify that the API project has access to a Codex-compatible model and that API-key authentication is supported by the installed Codex version.

Useful pages: https://platform.openai.com/api-keys , https://platform.openai.com/settings/organization/billing/overview , https://developers.openai.com/codex/ .

### 5.2 Switch local Codex to API billing only when necessary

Use a secure prompt that avoids writing the secret to shell history:

```bash
codex logout
read -rs 'OPENAI_API_KEY?Arena API key: '
printf '\n'
printf '%s' "$OPENAI_API_KEY" | codex login --with-api-key
unset OPENAI_API_KEY
```

If the installed Codex CLI uses a different supported API-key login syntax, follow `codex login --help` and current official documentation. After login, inspect `/status` and the API usage dashboard to confirm that charges go to the **Arena API project**. **Do not assume the selected billing project solely from the key's label.**

Switching authentication may start a new Codex session and does **not** transfer prior conversation context. Use Git plus `IMPLEMENTATION_STATUS.md` to resume.

**Fallback order:** (1) Free Codex while available; (2) API-key Codex with a monitored small budget; (3) existing Plus account only if the owner explicitly approves using its allowance; (4) manually complete critical fixes if usage is unavailable. Do not create multiple accounts merely to evade usage restrictions; follow OpenAI terms.

## 6. GitHub repository initialization

The repo already exists as an empty shell. Do not overwrite existing files without inspection.

Suggested structure (adapt after Codex audits reusable components):

```text
orbace-arena/
  README.md
  AGENTS.md
  IMPLEMENTATION_STATUS.md
  docs/
    RPD-architecture.md
    environment-account-setup.md
    eligibility-evidence.md
    demo-submission-checklist.md
  apps/                   # only if needed by the chosen stack
  packages/               # reusable game adapter, if appropriate
  .env.example            # placeholder names only, never secrets
  .gitignore
```

Example `.gitignore` entries:

```gitignore
.env
.env.*
!.env.example
node_modules/
.next/
dist/
coverage/
.DS_Store
```

Minimum branch protection and security: enable GitHub 2FA, keep the repo private initially if proprietary components are involved, use least-privilege collaborators, enable secret scanning where available, and do not make the source public until rights and hackathon submission rules are checked.

**Provenance:** Keep Arena-specific work in new commits during the event period. If importing pre-existing Orbace code, isolate it as a documented dependency or clearly attributed module. Do not claim pre-existing code was created during the hackathon. Confirm rights to submit any company-owned IP.

## 7. Twitch + OBS setup (no Twitch developer API credentials required for basic pilot)

1. Confirm a Twitch broadcaster account and that livestreaming is enabled.
2. Install OBS Studio: https://obsproject.com/ .
3. Connect OBS to Twitch using the supported account authorization flow or securely stored stream key; never put a stream key in GitHub or this document.
4. Create an OBS scene with a **Browser Source** pointing to `https://<arena-host>/live/<session-id>/overlay` (actual route subject to repository design).
5. Use 1920×1080 canvas as a starting point; configure browser source dimensions to match the overlay design.
6. Test overlay refresh, voting updates, timer state, and disconnect/reconnect in a private or limited-audience dry run.
7. Display the public audience participation URL and QR code in the stream; **do not expose host-control tokens**.

**Eligibility caution:** OBS embedding is the initial Twitch broadcast integration, but whether that alone satisfies the hackathon's Twitch connection requirement must be verified. Consider a minimal authorized Twitch chat command or EventSub listener only if organizer guidance or testing indicates it is necessary. Twitch developer app credentials/OAuth scopes would then be added as a separate, documented integration step; don't provision them blindly.

## 8. Hosting and environment variables

Reuse Orbace's current deployment/database infrastructure if practical; do not provision a new database, Redis, or cloud account before inspecting the codebase. Require TLS, a persistent session store, server-side authorization, rate limits, and centralized logs.

Example **names only** for `.env.example` (final names depend on implementation):

```dotenv
APP_BASE_URL=https://example.invalid
DATABASE_URL=
ARENA_FEATURE_ENABLED=false
ARENA_HOST_AUTH_SECRET=
ARENA_SESSION_SIGNING_SECRET=
# Only if a native Twitch API integration is added:
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
TWITCH_EVENTSUB_SECRET=
```

Use hosting-provider secret management or local ignored `.env` files for real values. Do not put API keys in client-side environment variables, OBS URLs, or browser JavaScript. Host authentication must not depend on an unprotected, publicly guessable URL.

## 9. Three-day implementation checkpoints

| Day | Goal | Exit criteria |
|---|---|---|
| 0 / setup | Confirm eligibility, repo, accounts, Codex login, OBS and deployment target | New account works; GitHub access verified; secrets not shared |
| 1 | Arena sessions, host controls, guest join, preset vote | One host + three browsers complete one vote |
| 2 | Sudoku round, authoritative timer, bounded intervention, OBS overlay | Vote changes live host challenge; overlay updates |
| 3 | Result, rematch, persistence, tests, deployment | Two complete rounds; refresh/reconnect works; no official competition impact |

**Critical integration decision:** Codex must inspect the existing Sudoku engine, notes UI, replay format, and licensing boundaries before promising a complete implementation. If notes hiding requires invasive changes, use a bounded time-penalty intervention instead.

## 10. Security and fairness acceptance criteria

- Anonymous viewers can join and vote without Twitch or Orbace accounts.
- Guest identity and vote deduplication are best-effort; rate-limit and disclose that guest votes are not person-verified.
- Host actions require authenticated, server-validated authorization.
- Server owns timer, round state, vote resolution, and result; protect against stale and duplicate requests.
- Public overlay is read-only and contains no secrets.
- Sudoku givens/solutions remain immutable; official RP/ranking and Reddit Help to Solve remain untouched.
- Log events needed to debug voting and results without retaining unnecessary personal information.
- Ensure graceful fallback when there are zero votes or the streamer disconnects.

## 11. Hackathon evidence and submission checklist

Verify the **official current rules** at https://twitchcon-codex.devpost.com/ before submission. Confirm submission deadline, required demo duration, repository visibility, Codex evidence/session ID, and whether a separate newly built app may use proprietary pre-existing Sudoku components.

Keep:

- Organizer's written eligibility answer or Discord permalink.
- New repository creation timestamp and Arena commit history.
- A `docs/eligibility-evidence.md` inventory separating new Arena code from existing Orbace dependencies.
- Codex session ID(s), development logs, and `IMPLEMENTATION_STATUS.md`.
- Screenshots/video of Twitch broadcast, viewer voting, live modifier, and result/rematch.
- Deployment instructions, working demo URL, and a short fallback recording if the live service fails.
- Written confirmation that the entrant/team has rights to submit the relevant IP.

## 12. Handoff instructions for the new ChatGPT/Codex account

Upload or paste these files into the **new account**:

1. `Orbace_Arena_Environment_Account_Setup_Handoff.md` (this file).
2. `Orbace_Sudoku_Arena_RPD_Architecture_v0.1.md` (prior product/architecture draft; reconcile with this handoff if assumptions differ).
3. The new Arena repository URL and, if available, a concise repository map or README.
4. Organizer eligibility clarification once received.

**Suggested first message to the new account:**

> You are taking over the Orbace Sudoku Arena (擂台) three-day hackathon pilot. Read the attached environment/account handoff and RPD/architecture. The new ChatGPT account and GitHub repository already exist. Keep this account's Codex usage and any API billing separate from my existing Plus account. First confirm account/tool readiness and inspect the repository; do not assume the existing Orbace Sudoku engine or APIs are available. Identify the shortest viable new-project architecture that preserves hackathon eligibility. Then deliver a Day 1 vertical slice: create Arena session, guest join, preset voting, and host vote result. Track progress in Git and `IMPLEMENTATION_STATUS.md`. Never request or expose secrets in chat. Flag unresolved eligibility or IP issues before publishing the repo.

## 13. Immediate next actions for owner

- [x] Create new ChatGPT account (**user confirmed**).
- [x] Create empty Arena GitHub repo (**user confirmed**).
- [ ] Fill in the repository URL and local directory in Section 2.
- [ ] Install/verify Codex CLI and log in using the **new** ChatGPT account.
- [ ] Confirm Free Codex works and check its usage status.
- [ ] Create the separately billed Arena API project; set conservative budget/alerts; securely store key.
- [ ] Confirm Twitch broadcaster and OBS scene.
- [ ] Ask organizers to confirm eligibility of pre-existing proprietary Sudoku dependencies.
- [ ] Clone repo, create working branch, and begin Day 1 implementation.

---

**Operating principle:** Build a genuinely new Arena experience using pre-existing Sudoku capabilities as clearly identified dependencies, keep credentials and usage isolated, and preserve a reproducible handoff so development can continue if the Free Codex allowance is exhausted.
