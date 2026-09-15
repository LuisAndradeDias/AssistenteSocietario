((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.JuceesRunState = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const ACTIVE = new Set(['running', 'paused']);
  function activeStatus(controller) {
    if (controller?.stopped) return 'stopped';
    return controller?.paused ? 'paused' : 'running';
  }
  function recoverInterruptedRun(stored) {
    if (!stored || typeof stored !== 'object' || !ACTIVE.has(stored.status)) return stored || null;
    return {
      ...stored,
      status: 'review_required',
      detail: 'A página foi recarregada durante a execução. O item que estava em processamento ficou não verificado; reanalise a tela antes de iniciar uma nova fila.',
      items: Array.isArray(stored.items) ? stored.items.map((item) => item?.status === 'searching'
        ? { ...item, status: 'unverified', detail: 'A página recarregou durante este item; confirmação perdida.' }
        : item) : stored.items,
      recoveredAt: new Date().toISOString()
    };
  }
  return { activeStatus, recoverInterruptedRun };
});
