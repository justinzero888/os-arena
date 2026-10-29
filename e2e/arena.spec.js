import { expect, test } from '@playwright/test';
import { createArenaServer } from '../src/arena-server.js';
import { puzzleForRound } from '../src/arena-engine.js';

test('feature flag off keeps Arena API unavailable in a browser', async ({ page }) => {
  const server = createArenaServer({ enabled: false });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  try {
    await page.goto(`http://127.0.0.1:${address.port}/`);
    const result = await page.evaluate(async () => {
      const response = await fetch('/api/arena/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultPreset: 'easy' }),
      });
      return { status: response.status, body: await response.json() };
    });
    expect(result).toEqual({ status: 404, body: { error: 'ARENA_DISABLED' } });
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('host and guest complete a safe round without exposing solution or host capability', async ({ browser, page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Arena' }).click();
  await expect(page).toHaveURL(/\/host\/[A-Za-z0-9_-]+$/);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1);
  const audienceContext = await browser.newContext();
  const audience = await audienceContext.newPage();
  const solution = puzzleForRound(0).solution;

  const observedAudiencePayloads = [];
  audience.on('response', async response => {
    if (!response.url().includes('/api/arena/sessions/')) return;
    try {
      const payload = await response.json();
      observedAudiencePayloads.push(JSON.stringify(payload));
    } catch { /* Ignore non-JSON responses; assertions inspect successful API calls below. */ }
  });

  try {
    await audience.goto(`/join/${sessionId}`);
    await expect(audience.getByText(/vote is open/i)).toBeVisible();

    const publicState = await audience.evaluate(async id => {
      const response = await fetch(`/api/arena/sessions/${id}`, { cache: 'no-store' });
      return { status: response.status, state: await response.json() };
    }, sessionId);
    expect(publicState.status).toBe(200);
    expect(publicState.state.status).toBe('PRESET_VOTE');
    expect(JSON.stringify(publicState.state)).not.toContain(solution);
    expect(publicState.state).not.toHaveProperty('hostToken');

    const unauthorizedHostView = await audience.evaluate(async id => {
      const response = await fetch(`/api/arena/sessions/${id}/host`, { cache: 'no-store' });
      return response.status;
    }, sessionId);
    expect(unauthorizedHostView).toBe(403);

    await audience.getByLabel(/Medium Match/).check();
    await audience.getByRole('button', { name: 'Cast / change vote' }).click();
    await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled();
    await expect(page.getByText('Preset vote closed — ready to start')).toBeVisible({ timeout: 7_000 });
    await expect(page.getByRole('button', { name: 'Start round' })).toBeEnabled();
    await page.getByRole('button', { name: 'Start round' }).click();
    await expect(page.getByText('Round in progress')).toBeVisible();

    for (const cell of await page.locator('input.cell').all()) {
      const index = Number(await cell.getAttribute('data-index'));
      await cell.fill(solution[index]);
    }
    await page.getByRole('button', { name: 'Submit full solution' }).click();
    await expect(page.getByText('Host wins — solved before the deadline.')).toBeVisible();

    const terminalPublicState = await audience.evaluate(async id => {
      const response = await fetch(`/api/arena/sessions/${id}`, { cache: 'no-store' });
      return { status: response.status, state: await response.json() };
    }, sessionId);
    expect(terminalPublicState.status).toBe(200);
    expect(terminalPublicState.state.result).toEqual({ winner: 'host', reason: 'SOLVED' });
    expect(JSON.stringify(terminalPublicState.state)).not.toContain(solution);
    expect(terminalPublicState.state).not.toHaveProperty('canControl');
    expect(terminalPublicState.state).not.toHaveProperty('hostToken');
    await expect.poll(() => observedAudiencePayloads.length).toBeGreaterThan(0);
    expect(observedAudiencePayloads.every(payload => !payload.includes(solution))).toBe(true);
  } finally {
    await audienceContext.close();
  }
});
