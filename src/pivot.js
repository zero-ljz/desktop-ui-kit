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
  const rtl = () => getComputedStyle(headers).direction === 'rtl';
  const motion = matchMedia('(prefers-reduced-motion: no-preference)');
  const indicator = root.ownerDocument.createElement('span');
  indicator.className = 'pivot-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  let current;
  let indicatorAnimation;
  let panelAnimation;
  function cancelMotion() {
    indicatorAnimation?.cancel();
    panelAnimation?.cancel();
  }
  motion.addEventListener('change', () => {
    if (!motion.matches) cancelMotion();
  }, { signal });

  function moveIndicator(tab, start) {
    tab.append(indicator);
    if (!start?.width) return;
    const end = indicator.getBoundingClientRect();
    if (!end.width) return;
    const offset = (start.left - end.left) / end.width * 100;
    const scale = start.width / end.width;
    indicatorAnimation = indicator.animate([
      { transform: `translateX(${offset}%) scaleX(${scale})` },
      { transform: 'none' }
    ], { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }

  function select(tab, { focus = false, notify = false } = {}) {
    const changed = tab !== current;
    // Sample the moving line before cancellation so a second switch starts where it is.
    const start = changed && current && tab && motion.matches ? indicator.getBoundingClientRect() : null;
    if (changed) cancelMotion();
    current = tab;
    for (const item of tabs) {
      const selected = item === tab;
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
      panels.get(panelId(item)).hidden = !selected;
    }
    if (!tab) {
      indicator.remove();
      return;
    }
    if (changed) moveIndicator(tab, start);
    if (start?.width) {
      panelAnimation = panels.get(panelId(tab)).animate(
        [{ opacity: 0.8 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' }
      );
    }
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
    destroy() {
      events.abort();
      observer.disconnect();
      cancelMotion();
      indicator.remove();
    }
  };
}
