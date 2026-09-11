importScripts('lib/tab-protection.js');

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const desired = globalThis.JuceesTabProtection.requestedAutoDiscardable(message);
  if (desired === null) return false;

  const tabId = sender.tab?.id;
  if (!Number.isInteger(tabId)) {
    sendResponse({ ok: false, error: 'Não foi possível identificar a aba do Simplifica/ES.' });
    return false;
  }

  const previousAutoDiscardable = globalThis.JuceesTabProtection.previousAutoDiscardable(sender.tab);
  chrome.tabs.update(tabId, { autoDiscardable: desired })
    .then(() => sendResponse({
      ok: true,
      protected: desired === false,
      previousAutoDiscardable
    }))
    .catch(() => sendResponse({
      ok: false,
      previousAutoDiscardable,
      error: 'O Chrome não permitiu alterar a proteção contra descarte desta aba.'
    }));
  return true;
});
