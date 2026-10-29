# Codex Task: Implement ChatGPT–Codex Shared Handoff Protocol

## Objective

Set up a minimal, durable, GitHub-based communication protocol so ChatGPT and local Codex can exchange task instructions and implementation reports without requiring the user to copy and paste messages.

Target repository:

`justinzero888/os-arena`

Local repository:

`/Users/justinzero/orbacetech/DevProjects/os-twitcharena`

The original `orbace-sudoku-v2` repository must remain separate and untouched.

## 1. Inspect and preserve

- Verify the current branch, working tree, remote, and GitHub CLI authentication.
- Preserve all existing user work.
- Do not print credentials or tokens.
- Do not push, merge, deploy, or change repository permissions without authorization.
- If GitHub access is unavailable, document the blocker and complete only safe local preparation.

## 2. Use GitHub Issues as the communication channel

Use one GitHub Issue per task. Do not use a frequently overwritten shared Markdown file as the primary message queue.

Establish these labels:

- `chat-request`
- `codex-working`
- `codex-review`
- `chat-approved`
- `blocked`

Document label creation and handling. Avoid changing unrelated issues or labels.

### Incoming task protocol

When checking for tasks:

1. Query `justinzero888/os-arena` for open issues labeled `chat-request`.
2. Read the full issue description and comments.
3. Verify that the task explicitly identifies its scope, constraints, and acceptance criteria.
4. Acknowledge the task with a comment and transition its label to `codex-working`.
5. Execute only the authorized task.
6. Post progress comments for meaningful milestones, not every command.
7. Post a structured completion report and transition to `codex-review`.
8. If blocked, post the exact blocker, what was verified, and the smallest action needed from the user. Apply `blocked`.

Do not process the same task twice concurrently. If multiple tasks are queued, process them in issue-number order unless a dependency requires otherwise.

### Outgoing report protocol

Every completion report must include:

- Issue number and task summary.
- Repository and branch.
- Commit IDs, if any.
- Files created or changed.
- Tests and checks run, with actual results.
- Tests not run and why.
- Security and scope checks.
- Whether any external service was contacted.
- Whether a live test, deployment, or production change occurred.
- Remaining blockers and recommended next step.

Never claim a test passed if it was not run. Never include secrets, access tokens, environment-file contents, or sensitive user data.

## 3. Create minimal local helper scripts

Add small scripts or commands to support:

- Listing incoming `chat-request` issues.
- Displaying the full task and comments.
- Acknowledging a task.
- Posting a structured completion report.
- Marking a task blocked.

Prefer GitHub CLI (`gh`) where practical. Check whether it is authenticated before making API calls. Never embed a personal access token in scripts.

Make scripts safe to rerun and explicit about the issue number. Do not automatically execute every queued issue without a visible task-selection step.

Suggested documentation:

- `docs/CHATGPT_CODEX_PROTOCOL.md`
- `scripts/handoff/` for optional helpers.

Adapt to the existing repository structure rather than creating unnecessary files.

## 4. ChatGPT review and approval

`codex-review` means implementation is ready for review; it does not mean the task is approved for merge or release.

ChatGPT can read the report through the GitHub connection and respond with one of:

- Approve.
- Request specific corrections.
- Open a follow-up task.
- Ask for a human decision.

Codex must not interpret silence as approval. The user retains authority over merges, pushes, deployments, production changes, and credential provisioning.

## 5. Scope and security rules

- Keep all Arena work inside `os-arena`.
- Do not modify `orbace-sudoku-v2`.
- Do not commit secrets or private local environment files.
- Do not use GitHub Issues to exchange credentials.
- Do not add a database, service, or background worker solely for the handoff protocol.
- Do not implement a continuous polling daemon unless explicitly authorized.
- Keep `ARENA_ENABLED=false`.
- Do not commit or push automatically unless explicitly authorized.

## 6. Acceptance criteria

- [ ] Protocol documented in the repository.
- [ ] Required labels are documented and, if authorized and authenticated, created.
- [ ] Codex can list and read a task from GitHub.
- [ ] Codex can post an acknowledgement and completion report.
- [ ] Duplicate task execution is prevented or explicitly guarded.
- [ ] Missing authentication produces a clear, secret-free error.
- [ ] Local tests or dry runs validate the helper scripts without requiring a live issue.
- [ ] Existing work is preserved.
- [ ] No deployment, production change, or modification to `orbace-sudoku-v2`.
- [ ] No automatic commit, push, merge, or release.

Finish by documenting the exact commands for the user to run and a first end-to-end protocol test. Do not claim the round trip works until ChatGPT and Codex have actually exchanged a message through GitHub.

## Local helper commands

The repository helper is `scripts/handoff/handoff.mjs`. It requires the GitHub CLI (`gh`) and a Node.js runtime; it uses no token of its own and never prints `gh` error output. Every issue-specific command requires an explicit issue number.

```sh
# List open incoming tasks.
npm run handoff -- list

# Display the full issue description and comments.
npm run handoff -- show 42

# Acknowledge and claim one selected chat-request issue.
npm run handoff -- ack 42

# Validate and preview a structured completion report without contacting GitHub.
npm run handoff -- complete 42 --report-file /path/to/report.md --dry-run

# Post a completion report and move codex-working to codex-review.
npm run handoff -- complete 42 --report-file /path/to/report.md

# Report a blocker and move the issue to blocked.
npm run handoff -- blocked 42 --report-file /path/to/report.md

# Validate helpers without a live issue.
npm run handoff:test
```

Before API calls, the helper runs `gh auth status --hostname github.com`. If authentication is missing, it prints a short message directing the user to `gh auth login -h github.com`; it suppresses raw CLI errors so tokens cannot appear in helper diagnostics.

### Label setup and transitions

Create only missing labels; preserve labels with unrelated names. Check the current set with:

```sh
gh label list --repo justinzero888/os-arena
```

Create any missing label using `gh label create LABEL --repo justinzero888/os-arena --color COLOR --description DESCRIPTION`. Required names and suggested colors are:

| Label | Color | Meaning |
|---|---|---|
| `chat-request` | `1D76DB` | Incoming task selected by ChatGPT |
| `codex-working` | `FBCA04` | Claimed by Codex; guards against normal duplicate selection |
| `codex-review` | `0E8A16` | Completion report is ready for ChatGPT review |
| `chat-approved` | `5319E7` | ChatGPT approved the report; this is not merge or release authorization |
| `blocked` | `D93F0B` | Work needs a user decision or prerequisite |

Normal flow is `chat-request` → `codex-working` → `codex-review`. A blocked task moves to `blocked`; after the user resolves the blocker, they may relabel it `chat-request`. ChatGPT review may add `chat-approved`, request corrections by relabeling to `chat-request`, or open a follow-up issue. Acknowledgement and completion comments have stable hidden markers so rerunning the helper does not post a second copy. The issue label prevents sequential duplicate claims; for concurrent workers, select/claim one issue at a time and treat an existing `codex-working` label as owned.

### Creating a task and reviewing the result

Create one issue per task with explicit scope, constraints, and acceptance criteria. Apply `chat-request`, then select it with `list` and read it with `show`. The helper never automatically executes queued tasks.

The completion report file must contain these headings (the helper validates all of them before posting):

```markdown
# Issue and task summary
# Repository and branch
# Commit IDs
# Files created or changed
# Tests and checks run
# Tests not run and why
# Security and scope checks
# External service contacted
# Live test, deployment, or production change
# Remaining blockers and recommended next step
```

Once the issue is labeled `codex-review`, ChatGPT can read the issue and comments through its GitHub connection and respond there; the Markdown issue history is the shared record, so no manual message copying is needed. A successful local API round trip does not itself prove that ChatGPT has retrieved or reviewed the issue. Only report that final leg after ChatGPT actually reads it and replies.

The helper, its dry-run mode, and unit tests are local repository changes until explicitly committed and pushed. They do not merge, deploy, change production configuration, or touch `orbace-sudoku-v2`.
