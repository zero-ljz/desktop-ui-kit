const sidebarBindings = new WeakMap();
let nextSidebarId = 0;

function bindSidebar(sidebar, {
  narrowQuery = '(width < 900px)', expandLabel = '展开导航', collapseLabel = '收起导航', tooltips
} = {}) {
  if (sidebarBindings.has(sidebar)) return sidebarBindings.get(sidebar);
  const app = sidebar.parentElement;
  const toggle = sidebar.querySelector('.sidebar-toggle');
  if (!app?.matches('.app-container') || !toggle) {
    throw new Error('bindSidebar requires a sidebar inside .app-container with a .sidebar-toggle button.');
  }
  const previousId = sidebar.id;
  const attributes = ['aria-controls', 'aria-label', 'aria-expanded'].map(name => [name, toggle.getAttribute(name)]);
  if (!sidebar.id) {
    let id;
    do { id = 'ds-sidebar-' + ++nextSidebarId; } while (document.getElementById(id));
    sidebar.id = id;
  }
  toggle.setAttribute('aria-controls', sidebar.id);
  const dismiss = document.createElement('div');
  dismiss.className = 'sidebar-overlay-dismiss';
  dismiss.setAttribute('aria-hidden', 'true');
  app.append(dismiss);

  const narrow = window.matchMedia(narrowQuery);
  const events = new AbortController();
  const { signal } = events;
  let manualCompact = false;
  let overlayOpen = false;
  let compact;

  function update() {
    if (!narrow.matches) overlayOpen = false;
    const nextCompact = narrow.matches ? !overlayOpen : manualCompact;
    app.classList.toggle('sidebar-narrow', narrow.matches);
    app.classList.toggle('sidebar-overlay-open', overlayOpen);
    app.classList.toggle('sidebar-compact', nextCompact);
    toggle.setAttribute('aria-expanded', String(!nextCompact));
    toggle.setAttribute('aria-label', nextCompact ? expandLabel : collapseLabel);
    if (tooltips && compact !== nextCompact) {
      for (const item of sidebar.querySelectorAll('.sidebar-item')) {
        if (nextCompact) {
          tooltips.setTooltip(item, () => item.getAttribute('aria-label') || item.querySelector('.sidebar-label')?.textContent, { placement: 'right' });
        } else if (compact) {
          tooltips.clearTooltip(item);
        }
      }
    }
    compact = nextCompact;
  }

  function closeOverlay() {
    if (!overlayOpen) return;
    overlayOpen = false;
    update();
  }

  toggle.addEventListener('click', () => {
    if (narrow.matches) {
      overlayOpen = !overlayOpen;
      if (overlayOpen) toggle.focus({ preventScroll: true });
    } else {
      manualCompact = !manualCompact;
    }
    update();
  }, { signal });
  sidebar.addEventListener('click', event => {
    if (event.target.closest('.sidebar-item')) closeOverlay();
  }, { signal });
  document.addEventListener('click', event => {
    if (!overlayOpen || sidebar.contains(event.target)) return;
    closeOverlay();
    if (event.target === dismiss) toggle.focus({ preventScroll: true });
  }, { capture: true, signal });
  sidebar.addEventListener('focusout', event => {
    if (event.relatedTarget && !sidebar.contains(event.relatedTarget)) closeOverlay();
  }, { signal });
  sidebar.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !overlayOpen || event.defaultPrevented) return;
    event.preventDefault();
    closeOverlay();
    toggle.focus({ preventScroll: true });
  }, { signal });
  narrow.addEventListener('change', update, { signal });
  tooltips?.setTooltip(toggle, () => toggle.getAttribute('aria-label'), { placement: 'right' });
  update();

  // Apply the initial width before enabling transitions.
  let frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => app.classList.add('sidebar-transitions-ready'));
  });
  const binding = {
    closeOverlay,
    destroy() {
      if (sidebarBindings.get(sidebar) !== binding) return;
      sidebarBindings.delete(sidebar);
      events.abort();
      cancelAnimationFrame(frame);
      dismiss.remove();
      tooltips?.clearTooltip(toggle);
      if (tooltips && compact) sidebar.querySelectorAll('.sidebar-item').forEach(item => tooltips.clearTooltip(item));
      app.classList.remove('sidebar-transitions-ready', 'sidebar-compact', 'sidebar-overlay-open', 'sidebar-narrow');
      for (const [name, value] of attributes) {
        if (value === null) toggle.removeAttribute(name);
        else toggle.setAttribute(name, value);
      }
      if (!previousId) sidebar.removeAttribute('id');
    }
  };
  sidebarBindings.set(sidebar, binding);
  return binding;
}
