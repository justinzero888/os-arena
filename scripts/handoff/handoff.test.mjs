import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { assertCanClaim, parseIssueNumber, validateCompletionReport } from './handoff.mjs';

test('requires an explicit positive issue number', () => {
  assert.equal(parseIssueNumber('#42'), '42');
  assert.throws(() => parseIssueNumber(undefined), /explicit positive issue number/);
  assert.throws(() => parseIssueNumber('0'), /explicit positive issue number/);
  assert.throws(() => parseIssueNumber('42;rm'), /explicit positive issue number/);
});

test('claim is guarded by the request label and refuses already claimed or reviewed work', () => {
  assert.doesNotThrow(() => assertCanClaim({ state: 'OPEN', labels: [{ name: 'chat-request' }] }));
  assert.throws(() => assertCanClaim({ state: 'OPEN', labels: [{ name: 'codex-working' }] }), /duplicate execution is guarded/);
  assert.throws(() => assertCanClaim({ state: 'OPEN', labels: [{ name: 'codex-review' }] }), /duplicate execution is guarded/);
  assert.throws(() => assertCanClaim({ state: 'CLOSED', labels: [{ name: 'chat-request' }] }), /Only open issues/);
  assert.throws(() => assertCanClaim({ state: 'OPEN', labels: [] }), /must have the chat-request label/);
});

test('completion report must contain all required sections', () => {
  const valid = `# Issue and task summary\n# Repository and branch\n# Commit IDs\n# Files created or changed\n# Tests and checks run\n# Tests not run and why\n# Security and scope checks\n# External service contacted\n# Live test, deployment, or production change\n# Remaining blockers and recommended next step`;
  assert.equal(validateCompletionReport(valid), valid);
  assert.throws(() => validateCompletionReport('# Issue and task summary'), /missing required section/);
});

test('missing GitHub authentication gives a clear error without exposing CLI output', () => {
  const fakeBin = mkdtempSync(join(tmpdir(), 'os-arena-gh-auth-test-'));
  try {
    const fakeGh = join(fakeBin, 'gh');
    writeFileSync(fakeGh, '#!/bin/sh\necho fake-auth-secret >&2\nexit 1\n');
    chmodSync(fakeGh, 0o755);
    const script = fileURLToPath(new URL('./handoff.mjs', import.meta.url));
    const result = spawnSync(process.execPath, [script, 'list'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fakeBin}${delimiter}${process.env.PATH ?? ''}` },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /GitHub CLI is not authenticated.*gh auth login -h github\.com/);
    assert.doesNotMatch(result.stderr, /fake-auth-secret/);
  } finally {
    rmSync(fakeBin, { recursive: true, force: true });
  }
});
