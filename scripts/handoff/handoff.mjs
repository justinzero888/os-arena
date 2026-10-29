#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export const REPOSITORY = 'justinzero888/os-arena';
export const LABELS = Object.freeze({
  request: 'chat-request',
  working: 'codex-working',
  review: 'codex-review',
  approved: 'chat-approved',
  blocked: 'blocked',
});

const REPORT_HEADINGS = [
  'Issue and task summary',
  'Repository and branch',
  'Commit IDs',
  'Files created or changed',
  'Tests and checks run',
  'Tests not run and why',
  'Security and scope checks',
  'External service contacted',
  'Live test, deployment, or production change',
  'Remaining blockers and recommended next step',
];

export function parseIssueNumber(value) {
  const normalized = String(value ?? '').replace(/^#/, '');
  if (!/^\d+$/.test(normalized) || Number(normalized) < 1) {
    throw new Error('Provide an explicit positive issue number, for example: 42.');
  }
  return String(Number(normalized));
}

export function assertCanClaim(issue) {
  const names = new Set((issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name));
  if (issue.state !== 'OPEN') throw new Error('Only open issues can be claimed.');
  if (names.has(LABELS.working) || names.has(LABELS.review) || names.has(LABELS.approved)) {
    throw new Error('This issue is already claimed or has completed review; duplicate execution is guarded.');
  }
  if (!names.has(LABELS.request)) throw new Error(`Issue must have the ${LABELS.request} label before it can be claimed.`);
}

export function validateCompletionReport(body) {
  const missing = REPORT_HEADINGS.filter((heading) => !new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`, 'im').test(body));
  if (missing.length) throw new Error(`Completion report is missing required section(s): ${missing.join('; ')}.`);
  return body.trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasMarker(issue, marker) {
  return (issue.comments ?? []).some((comment) => comment.body?.includes(marker));
}

function gh(args) {
  try {
    return execFileSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (error) {
    const command = args[0] ?? 'command';
    throw new Error(`GitHub CLI ${command} failed (exit ${error.status ?? 'unknown'}). Check authentication, repository access, issue number, and labels; command output was suppressed.`);
  }
}

function requireAuth() {
  const result = spawnSync('gh', ['auth', 'status', '--hostname', 'github.com'], { stdio: 'ignore' });
  if (result.error || result.status !== 0) {
    throw new Error('GitHub CLI is not authenticated for github.com. Run: gh auth login -h github.com');
  }
}

function fetchIssue(number) {
  const raw = gh(['issue', 'view', number, '--repo', REPOSITORY, '--json', 'number,title,body,comments,labels,state,url']);
  return JSON.parse(raw);
}

function printIssue(issue) {
  console.log(`#${issue.number} ${issue.title}\n${issue.url}\nState: ${issue.state}`);
  console.log(`Labels: ${(issue.labels ?? []).map((label) => label.name).join(', ') || '(none)'}`);
  console.log(`\n## Description\n${issue.body || '(empty)'}`);
  console.log('\n## Comments');
  if (!issue.comments?.length) console.log('(none)');
  for (const comment of issue.comments ?? []) {
    console.log(`\n### ${comment.author?.login ?? 'unknown'} · ${comment.createdAt ?? ''}\n${comment.body}`);
  }
}

function issueLabels(issue) {
  return new Set((issue.labels ?? []).map((label) => typeof label === 'string' ? label : label.name));
}

function editLabels(number, remove, add) {
  const args = ['issue', 'edit', number, '--repo', REPOSITORY];
  for (const label of remove) args.push('--remove-label', label);
  for (const label of add) args.push('--add-label', label);
  gh(args);
}

function readReport(path) {
  if (!path) throw new Error('Provide --report-file PATH containing the structured completion report.');
  let body;
  try {
    body = readFileSync(path, 'utf8');
  } catch {
    throw new Error('Could not read the report file. Check the local path; file contents were not printed.');
  }
  return validateCompletionReport(body);
}

function parseCommandArgs(args) {
  const positional = [];
  let dryRun = false;
  let reportFile;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--dry-run') dryRun = true;
    else if (args[index] === '--report-file') reportFile = args[++index];
    else if (args[index]?.startsWith('--')) throw new Error(`Unknown option: ${args[index]}`);
    else positional.push(args[index]);
  }
  return { positional, dryRun, reportFile };
}

function usage() {
  console.log(`Usage (repo: ${REPOSITORY}):
  npm run handoff -- list
  npm run handoff -- show ISSUE
  npm run handoff -- ack ISSUE [--dry-run]
  npm run handoff -- complete ISSUE --report-file PATH [--dry-run]
  npm run handoff -- blocked ISSUE --report-file PATH [--dry-run]

Issue numbers are mandatory for all issue-specific commands. Acknowledgement and
completion comments are idempotent. The codex-working label guards against a
second claim; only explicitly selected issues are changed.`);
}

export async function main(args = process.argv.slice(2)) {
  const command = args[0];
  if (!command || command === '--help' || command === 'help') return usage();
  const parsed = parseCommandArgs(args.slice(1));
  if (command === 'list') {
    requireAuth();
    const output = gh(['issue', 'list', '--repo', REPOSITORY, '--state', 'open', '--label', LABELS.request, '--limit', '100', '--json', 'number,title,url,labels']);
    console.log(output || '[]');
    return;
  }
  const number = parseIssueNumber(parsed.positional[0]);
  if (command === 'show') {
    requireAuth();
    printIssue(fetchIssue(number));
    return;
  }
  if (!['ack', 'complete', 'blocked'].includes(command)) throw new Error(`Unknown command: ${command}`);
  const marker = `<!-- codex-handoff:${command} -->`;
  let body;
  if (command === 'ack') {
    body = `${marker}\nAcknowledged. Codex has selected this issue and will work only within the scope and acceptance criteria recorded here.`;
  } else {
    body = `${marker}\n${readReport(parsed.reportFile)}`;
  }
  if (parsed.dryRun) {
    console.log(`Would post to ${REPOSITORY}#${number}:\n\n${body}\n`);
    if (command === 'ack') console.log(`Would transition labels: ${LABELS.request} → ${LABELS.working}`);
    if (command === 'complete') console.log(`Would transition labels: ${LABELS.working} → ${LABELS.review}`);
    if (command === 'blocked') console.log(`Would transition labels: ${LABELS.working} → ${LABELS.blocked}`);
    return;
  }
  requireAuth();
  const issue = fetchIssue(number);
  const names = issueLabels(issue);
  if (issue.state !== 'OPEN') throw new Error('Only open issues can be updated by this helper.');

  if (command === 'ack') {
    if (!hasMarker(issue, marker)) {
      assertCanClaim(issue);
      gh(['issue', 'comment', number, '--repo', REPOSITORY, '--body', body]);
    }
    const refreshed = fetchIssue(number);
    if (!issueLabels(refreshed).has(LABELS.working)) {
      assertCanClaim(refreshed);
      editLabels(number, [LABELS.request], [LABELS.working]);
    }
    console.log(`Acknowledgement recorded for ${REPOSITORY}#${number}.`);
    return;
  }

  if (command === 'complete') {
    if (names.has(LABELS.review) && hasMarker(issue, marker)) {
      console.log(`Completion report already recorded for ${REPOSITORY}#${number}.`);
      return;
    }
    if (!names.has(LABELS.working)) throw new Error(`Issue must be labeled ${LABELS.working} before completion.`);
    if (!hasMarker(issue, marker)) gh(['issue', 'comment', number, '--repo', REPOSITORY, '--body', `${marker}\n${body.slice(marker.length).trim()}`]);
    editLabels(number, [LABELS.working, LABELS.request].filter((label) => names.has(label)), [LABELS.review]);
    console.log(`Completion report recorded for ${REPOSITORY}#${number}; ready for ChatGPT review.`);
    return;
  }

  if (names.has(LABELS.blocked) && hasMarker(issue, marker)) {
    console.log(`Blocker report already recorded for ${REPOSITORY}#${number}.`);
    return;
  }
  if (!names.has(LABELS.request) && !names.has(LABELS.working)) {
    throw new Error(`Issue must be labeled ${LABELS.request} or ${LABELS.working} before it can be marked blocked.`);
  }
  if (!hasMarker(issue, marker)) gh(['issue', 'comment', number, '--repo', REPOSITORY, '--body', `${marker}\n${body.slice(marker.length).trim()}`]);
  editLabels(number, [LABELS.request, LABELS.working].filter((label) => names.has(label)), [LABELS.blocked]);
  console.log(`Blocker recorded for ${REPOSITORY}#${number}.`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(`handoff: ${error.message}`);
    process.exitCode = 1;
  });
}
