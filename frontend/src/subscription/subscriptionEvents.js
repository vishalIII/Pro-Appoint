const blockedListeners = new Set();

export const registerSubscriptionBlockedListener = (listener) => {
  blockedListeners.add(listener);
  return () => {
    blockedListeners.delete(listener);
  };
};

export const notifySubscriptionBlocked = (payload = {}) => {
  for (const listener of Array.from(blockedListeners)) {
    try {
      listener(payload);
    } catch (error) {
      console.error("Error notifying subscription listener", error);
    }
  }
};
