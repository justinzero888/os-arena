const PRESETS = new Set(['easy', 'medium', 'hard']);

export function acceptSnapshot(current, incoming, expectedSessionId) {
  if (!incoming || incoming.id !== expectedSessionId) return current;
  if (current?.id === incoming.id && incoming.version < current.version) return current;
  return incoming;
}

function canStartRound(state) {
  return state?.status === 'READY' && state.canControl === true && PRESETS.has(state.preset);
}

export function updateStartButton(button, state) {
  button.disabled = !canStartRound(state);
}

// Same version means nothing visible changed except the countdown, so a full repaint would only discard user input.
export function isCountdownOnly(current, incoming) {
  return Boolean(current) && current.id === incoming.id && current.version === incoming.version;
}
