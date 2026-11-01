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
        body: JSON.stringify({ defaultPreset: 'quick' }),
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
    await expect(audience.getByText(/Lobby open/i)).toBeVisible();
    await expect(page.getByText(/1 connected guest/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start round' })).toBeHidden();
    await page.getByRole('button', { name: 'Open voting' }).click();
    await expect(audience.getByText(/time-mode vote is open/i)).toBeVisible();
    await expect(audience.getByText(/Voting closes in/)).toBeVisible();

    const publicState = await audience.evaluate(async id => {
      const response = await fetch(`/api/arena/sessions/${id}`, { cache: 'no-store' });
      return { status: response.status, state: await response.json() };
    }, sessionId);
    expect(publicState.status).toBe(200);
    expect(publicState.state.status).toBe('VOTING');
    expect(JSON.stringify(publicState.state)).not.toContain(solution);
    expect(publicState.state).not.toHaveProperty('hostToken');

    const unauthorizedHostView = await audience.evaluate(async id => {
      const response = await fetch(`/api/arena/sessions/${id}/host`, { cache: 'no-store' });
      return response.status;
    }, sessionId);
    expect(unauthorizedHostView).toBe(403);

    await audience.getByLabel(/Standard/).check();
    await audience.getByRole('button', { name: 'Cast / change vote' }).click();
    await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled();
    await expect(page.getByText('Time-mode vote closed — ready to start')).toBeVisible({ timeout: 7_000 });
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


test('host cannot start an empty ballot after voting closes', async ({ browser, page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Arena' }).click();
  await expect(page).toHaveURL(/\/host\/[A-Za-z0-9_-]+$/);
  const id = new URL(page.url()).pathname.split('/').at(-1);
  const context = await browser.newContext();
  try {
    const guest = await context.newPage(); await guest.goto(`/join/${id}`);
    await expect(guest.getByText('You joined the crowd. Wait for the host to open voting.')).toBeVisible();
    await expect(page.getByText(/1 connected guest/)).toBeVisible();
    await page.getByRole('button', { name: 'Open voting' }).click();
    await expect(page.getByText('Time-mode vote closed — ready to start')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Start round' })).toBeDisabled();
    await expect(page.getByText(/0 vote\(s\) received/)).toBeVisible();
  } finally { await context.close(); }
});

test('three isolated guests and an overlay recover refreshes without normal-pilot rate limiting', async ({ browser, page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Arena' }).click();
  await expect(page).toHaveURL(/\/host\/[A-Za-z0-9_-]+$/);
  const sessionId = new URL(page.url()).pathname.split('/').at(-1);
  const solution = puzzleForRound(0).solution;
  const guestContexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const guestPages = await Promise.all(guestContexts.map(context => context.newPage()));
  const overlayContext = await browser.newContext();
  const overlay = await overlayContext.newPage();
  const rateLimitedRequests = [];
  const watchForRateLimits = candidate => candidate.on('response', response => {
    if (response.status() === 429 && response.url().includes('/api/arena/')) rateLimitedRequests.push(response.url());
  });
  [page, ...guestPages, overlay].forEach(watchForRateLimits);

  try {
    await Promise.all(guestPages.map(guest => guest.goto(`/join/${sessionId}`)));
    await overlay.goto(`/overlay/${sessionId}`);
    await expect(page.getByText(/3 connected guest/)).toBeVisible();
    await expect(overlay.getByText(/Lobby open/i)).toBeVisible();
    await page.getByRole('button', { name: 'Open voting' }).click();
    await Promise.all(guestPages.map(guest => expect(guest.getByText(/time-mode vote is open/i)).toBeVisible()));

    for (const [index, guest] of guestPages.entries()) {
      await guest.getByLabel(index === 1 ? /Standard/ : /Quick/).check();
      await guest.getByRole('button', { name: 'Cast / change vote' }).click();
    }
    await guestPages[0].getByLabel(/Standard/).check();
    await guestPages[0].getByRole('button', { name: 'Cast / change vote' }).click();
    await expect(page.getByText(/3 vote\(s\) received/)).toBeVisible();
    await expect(page.getByText('Time-mode vote closed — ready to start')).toBeVisible({ timeout: 7_000 });
    await expect(page.getByText('Time mode: Standard')).toBeVisible();
    await page.getByRole('button', { name: 'Start round' }).click();
    await Promise.all([page, ...guestPages, overlay].map(candidate => expect(candidate.getByText('Round in progress')).toBeVisible()));
    await Promise.all([...guestPages, overlay].map(async candidate => {
      await expect(candidate.locator('#board')).not.toHaveClass(/hidden/);
      await expect(candidate.locator('#board .cell')).toHaveCount(81);
    }));

    const playingSnapshots = await Promise.all([page, ...guestPages, overlay].map(candidate => candidate.evaluate(async id => {
      const response = await fetch(`/api/arena/sessions/${id}`, { cache: 'no-store' });
      return response.json();
    }, sessionId)));
    expect(playingSnapshots.every(snapshot => snapshot.status === 'PLAYING')).toBe(true);
    const seconds = playingSnapshots.map(snapshot => snapshot.secondsRemaining);
    expect(Math.max(...seconds) - Math.min(...seconds)).toBeLessThanOrEqual(1);

    await guestPages[1].reload();
    await overlay.reload();
    await expect(guestPages[1].getByText('Round in progress')).toBeVisible();
    await expect(overlay.getByText('Round in progress')).toBeVisible();

    for (const cell of await page.locator('input.cell').all()) {
      const index = Number(await cell.getAttribute('data-index'));
      await cell.fill(solution[index]);
    }
    await page.getByRole('button', { name: 'Submit full solution' }).click();
    await Promise.all([page, ...guestPages, overlay].map(candidate => expect(candidate.getByText('Host wins — solved before the deadline.')).toBeVisible()));
    expect(rateLimitedRequests).toEqual([]);
    await Promise.all([page, ...guestPages, overlay].map(candidate => expect(candidate.locator('#error')).toHaveText('')));
  } finally {
    await Promise.all([...guestContexts, overlayContext].map(context => context.close()));
  }
});
