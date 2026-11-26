const tooltipConfigs = new WeakMap();
let nextTooltipId = 0;
const EDGE_GAP = 8;

let tooltip = null;
let activeTarget = null;
let pendingTarget = null;
let showTimer = 0;
let hideTimer = 0;
let lastHiddenAt = 0;
let listenersReady = false;

function ensureTooltip(target) {
  if (!tooltip) {
    tooltip = document.createElement('div');
    do {
      tooltip.id = 'ds-tooltip-' + ++nextTooltipId;
    } while (document.getElementById(tooltip.id));
    tooltip.className = 'ds-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    if (tooltip.showPopover) tooltip.popover = 'manual';
  }
  const root = target.closest('dialog[open], .ds-settings');
  const host = root && root !== document.documentElement ? root : document.body;
  if (tooltip.parentElement !== host) host.append(tooltip);
  return tooltip;
}

function targetFromNode(node) {
  let current = node instanceof Element ? node : node?.parentElement;
  while (current) {
    if (tooltipConfigs.has(current)) return current;
    current = current.parentElement;
  }
  return null;
}

function tooltipText(target) {
  const content = tooltipConfigs.get(target)?.content;
  return String(typeof content === 'function' ? content(target) : content || '').trim();
}

function setDescribedBy(target, enabled) {
  const ids = new Set((target.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  if (enabled) ids.add(tooltip.id);
  else ids.delete(tooltip.id);
  if (ids.size) target.setAttribute('aria-describedby', [...ids].join(' '));
  else target.removeAttribute('aria-describedby');
}

function positionTooltip(target, placement) {
  const anchor = target.getBoundingClientRect();
  const popup = tooltip.getBoundingClientRect();
  const gap = 8;
  let actualPlacement = placement;
  let left = anchor.right + gap;
  let top = anchor.top + (anchor.height - popup.height) / 2;

  if (placement === 'left') {
    left = anchor.left - popup.width - gap;
  } else if (placement === 'top') {
    left = anchor.left + (anchor.width - popup.width) / 2;
    top = anchor.top - popup.height - gap;
  } else if (placement === 'bottom') {
    left = anchor.left + (anchor.width - popup.width) / 2;
    top = anchor.bottom + gap;
  }

  if (placement === 'right' && left + popup.width > window.innerWidth - EDGE_GAP) {
    actualPlacement = 'left';
    left = anchor.left - popup.width - gap;
  } else if (placement === 'left' && left < EDGE_GAP) {
    actualPlacement = 'right';
    left = anchor.right + gap;
  } else if (placement === 'top' && top < EDGE_GAP) {
    actualPlacement = 'bottom';
    top = anchor.bottom + gap;
  } else if (placement === 'bottom' && top + popup.height > window.innerHeight - EDGE_GAP) {
    actualPlacement = 'top';
    top = anchor.top - popup.height - gap;
  }

  left = Math.min(Math.max(EDGE_GAP, left), window.innerWidth - popup.width - EDGE_GAP);
  top = Math.min(Math.max(EDGE_GAP, top), window.innerHeight - popup.height - EDGE_GAP);
  tooltip.dataset.placement = actualPlacement;
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showNow(target) {
  pendingTarget = null;
  if (!target?.isConnected || !tooltipConfigs.has(target)) return;
  const text = tooltipText(target);
  if (!text) return;
  const config = tooltipConfigs.get(target);
  const popup = ensureTooltip(target);
  popup.textContent = text;
  popup.dataset.placement = config.placement;
  popup.classList.add('is-measuring');
  popup.showPopover?.();
  positionTooltip(target, config.placement);
  popup.classList.remove('is-measuring');
  popup.classList.add('is-visible');
  activeTarget = target;
  setDescribedBy(target, true);
}

function hideNow() {
  window.clearTimeout(showTimer);
  window.clearTimeout(hideTimer);
  showTimer = 0;
  hideTimer = 0;
  pendingTarget = null;
  if (!activeTarget) return;
  setDescribedBy(activeTarget, false);
  activeTarget = null;
  tooltip.classList.remove('is-visible', 'is-measuring');
  if (tooltip.isConnected) tooltip.hidePopover?.();
  lastHiddenAt = Date.now();
}

function scheduleShow(target, fromFocus = false) {
  if (!target) return;
  window.clearTimeout(hideTimer);
  if (target === activeTarget || target === pendingTarget) return;
  window.clearTimeout(showTimer);
  if (activeTarget) hideNow();
  pendingTarget = target;
  const config = tooltipConfigs.get(target);
  const quickSwitch = Date.now() - lastHiddenAt < 500;
  const delay = fromFocus ? Math.min(60, config.delay) : (quickSwitch ? 35 : config.delay);
  showTimer = window.setTimeout(() => showNow(target), delay);
}

function scheduleHide(target, relatedTarget) {
  if (!target || targetFromNode(relatedTarget) === target) return;
  if (pendingTarget === target) {
    window.clearTimeout(showTimer);
    pendingTarget = null;
  }
  if (activeTarget !== target) return;
  window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(hideNow, 45);
}

function ensureListeners() {
  if (listenersReady) return;
  listenersReady = true;
  document.addEventListener('pointerover', event => scheduleShow(targetFromNode(event.target)));
  document.addEventListener('pointerout', event => scheduleHide(targetFromNode(event.target), event.relatedTarget));
  document.addEventListener('focusin', event => scheduleShow(targetFromNode(event.target), true));
  document.addEventListener('focusout', event => scheduleHide(targetFromNode(event.target), event.relatedTarget));
  document.addEventListener('pointerdown', hideNow, true);
  document.addEventListener('scroll', hideNow, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (activeTarget || pendingTarget)) hideNow();
  }, true);
  window.addEventListener('resize', hideNow);
  window.addEventListener('blur', hideNow);
}

function setTooltip(target, content, { placement = 'top', delay = 120 } = {}) {
  if (!(target instanceof Element)) return;
  ensureListeners();
  const title = tooltipConfigs.get(target)?.title ?? target.getAttribute('title');
  target.removeAttribute('title');
  tooltipConfigs.set(target, {
    title,
    content,
    placement: ['top', 'right', 'bottom', 'left'].includes(placement) ? placement : 'top',
    delay: Math.max(0, Number(delay) || 0)
  });
}

function clearTooltip(target) {
  if (!(target instanceof Element)) return;
  if (activeTarget === target || pendingTarget === target) hideNow();
  const title = tooltipConfigs.get(target)?.title;
  if (title != null && !target.hasAttribute('title')) target.setAttribute('title', title);
  tooltipConfigs.delete(target);
}
