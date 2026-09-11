(function initTabProtection(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesTabProtection = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const MESSAGE_TYPE = 'juceesCnaeBackgroundProtection';

  function requestedAutoDiscardable(message) {
    if (!message || message.type !== MESSAGE_TYPE || typeof message.active !== 'boolean') return null;
    if (message.active) return false;
    return message.restoreAutoDiscardable !== false;
  }

  function previousAutoDiscardable(tab) {
    return tab?.autoDiscardable !== false;
  }

  function request(active, restoreAutoDiscardable = true) {
    return {
      type: MESSAGE_TYPE,
      active: Boolean(active),
      ...(active ? {} : { restoreAutoDiscardable: restoreAutoDiscardable !== false })
    };
  }

  return { MESSAGE_TYPE, requestedAutoDiscardable, previousAutoDiscardable, request };
});
