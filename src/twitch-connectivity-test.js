const REQUIRED_SCOPES = Object.freeze([
  'user:bot',
  'user:read:chat',
  'user:write:chat',
]);
const EVENTSUB_URL = 'wss://eventsub.wss.twitch.tv/ws';
const VALIDATE_URL = 'https://id.twitch.tv/oauth2/validate';
const SUBSCRIPTIONS_URL = 'https://api.twitch.tv/helix/eventsub/subscriptions';
const CHAT_MESSAGES_URL = 'https://api.twitch.tv/helix/chat/messages';
const MAX_SEEN_MESSAGE_IDS = 1_000;
const MIN_REPLY_INTERVAL_MS = 5_000;
const ARENA_STATUS_TIMEOUT_MS = 5_000;

export class TwitchConnectivityError extends Error {
  constructor(message, code = 'TWITCH_CONNECTIVITY_ERROR') {
    super(message);
    this.name = 'TwitchConnectivityError';
    this.code = code;
  }
}

export function loadConfig(env = process.env) {
  const required = [
    'TWITCH_CLIENT_ID',
    'TWITCH_USER_ACCESS_TOKEN',
    'TWITCH_BOT_USER_ID',
    'TWITCH_CHANNEL_USER_ID',
  ];
  const missing = required.filter((name) => !String(env[name] ?? '').trim());
  if (missing.length) {
    throw new TwitchConnectivityError(
      `Missing ${missing.join(', ')}. Copy .env.example to .env and fill the local values.`,
      'CONFIG_MISSING',
    );
  }

  const botUserId = String(env.TWITCH_BOT_USER_ID).trim();
  const channelUserId = String(env.TWITCH_CHANNEL_USER_ID).trim();
  if (!/^\d+$/.test(botUserId) || !/^\d+$/.test(channelUserId)) {
    throw new TwitchConnectivityError(
      'TWITCH_BOT_USER_ID and TWITCH_CHANNEL_USER_ID must be numeric Twitch user IDs.',
      'CONFIG_INVALID_ID',
    );
  }

  const arenaEnabled = String(env.ARENA_ENABLED ?? 'false').trim().toLowerCase();
  if (!['false', '0', 'no'].includes(arenaEnabled)) {
    throw new TwitchConnectivityError(
      'This isolated connectivity test requires ARENA_ENABLED=false; it never starts Arena gameplay.',
      'ARENA_MUST_REMAIN_DISABLED',
    );
  }

  const sendSetting = String(env.TWITCH_TEST_SEND_ENABLED ?? 'false').trim().toLowerCase();
  if (!['true', 'false'].includes(sendSetting)) {
    throw new TwitchConnectivityError(
      'TWITCH_TEST_SEND_ENABLED must be exactly true or false.',
      'CONFIG_INVALID_SEND_SETTING',
    );
  }
  const sendEnabled = sendSetting === 'true';
  const confirmedChannelId = String(env.TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID ?? '').trim();
  if (sendEnabled && confirmedChannelId !== channelUserId) {
    throw new TwitchConnectivityError(
      'Live replies require TWITCH_TEST_SEND_CONFIRM_CHANNEL_ID to exactly match TWITCH_CHANNEL_USER_ID.',
      'SEND_CHANNEL_NOT_CONFIRMED',
    );
  }

  const statusUrl = String(env.ARENA_STATUS_URL ?? '').trim();
  if (statusUrl) {
    let parsed;
    try { parsed = new URL(statusUrl); } catch { parsed = null; }
    if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) {
      throw new TwitchConnectivityError(
        'ARENA_STATUS_URL must be an http(s) URL without credentials or fragments.',
        'CONFIG_INVALID_STATUS_URL',
      );
    }
  }

  return Object.freeze({
    clientId: String(env.TWITCH_CLIENT_ID).trim(),
    userAccessToken: String(env.TWITCH_USER_ACCESS_TOKEN).trim(),
    botUserId,
    channelUserId,
    sendEnabled,
    statusUrl,
    arenaEnabled: false,
  });
}

export async function fetchArenaStatus(config, fetchImpl = fetch) {
  if (!config.statusUrl) return { live: false, text: 'Orbace Arena is not currently live.' };
  let response;
  try {
    response = await fetchImpl(config.statusUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(ARENA_STATUS_TIMEOUT_MS),
    });
  } catch {
    return { live: false, text: 'Orbace Arena is not currently live.' };
  }
  if (!response || response.ok === false || (Number.isFinite(response.status) && (response.status < 200 || response.status >= 300))) {
    return { live: false, text: 'Orbace Arena is not currently live.' };
  }
  let snapshot;
  try { snapshot = await response.json(); } catch { return { live: false, text: 'Orbace Arena is not currently live.' }; }
  const status = typeof snapshot?.status === 'string' ? snapshot.status : '';
  if (status !== 'PLAYING') return { live: false, text: 'Orbace Arena is not currently live.' };
  const selectedPreset = typeof snapshot?.preset === 'object'
    ? snapshot.preset
    : Array.isArray(snapshot?.presets)
      ? snapshot.presets.find(preset => preset?.id === snapshot.preset)
      : null;
  const mode = typeof selectedPreset?.name === 'string' ? selectedPreset.name : 'Arena';
  const difficulty = typeof selectedPreset?.difficulty === 'string' ? selectedPreset.difficulty : 'Extreme';
  const seconds = Number.isFinite(snapshot?.secondsRemaining) ? Math.max(0, Math.floor(snapshot.secondsRemaining)) : null;
  const remaining = seconds === null ? '' : ` · ${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')} remaining`;
  return { live: true, text: `Orbace Arena LIVE — ${mode} · ${difficulty}${remaining}` };
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function networkFailure(action) {
  return new TwitchConnectivityError(
    `${action} could not reach Twitch. Check network/DNS and try again; credentials were not logged.`,
    'TWITCH_NETWORK_ERROR',
  );
}

export async function validateUserAccessToken(config, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(VALIDATE_URL, {
      method: 'GET',
      headers: { Authorization: `OAuth ${config.userAccessToken}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw networkFailure('Token validation');
  }

  if (response.status !== 200) {
    const hint = response.status === 401
      ? 'Regenerate the user access token and ensure it is not expired or revoked.'
      : 'Check Twitch availability and retry.';
    throw new TwitchConnectivityError(
      `Twitch token validation failed (HTTP ${response.status}). ${hint}`,
      'TOKEN_VALIDATION_FAILED',
    );
  }

  const tokenInfo = await safeJson(response);
  if (!tokenInfo || typeof tokenInfo !== 'object') {
    throw new TwitchConnectivityError('Twitch token validation returned an unreadable response.', 'TOKEN_RESPONSE_INVALID');
  }
  if (tokenInfo.client_id !== config.clientId) {
    throw new TwitchConnectivityError(
      'The token belongs to a different Twitch application. Check TWITCH_CLIENT_ID.',
      'TOKEN_CLIENT_MISMATCH',
    );
  }
  if (tokenInfo.user_id !== config.botUserId) {
    throw new TwitchConnectivityError(
      'The token user does not match TWITCH_BOT_USER_ID. Use the bot account’s user access token.',
      'TOKEN_USER_MISMATCH',
    );
  }
  const scopes = Array.isArray(tokenInfo.scopes) ? tokenInfo.scopes : [];
  const missingScopes = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length) {
    throw new TwitchConnectivityError(
      `The token is missing required scope(s): ${missingScopes.join(', ')}. Re-authorize the bot account with all three documented scopes.`,
      'TOKEN_SCOPES_MISSING',
    );
  }
  if (Number(tokenInfo.expires_in) <= 0) {
    throw new TwitchConnectivityError('The Twitch access token is expired.', 'TOKEN_EXPIRED');
  }
  return { scopes, expiresIn: Number(tokenInfo.expires_in) };
}

function apiHeaders(config) {
  return {
    Authorization: `Bearer ${config.userAccessToken}`,
    'Client-Id': config.clientId,
    'Content-Type': 'application/json',
  };
}

function httpFailureLabel(action, status) {
  if (status === 401) return `${action} failed (HTTP 401). Check token validity, bot identity, client ID, and required scopes.`;
  if (status === 403) return `${action} failed (HTTP 403). Confirm the bot is allowed to access the designated channel.`;
  if (status === 429) return `${action} failed (HTTP 429). Twitch rate-limited the request; wait before retrying.`;
  return `${action} failed (HTTP ${status}). Check the configured IDs and Twitch API availability.`;
}

export async function createChatMessageSubscription(config, sessionId, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(SUBSCRIPTIONS_URL, {
      method: 'POST',
      headers: apiHeaders(config),
      body: JSON.stringify({
        type: 'channel.chat.message',
        version: '1',
        condition: {
          broadcaster_user_id: config.channelUserId,
          user_id: config.botUserId,
        },
        transport: { method: 'websocket', session_id: sessionId },
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw networkFailure('EventSub subscription');
  }

  if (response.status !== 202) {
    throw new TwitchConnectivityError(
      httpFailureLabel('EventSub chat subscription', response.status),
      'EVENTSUB_SUBSCRIPTION_FAILED',
    );
  }
  const payload = await safeJson(response);
  const subscriptionId = payload?.data?.[0]?.id;
  if (!subscriptionId) {
    throw new TwitchConnectivityError('Twitch accepted the subscription request without a subscription ID.', 'EVENTSUB_RESPONSE_INVALID');
  }
  return subscriptionId;
}

export async function sendChatMessage(config, message, fetchImpl = fetch) {
  if (!config.sendEnabled) {
    return { sent: false, skipped: true, reason: 'send-disabled' };
  }
  let response;
  try {
    response = await fetchImpl(CHAT_MESSAGES_URL, {
      method: 'POST',
      headers: apiHeaders(config),
      body: JSON.stringify({
        broadcaster_id: config.channelUserId,
        sender_id: config.botUserId,
        message,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw networkFailure('Chat message submission');
  }

  if (response.status !== 200) {
    throw new TwitchConnectivityError(
      httpFailureLabel('Chat message submission', response.status),
      'CHAT_MESSAGE_FAILED',
    );
  }
  const payload = await safeJson(response);
  const result = payload?.data?.[0];
  if (result?.is_sent !== true) {
    const dropCode = result?.drop_reason?.code;
    const suffix = typeof dropCode === 'string' ? ` Twitch drop code: ${dropCode}.` : '';
    throw new TwitchConnectivityError(
      `Twitch returned HTTP 200 but did not send the chat message.${suffix}`,
      'CHAT_MESSAGE_DROPPED',
    );
  }
  return { sent: true, messageId: result.message_id ?? null };
}

export function createChatMessageProcessor({
  config,
  sendMessage = (message) => sendChatMessage(config, message),
  arenaStatus = () => fetchArenaStatus(config),
  logger = console,
  now = Date.now,
  cooldownMs = MIN_REPLY_INTERVAL_MS,
  maxSeen = MAX_SEEN_MESSAGE_IDS,
}) {
  const seenMessageIds = new Map();
  let lastSendAttempt = null;

  return async function processChatNotification(envelope) {
    const messageId = envelope?.metadata?.message_id;
    const event = envelope?.payload?.event;
    if (envelope?.metadata?.message_type !== 'notification'
      || envelope?.metadata?.subscription_type !== 'channel.chat.message'
      || !event || typeof event !== 'object') {
      return { handled: false, reason: 'not-chat-message' };
    }
    const text = typeof event.message?.text === 'string' ? event.message.text : null;
    const fragments = Array.isArray(event.message?.fragments)
      ? event.message.fragments.map((fragment) => ({
        type: typeof fragment?.type === 'string' ? fragment.type : null,
        text: typeof fragment?.text === 'string' ? fragment.text : null,
      }))
      : [];
    const broadcasterMatchesConfiguredChannel = event.broadcaster_user_id === config.channelUserId;
    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const matcherAccepts = normalizedText === 'Hey Guys' || normalizedText === '!arena';
    logger.info(JSON.stringify({
      'event.message.text': text,
      'event.message.fragments': fragments,
      broadcasterMatchesConfiguredChannel,
      matcherAccepts,
    }));
    if (typeof messageId !== 'string' || !messageId) {
      logger.warn('Ignored chat notification without an EventSub message ID.');
      return { handled: false, reason: 'missing-message-id' };
    }
    if (seenMessageIds.has(messageId)) {
      logger.info('Ignored duplicate EventSub chat notification.');
      return { handled: false, reason: 'duplicate' };
    }
    seenMessageIds.set(messageId, true);
    if (seenMessageIds.size > maxSeen) {
      seenMessageIds.delete(seenMessageIds.keys().next().value);
    }

    if (!broadcasterMatchesConfiguredChannel) {
      logger.warn('Ignored chat notification for an unexpected channel.');
      return { handled: false, reason: 'unexpected-channel' };
    }
    if (event.chatter_user_id === config.botUserId) {
      logger.info('Ignored bot-authored chat message.');
      return { handled: true, reason: 'bot-message' };
    }

    if (!matcherAccepts) return { handled: true, reason: 'no-match' };
    if (!config.sendEnabled) {
      logger.info('Hey Guys trigger received; live reply skipped because TWITCH_TEST_SEND_ENABLED is false.');
      return { handled: true, reason: 'send-disabled' };
    }

    const currentTime = now();
    if (lastSendAttempt !== null && currentTime - lastSendAttempt < cooldownMs) {
      logger.warn(`Hey Guys trigger ignored by the ${cooldownMs}ms local send cooldown.`);
      return { handled: true, reason: 'rate-limited' };
    }
    lastSendAttempt = currentTime;
    try {
      const reply = normalizedText === '!arena' ? (await arenaStatus()).text : 'VoHiYo';
      const result = await sendMessage(reply);
      if (!result?.sent) {
        logger.warn('Twitch did not confirm that VoHiYo was sent.');
        return { handled: true, reason: 'not-sent' };
      }
      logger.info(`Twitch confirmed ${normalizedText === '!arena' ? '!arena status' : 'VoHiYo'} submission${result.messageId ? ` (message id=${result.messageId})` : ''}.`);
      return { handled: true, reason: 'sent' };
    } catch (error) {
      const message = error instanceof TwitchConnectivityError
        ? error.message
        : 'Chat message submission failed; check the Twitch API connection.';
      logger.error(message);
      return { handled: true, reason: 'send-failed' };
    }
  };
}

export async function startConnectivityTest(config, {
  fetchImpl = fetch,
  WebSocketCtor = globalThis.WebSocket,
  logger = console,
} = {}) {
  if (typeof WebSocketCtor !== 'function') {
    throw new TwitchConnectivityError(
      'This Node runtime does not provide the built-in WebSocket API. Use Node.js 22 or later.',
      'WEBSOCKET_UNAVAILABLE',
    );
  }
  const token = await validateUserAccessToken(config, fetchImpl);
  logger.info(`Twitch credentials validated for bot ${config.botUserId}; required scopes present; expires in ${token.expiresIn}s.`);
  logger.info(`Arena gameplay remains disabled; live chat replies are ${config.sendEnabled ? 'enabled for the explicitly confirmed channel' : 'disabled'}.`);

  const socket = new WebSocketCtor(EVENTSUB_URL);
  let readySettled = false;
  let welcomeHandled = false;
  let stopRequested = false;
  let resolveReady;
  let rejectReady;
  let resolveClosed;
  let rejectClosed;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  const closed = new Promise((resolve, reject) => { resolveClosed = resolve; rejectClosed = reject; });
  closed.catch(() => {});
  const processor = createChatMessageProcessor({
    config,
    sendMessage: (message) => sendChatMessage(config, message, fetchImpl),
    logger,
  });
  let eventQueue = Promise.resolve();

  const settleReady = (error, value) => {
    if (readySettled) return;
    readySettled = true;
    if (error) rejectReady(error);
    else resolveReady(value);
  };
  const fail = (error) => {
    logger.error(error.message);
    settleReady(error);
    try { socket.close(); } catch { /* The socket may already be closed. */ }
  };

  socket.addEventListener('open', () => {
    logger.info('EventSub WebSocket connected.');
  });
  socket.addEventListener('error', () => {
    fail(new TwitchConnectivityError('EventSub WebSocket reported an error; connection is not healthy.', 'WEBSOCKET_ERROR'));
  });
  socket.addEventListener('close', (event) => {
    const detail = `EventSub WebSocket closed (code ${event.code}${event.reason ? `, ${event.reason}` : ''}).`;
    if (stopRequested) {
      logger.info('EventSub WebSocket closed cleanly.');
      resolveClosed();
      return;
    }
    const error = new TwitchConnectivityError(`${detail} The connectivity test stopped unexpectedly.`, 'WEBSOCKET_CLOSED');
    logger.error(error.message);
    settleReady(error);
    rejectClosed(error);
  });
  socket.addEventListener('message', (frame) => {
    let envelope;
    try {
      envelope = JSON.parse(String(frame.data));
    } catch {
      fail(new TwitchConnectivityError('Received an unreadable EventSub frame.', 'EVENTSUB_FRAME_INVALID'));
      return;
    }
    const messageType = envelope?.metadata?.message_type;
    if (messageType === 'session_welcome') {
      if (welcomeHandled) return;
      welcomeHandled = true;
      const sessionId = envelope?.payload?.session?.id;
      if (typeof sessionId !== 'string' || !sessionId) {
        fail(new TwitchConnectivityError('EventSub welcome did not contain a session ID.', 'EVENTSUB_SESSION_MISSING'));
        return;
      }
      logger.info('EventSub session welcome received.');
      createChatMessageSubscription(config, sessionId, fetchImpl)
        .then((subscriptionId) => {
          logger.info(`Subscribed to channel.chat.message (subscription id=${subscriptionId}).`);
          settleReady(null, {
            closed,
            close() {
              if (stopRequested) return closed;
              stopRequested = true;
              logger.info('Stopping Twitch connectivity test.');
              try { socket.close(1000, 'operator shutdown'); } catch { resolveClosed(); }
              return closed;
            },
          });
        })
        .catch((error) => fail(error));
      return;
    }
    if (messageType === 'notification' && envelope?.metadata?.subscription_type === 'channel.chat.message') {
      eventQueue = eventQueue
        .then(() => processor(envelope))
        .catch(() => logger.error('Chat event processing failed; the raw event was not logged.'));
      return;
    }
    if (messageType === 'session_keepalive') {
      logger.info('EventSub keepalive received.');
      return;
    }
    if (messageType === 'session_reconnect') {
      fail(new TwitchConnectivityError(
        'Twitch requested an EventSub reconnect. This smoke test stops safely; restart it to establish a fresh session.',
        'EVENTSUB_RECONNECT_REQUIRED',
      ));
      return;
    }
    if (messageType === 'revocation') {
      const status = envelope?.payload?.subscription?.status ?? 'unknown';
      fail(new TwitchConnectivityError(`Twitch revoked the EventSub subscription (status: ${status}). Revalidate token and scopes.`, 'EVENTSUB_REVOKED'));
    }
  });

  return ready;
}

async function main() {
  try {
    const config = loadConfig();
    const client = await startConnectivityTest(config);
    process.once('SIGINT', () => { void client.close(); });
    process.once('SIGTERM', () => { void client.close(); });
    await client.closed;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected startup failure.';
    console.error(`Twitch connectivity test failed: ${message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  void main();
}
