function bindPivot(root, { onChange } = {}) {
  const headers = root.querySelector(':scope > [role="tablist"]');
  if (!headers) throw new Error('Pivot requires a tablist.');
  const panels = new Map(Array.from(root.querySelectorAll(':scope > [role="tabpanel"]'), panel => [panel.id, panel]));
  const tabs = Array.from(headers.querySelectorAll(':scope > button[role="tab"]'));
  const events = new AbortController();
  const { signal } = events;
  const panelId = tab => tab.getAttribute('aria-controls');
  const available = tab => !tab.disabled && !tab.hidden;
  const byPanel = new Map(tabs.map(tab => [panelId(tab), tab]));
  if (tabs.length !== panels.size || byPanel.size !== tabs.length ||
      tabs.some(tab => !tab.id || !panels.has(panelId(tab)))) {
    throw new Error('Each Pivot tab needs an id and aria-controls pointing to its own panel.');
  }
  let current;
  function select(tab, { focus = false, notify = false } = {}) {
    const changed = tab !== current;
    current = tab;
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      panels.get(panelId(item)).hidden = !selected;
    }
    if (!tab) return;
    if (focus) tab.focus({ preventScroll: true });
    const edge = headers.getBoundingClientRect();
    const rect = tab.getBoundingClientRect();
    if (rect.left < edge.left) headers.scrollLeft += rect.left - edge.left;
    else if (rect.right > edge.right) headers.scrollLeft += rect.right - edge.right;
    if (changed && notify) onChange?.(panelId(tab));
  }
  function adjacent(tab, direction, wrap) {
    const options = tabs.filter(available);
    const index = options.indexOf(tab) + direction;
    return options[wrap ? (index + options.length) % options.length : index];
  }
  const rtl = () => getComputedStyle(headers).direction === 'rtl';
  for (const tab of tabs) {
    const panel = panels.get(panelId(tab));
    panel.setAttribute('aria-labelledby', tab.id);
    tab.addEventListener('click', () => select(tab, { focus: true, notify: true }), { signal });
    tab.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      let target;
      if (event.key === 'Home') target = tabs.find(available);
      else if (event.key === 'End') target = tabs.filter(available).at(-1);
      else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        target = adjacent(tab, (event.key === 'ArrowRight') !== rtl() ? 1 : -1, true);
      } else return;
      event.preventDefault();
      select(target, { focus: true, notify: true });
    }, { signal });
  }
  // Keep native gestures on controls, nested pivots and horizontally scrollable content.
  let touchStart;
  root.addEventListener('touchstart', event => {
    touchStart = null;
    const panel = event.target.closest('[role="tabpanel"]');
    if (event.touches.length !== 1 || panel?.parentElement !== root ||
        event.target.closest('input, textarea, select, button, label, a, [contenteditable], [role="slider"]')) return;
    for (let el = event.target; el !== root; el = el.parentElement) {
      if (el.scrollWidth > el.clientWidth && /auto|scroll/.test(getComputedStyle(el).overflowX)) return;
    }
    touchStart = event.touches[0];
  }, { signal, passive: true });
  root.addEventListener('touchcancel', () => { touchStart = null; }, { signal, passive: true });
  root.addEventListener('touchend', event => {
    const start = touchStart;
    touchStart = null;
    if (!start || !current || event.touches.length || !root.ownerDocument.getSelection()?.isCollapsed) return;
    const end = event.changedTouches[0];
    const dx = end.clientX - start.clientX;
    if (Math.abs(dx) < 48 || Math.abs(dx) < 2 * Math.abs(end.clientY - start.clientY)) return;
    const next = adjacent(current, (dx < 0) !== rtl() ? 1 : -1, false);
    if (next) select(next, { notify: true });
  }, { signal, passive: true });
  const firstAvailable = () => tabs.find(available);
  select(tabs.find(tab => available(tab) && tab.getAttribute('aria-selected') === 'true') || firstAvailable());
  const observer = new MutationObserver(() => {
    if (!current || !available(current)) select(firstAvailable());
  });
  for (const tab of tabs) observer.observe(tab, { attributeFilter: ['disabled', 'hidden'] });
  return {
    getValue: () => current ? panelId(current) : null,
    setValue(id) {
      const tab = byPanel.get(id);
      if (tab && available(tab)) {
        const active = root.getRootNode().activeElement;
        select(tab, { focus: tab !== current && root.contains(active) });
      }
    },
    destroy() { events.abort(); observer.disconnect(); }
  };
}
