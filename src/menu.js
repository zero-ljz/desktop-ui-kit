let activeMenu = null;
let nextMenuId = 0;

function moveIndex(index, key, count) {
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  const step = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  return (index + step + count) % count;
}

function positionMenu(popup, anchor, point) {
  const edge = 8;
  const rect = anchor.getBoundingClientRect();
  const { width, height } = popup.getBoundingClientRect();
  const right = document.documentElement.clientWidth - edge;
  const bottom = document.documentElement.clientHeight - edge;
  let left = point ? point.x : rect.left;
  let top = point ? point.y : rect.bottom + 4;
  if (left + width > right) left = (point ? point.x : rect.right) - width;
  if (top + height > bottom) {
    const above = (point ? point.y : rect.top - 4) - height;
    if (above >= edge || above + height - edge > bottom - top) top = above;
  }
  popup.style.left = Math.max(edge, Math.min(left, right - width)) + 'px';
  popup.style.top = Math.max(edge, Math.min(top, bottom - height)) + 'px';
}

function openMenu({ owner, label, items, point, returnTo = owner, toggleOnClick = false, last = false, switchMenu }) {
  const commands = typeof items === 'function' ? items() : items;
  activeMenu?.close(false);
  if (!commands?.some(item => item.type !== 'separator')) return;

  const popup = document.createElement('div');
  popup.className = 'ds-menu-flyout';
  popup.classList.toggle('ds-menu-with-checks', commands.some(item => typeof item.checked === 'boolean'));
  popup.setAttribute('role', 'menu');
  popup.setAttribute('aria-label', label);
  do {
    popup.id = 'ds-menu-' + ++nextMenuId;
  } while (document.getElementById(popup.id));

  const buttons = [];
  for (const command of commands) {
    if (command.type === 'separator') {
      const line = document.createElement('div');
      line.setAttribute('role', 'separator');
      popup.append(line);
      continue;
    }
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'ds-menu-item';
    item.tabIndex = -1;
    item.textContent = command.label;
    const checkable = typeof command.checked === 'boolean';
    item.setAttribute('role', checkable ? 'menuitemcheckbox' : 'menuitem');
    if (checkable) item.setAttribute('aria-checked', String(command.checked));
    if (command.disabled) item.setAttribute('aria-disabled', 'true');
    item.addEventListener('click', () => {
      if (command.disabled) return;
      close();
      command.onSelect?.();
    });
    item.addEventListener('pointermove', event => {
      if (event.pointerType === 'mouse' && document.activeElement !== item) item.focus({ preventScroll: true });
    });
    buttons.push(item);
    popup.append(item);
  }

  const events = new AbortController();
  const { signal } = events;
  const previousControls = owner.getAttribute('aria-controls');
  function close(restoreFocus = true) {
    const hadFocus = popup.contains(document.activeElement);
    events.abort();
    activeMenu = null;
    owner.setAttribute('aria-expanded', 'false');
    if (previousControls === null) owner.removeAttribute('aria-controls');
    else owner.setAttribute('aria-controls', previousControls);
    popup.remove();
    if (restoreFocus && hadFocus) returnTo.focus({ preventScroll: true });
  }

  const host = owner.closest('dialog[open], .ds-settings') || document.body;
  if (popup.showPopover) popup.popover = 'manual';
  host.append(popup);
  popup.showPopover?.();
  positionMenu(popup, returnTo, point);
  owner.setAttribute('aria-controls', popup.id);
  owner.setAttribute('aria-expanded', 'true');
  activeMenu = { owner, close };
  buttons[last ? buttons.length - 1 : 0].focus({ preventScroll: true });
  if (last) popup.scrollTop = popup.scrollHeight;

  popup.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Escape') {
      if (event.key === 'Escape') event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (switchMenu && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      switchMenu(event.key);
    } else if (['Home', 'End', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      buttons[moveIndex(buttons.indexOf(document.activeElement), event.key, buttons.length)].focus();
    }
  });
  function dismissOutside(event) {
    if (popup.contains(event.target)) return;
    if (toggleOnClick && owner.contains(event.target)) return;
    close(false);
  }
  document.addEventListener('pointerdown', dismissOutside, { capture: true, signal });
  document.addEventListener('focusin', dismissOutside, { signal });
  document.addEventListener('scroll', event => {
    if (!popup.contains(event.target)) close();
  }, { capture: true, signal });
  window.addEventListener('resize', () => close(), { signal });
  window.addEventListener('blur', () => close(), { signal });
}

function createMenuBar({ label = '菜单栏', menus = [] } = {}) {
  const bar = document.createElement('div');
  bar.className = 'ds-menu-bar';
  bar.setAttribute('role', 'menubar');
  bar.setAttribute('aria-label', label);

  function selectHeading(index) {
    Array.from(bar.children).forEach((heading, i) => { heading.tabIndex = i === index ? 0 : -1; });
  }
  function openHeading(index, last = false) {
    selectHeading(index);
    openMenu({
      owner: bar.children[index], label: menus[index].label, items: menus[index].items, last, toggleOnClick: true,
      switchMenu: key => openHeading(moveIndex(index, key, menus.length))
    });
  }
  menus.forEach((menu, index) => {
    const heading = document.createElement('button');
    heading.type = 'button';
    heading.className = 'ds-menu-heading';
    heading.textContent = menu.label;
    heading.setAttribute('role', 'menuitem');
    heading.setAttribute('aria-haspopup', 'menu');
    heading.setAttribute('aria-expanded', 'false');
    heading.tabIndex = index === 0 ? 0 : -1;
    heading.addEventListener('focus', () => selectHeading(index));
    heading.addEventListener('click', () => {
      if (activeMenu?.owner === heading) activeMenu.close();
      else openHeading(index);
    });
    heading.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse' && activeMenu?.owner.parentElement === bar && activeMenu.owner !== heading) {
        openHeading(index);
      }
    });
    heading.addEventListener('keydown', event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        bar.children[moveIndex(index, event.key, menus.length)].focus();
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openHeading(index, event.key === 'ArrowUp');
      }
    });
    bar.append(heading);
  });
  bar.close = () => {
    if (activeMenu?.owner.parentElement === bar) activeMenu.close();
  };
  return bar;
}

function bindContextMenu(target, { items, label = '上下文菜单', trigger } = {}) {
  const owner = trigger || target;
  const events = new AbortController();
  const { signal } = events;
  const originalPopup = owner.getAttribute('aria-haspopup');
  const originalExpanded = owner.getAttribute('aria-expanded');
  const addTabStop = !owner.hasAttribute('tabindex') && owner.tabIndex < 0;
  if (addTabStop) owner.tabIndex = 0;
  owner.setAttribute('aria-haspopup', 'menu');
  owner.setAttribute('aria-expanded', 'false');

  function open(point, returnTo = owner) {
    openMenu({ owner, items, label, point, returnTo, toggleOnClick: Boolean(trigger) });
  }
  function close() {
    if (activeMenu?.owner === owner) activeMenu.close();
  }
  function openFromKeyboard(event) {
    if (event.defaultPrevented || !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))) return;
    event.preventDefault();
    open(null, document.activeElement);
  }
  target.addEventListener('contextmenu', event => {
    if (event.defaultPrevented) return;
    event.preventDefault();
    open({ x: event.clientX, y: event.clientY });
  }, { signal });
  target.addEventListener('keydown', openFromKeyboard, { signal });
  if (trigger) {
    if (!target.contains(trigger)) trigger.addEventListener('keydown', openFromKeyboard, { signal });
    trigger.addEventListener('click', () => {
      if (activeMenu?.owner === owner) close();
      else open();
    }, { signal });
  }
  return {
    close,
    destroy() {
      close();
      events.abort();
      if (addTabStop) owner.removeAttribute('tabindex');
      if (originalPopup === null) owner.removeAttribute('aria-haspopup');
      else owner.setAttribute('aria-haspopup', originalPopup);
      if (originalExpanded === null) owner.removeAttribute('aria-expanded');
      else owner.setAttribute('aria-expanded', originalExpanded);
    }
  };
}
