import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createChatMessageProcessor,
  createChatMessageSubscription,
  fetchArenaStatus,
  loadConfig,
  sendChatMessage,
  startConnectivityTest,
  validateUserAccessToken,
} from '../src/twitch-connectivity-test.js';

const validEnv = (extra = {}) => ({
  TWITCH_CLIENT_ID: 'client-id-for-test',
  TWITCH_USER_ACCESS_TOKEN: 'test-token-only',
  TWITCH_BOT_USER_ID: '100',
  TWITCH_CHANNEL_USER_ID: '200',
  ...extra,
});
const validTokenInfo = (extra = {}) => ({
  client_id: 'client-id-for-test',
  user_id: '100',
  scopes: ['user:bot', 'user:read:chat', 'user:write:chat'],
  expires_in: 3600,
  ...extra,
});
const mockResponse = (status, body) => ({ status, json: async () => body });
const notification = ({ id = 'event-1', text = 'Hey Guys', fragments = [], chatterId = '300', channelId = '200' } = {}) => ({
  metadata: { message_type: 'notification', subscription_type: 'channel.chat.message', message_id: id },
  payload: { event: { broadcaster_user_id: channelId, chatter_user_id: chatterId, message: { text, fragments } } },
});
const quietLogger = () => ({ info() {}, warn() {}, error() {} });

class FakeWebSocket extends EventTarget {
  static latest;

  constructor(url) {
    super();
    this.url = url;
    FakeWebSocket.latest = this;
    queueMicrotask(() => {
      this.dispatchEvent(new Event('open'));
      this.deliver({ metadata: { message_type: 'session_welcome' }, payload: { session: { id: 'session-test' } } });
    });
  }

  deliver(data) {
    const event = new Event('message');
    Object.defineProperty(event, 'data', { value: JSON.stringify(data) });
    this.dispatchEvent(event);
  }

  close(code = 1000, reason = '') {
    const event = new Event('close');
    Object.defineProperties(event, { code: { value: code }, reason: { value: reason } });
    this.dispatchEvent(event);
  }
}

test('Arena stays disabled and live sending defaults off', () => {
  const config = loadConfig(validEnv());
  assert.equal(config.arenaEnabled, false);
  assert.equal(config.sendEnabled, false);
});

test('live sending requires an explicit channel confirmation', () => {
  assert.throws(
    () => loadConfig(validEnv({ TWITCH_TEST_SEND_ENABLED: 'true' })),
    /TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID/,
  );
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  assert.equal(config.sendEnabled, true);
});

test('incomplete configuration fails safely and ARENA_ENABLED cannot be turned on', () => {
  assert.throws(() => loadConfig({}), /Missing TWITCH_CLIENT_ID/);
  assert.throws(() => loadConfig(validEnv({ ARENA_ENABLED: 'true' })), /requires ARENA_ENABLED=false/);
});

test('processor matches Hey Guys exactly after trimming whitespace', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  const sent = [];
  const process = createChatMessageProcessor({ config, sendMessage: async (message) => { sent.push(message); return { sent: true }; }, logger: quietLogger(), now: () => 10_000 });
  assert.equal((await process(notification({ text: '  Hey Guys \n' }))).reason, 'sent');
  assert.deepEqual(sent, ['VoHiYo']);
});

test('!arena sends only a safe public status projection', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
    ARENA_STATUS_URL: 'http://127.0.0.1:4183/api/arena/sessions/demo',
  }));
  const sent = [];
  const process = createChatMessageProcessor({
    config,
    arenaStatus: async () => ({ live: true, text: 'Orbace Arena LIVE — Quick · Extreme · 03:00 remaining' }),
    sendMessage: async (message) => { sent.push(message); return { sent: true }; },
    logger: quietLogger(),
  });
  assert.equal((await process(notification({ text: '!arena' }))).reason, 'sent');
  assert.deepEqual(sent, ['Orbace Arena LIVE — Quick · Extreme · 03:00 remaining']);
});

test('!arena returns a safe inactive response when no status URL is configured', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  const sent = [];
  const process = createChatMessageProcessor({ config, sendMessage: async (message) => { sent.push(message); return { sent: true }; }, logger: quietLogger() });
  assert.equal((await process(notification({ text: '!arena' }))).reason, 'sent');
  assert.deepEqual(sent, ['Orbace Arena is not currently live.']);
});

test('Arena status formatter fails closed and never exposes private fields', async () => {
  const config = loadConfig(validEnv({ ARENA_STATUS_URL: 'http://arena.test/status' }));
  const live = await fetchArenaStatus(config, async () => mockResponse(200, {
    status: 'PLAYING',
    preset: 'standard',
    presets: [
      { id: 'quick', name: 'Quick', difficulty: 'Extreme' },
      { id: 'standard', name: 'Standard', difficulty: 'Extreme' },
    ],
    secondsRemaining: 252,
    puzzle: { id: 'private-id', solution: 'private-solution' },
  }));
  assert.deepEqual(live, { live: true, text: 'Orbace Arena LIVE — Standard · Extreme · 04:12 remaining' });
  const inactive = await fetchArenaStatus(config, async () => mockResponse(503, {}));
  assert.deepEqual(inactive, { live: false, text: 'Orbace Arena is not currently live.' });
});

test('invalid Arena status URL is rejected safely', () => {
  assert.throws(() => loadConfig(validEnv({ ARENA_STATUS_URL: 'file:///tmp/status' })), /ARENA_STATUS_URL/);
  assert.throws(() => loadConfig(validEnv({ ARENA_STATUS_URL: 'https://user:pass@example.test/status' })), /ARENA_STATUS_URL/);
});

test('other messages do not trigger and matching is case-sensitive', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  let sends = 0;
  const process = createChatMessageProcessor({ config, sendMessage: async () => { sends += 1; return { sent: true }; }, logger: quietLogger(), now: () => 10_000 });
  assert.equal((await process(notification({ id: 'event-1', text: 'heyguys' }))).reason, 'no-match');
  assert.equal((await process(notification({ id: 'event-2', text: 'HeyGuys' }))).reason, 'no-match');
  assert.equal((await process(notification({ id: 'event-3', text: 'Hey Guys!' }))).reason, 'no-match');
  assert.equal(sends, 0);
});

test('chat diagnostics log only text, fragment type/text, channel match, and matcher result', async () => {
  const config = loadConfig(validEnv());
  const logs = [];
  const logger = { info: (message) => logs.push(message), warn() {}, error() {} };
  const process = createChatMessageProcessor({ config, logger });

  await process(notification({
    text: 'HeyGuys',
    fragments: [{ type: 'emote', text: 'HeyGuys', emote: { id: 'unlogged' } }],
  }));

  assert.deepEqual(JSON.parse(logs[0]), {
    'event.message.text': 'HeyGuys',
    'event.message.fragments': [{ type: 'emote', text: 'HeyGuys' }],
    broadcasterMatchesConfiguredChannel: true,
    matcherAccepts: false,
  });
  assert.equal(logs.length, 1);
});

test('a message from a different broadcaster is diagnosed and never sent', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  const logs = [];
  let sends = 0;
  const logger = { info: (message) => logs.push(message), warn: (message) => logs.push(message), error() {} };
  const process = createChatMessageProcessor({
    config,
    sendMessage: async () => { sends += 1; return { sent: true }; },
    logger,
  });

  const result = await process(notification({ channelId: '1548437801' }));

  assert.equal(result.reason, 'unexpected-channel');
  assert.deepEqual(JSON.parse(logs[0]), {
    'event.message.text': 'Hey Guys',
    'event.message.fragments': [],
    broadcasterMatchesConfiguredChannel: false,
    matcherAccepts: true,
  });
  assert.equal(logs[1], 'Ignored chat notification for an unexpected channel.');
  assert.equal(sends, 0);
});

test('bot-authored messages and duplicate EventSub deliveries are ignored', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  let sends = 0;
  const process = createChatMessageProcessor({ config, sendMessage: async () => { sends += 1; return { sent: true }; }, logger: quietLogger(), now: () => 10_000 });
  assert.equal((await process(notification({ chatterId: '100' }))).reason, 'bot-message');
  assert.equal((await process(notification({ id: 'event-2' }))).reason, 'sent');
  assert.equal((await process(notification({ id: 'event-2' }))).reason, 'duplicate');
  assert.equal(sends, 1);
});

test('processor does not send when the explicit opt-in is disabled', async () => {
  const config = loadConfig(validEnv());
  let sends = 0;
  const process = createChatMessageProcessor({ config, sendMessage: async () => { sends += 1; return { sent: true }; }, logger: quietLogger() });
  assert.equal((await process(notification())).reason, 'send-disabled');
  assert.equal(sends, 0);
});

test('processor enforces a local send cooldown', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  let now = 10_000;
  let sends = 0;
  const process = createChatMessageProcessor({ config, sendMessage: async () => { sends += 1; return { sent: true }; }, logger: quietLogger(), now: () => now, cooldownMs: 5000 });
  assert.equal((await process(notification({ id: 'event-1' }))).reason, 'sent');
  now += 1000;
  assert.equal((await process(notification({ id: 'event-2' }))).reason, 'rate-limited');
  assert.equal(sends, 1);
});

test('token validation uses OAuth header and checks client, bot, and scopes', async () => {
  const config = loadConfig(validEnv());
  const result = await validateUserAccessToken(config, async (url, options) => {
    assert.equal(url, 'https://id.twitch.tv/oauth2/validate');
    assert.equal(options.headers.Authorization, 'OAuth test-token-only');
    return mockResponse(200, validTokenInfo());
  });
  assert.deepEqual(result.scopes, ['user:bot', 'user:read:chat', 'user:write:chat']);
});

test('token mismatch, missing scopes, and Twitch authentication failures are actionable and secret-free', async (t) => {
  const config = loadConfig(validEnv());
  await t.test('bot identity mismatch', async () => {
    await assert.rejects(validateUserAccessToken(config, async () => mockResponse(200, validTokenInfo({ user_id: '999' }))), /does not match TWITCH_BOT_USER_ID/);
  });
  await t.test('missing scopes', async () => {
    await assert.rejects(validateUserAccessToken(config, async () => mockResponse(200, validTokenInfo({ scopes: ['user:read:chat'] }))), /user:bot, user:write:chat/);
  });
  await t.test('401 does not leak token', async () => {
    await assert.rejects(
      validateUserAccessToken(config, async () => mockResponse(401, { message: 'test-token-only invalid' })),
      (error) => error.message.includes('Regenerate the user access token') && !error.message.includes('test-token-only'),
    );
  });
});

test('subscription uses the user token, IDs, WebSocket transport, and session ID', async () => {
  const config = loadConfig(validEnv());
  const id = await createChatMessageSubscription(config, 'session-test', async (url, options) => {
    assert.equal(url, 'https://api.twitch.tv/helix/eventsub/subscriptions');
    assert.equal(options.headers.Authorization, 'Bearer test-token-only');
    assert.equal(options.headers['Client-Id'], 'client-id-for-test');
    assert.deepEqual(JSON.parse(options.body), {
      type: 'channel.chat.message',
      version: '1',
      condition: { broadcaster_user_id: '200', user_id: '100' },
      transport: { method: 'websocket', session_id: 'session-test' },
    });
    return mockResponse(202, { data: [{ id: 'subscription-test' }] });
  });
  assert.equal(id, 'subscription-test');
});

test('subscription failures report status without exposing credentials', async () => {
  const config = loadConfig(validEnv());
  await assert.rejects(
    createChatMessageSubscription(config, 'session-test', async () => mockResponse(403, { message: 'test-token-only forbidden' })),
    (error) => error.message.includes('HTTP 403') && !error.message.includes('test-token-only'),
  );
});

test('send API uses the configured test channel and confirms Twitch accepted the reply', async () => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  const result = await sendChatMessage(config, 'VoHiYo', async (url, options) => {
    assert.equal(url, 'https://api.twitch.tv/helix/chat/messages');
    assert.equal(options.headers.Authorization, 'Bearer test-token-only');
    assert.deepEqual(JSON.parse(options.body), { broadcaster_id: '200', sender_id: '100', message: 'VoHiYo' });
    return mockResponse(200, { data: [{ message_id: 'reply-1', is_sent: true }] });
  });
  assert.deepEqual(result, { sent: true, messageId: 'reply-1' });
});

test('send API errors and dropped responses are reported without leaking credentials', async (t) => {
  const config = loadConfig(validEnv({
    TWITCH_TEST_SEND_ENABLED: 'true',
    TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID: '200',
  }));
  await t.test('HTTP failure', async () => {
    await assert.rejects(
      sendChatMessage(config, 'VoHiYo', async () => mockResponse(429, { message: 'test-token-only rate limit' })),
      (error) => error.message.includes('HTTP 429') && !error.message.includes('test-token-only'),
    );
  });
  await t.test('HTTP 200 dropped message', async () => {
    await assert.rejects(
      sendChatMessage(config, 'VoHiYo', async () => mockResponse(200, { data: [{ is_sent: false, drop_reason: { code: 'SLOW_MODE' } }] })),
      /did not send.*SLOW_MODE/,
    );
  });
});

test('isolated startup validates token, receives welcome, subscribes, and closes cleanly with a fake WebSocket', async () => {
  const config = loadConfig(validEnv());
  const logger = quietLogger();
  const calls = [];
  const client = await startConnectivityTest(config, {
    logger,
    WebSocketCtor: FakeWebSocket,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === 'https://id.twitch.tv/oauth2/validate') return mockResponse(200, validTokenInfo());
      return mockResponse(202, { data: [{ id: 'subscription-test' }] });
    },
  });
  assert.equal(FakeWebSocket.latest.url, 'wss://eventsub.wss.twitch.tv/ws');
  assert.equal(calls.length, 2);
  assert.equal((await client.close()), undefined);
});
