const PRESETS = new Set(['quick', 'standard', 'endurance']);

export function acceptSnapshot(current, incoming, expectedSessionId) {
  if (!incoming || (expectedSessionId !== 'live' && incoming.id !== expectedSessionId)) return current;
  if (expectedSessionId === 'live' && current?.sessionSequence != null && incoming.sessionSequence != null && incoming.sessionSequence < current.sessionSequence) return current;
  if (current?.id === incoming.id && incoming.version < current.version) return current;
  return incoming;
}

function canStartRound(state) {
  return state?.status === 'READY' && state.canControl === true && state.participationSatisfied === true && PRESETS.has(state.preset);
}

export function updateStartButton(button, state) {
  button.disabled = !canStartRound(state);
}

// Same version means nothing visible changed except the countdown, so a full repaint would only discard user input.
export function isCountdownOnly(current, incoming) {
  return Boolean(current) && current.id === incoming.id && current.version === incoming.version && current.participantCount === incoming.participantCount && current.participationSatisfied === incoming.participationSatisfied;
}
