let nextSelectId = 0;
let activeSelect = null;

function createSelect({ options = [], value = options[0]?.value, id, labelledBy, onChange, onOpen } = {}) {
  const container = document.createElement('div');
  container.className = 'custom-select';
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'select-trigger';
  trigger.id = id || `ds-select-${++nextSelectId}`;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  if (labelledBy) trigger.setAttribute('aria-labelledby', labelledBy);

  const label = document.createElement('span');
  label.className = 'select-label';
  const arrow = document.createElement('span');
  arrow.className = 'select-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  trigger.append(label, arrow);

  const list = document.createElement('div');
  list.className = 'select-dropdown';
  list.id = trigger.id + '-listbox';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-labelledby', labelledBy || trigger.id);
  trigger.setAttribute('aria-controls', list.id);
  container.append(trigger, list);

  function selectedIndex() {
    return options.findIndex(option => String(option.value) === String(value));
  }

  function syncSelection() {
    const selected = selectedIndex();
    label.textContent = (options[selected] || options[0])?.label ?? '';
    Array.from(list.children).forEach((item, index) => {
      item.classList.toggle('selected', index === selected);
      item.setAttribute('aria-selected', String(index === selected));
    });
  }

  function renderOptions() {
    list.replaceChildren(...options.map(option => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'select-option';
      item.tabIndex = -1;
      item.setAttribute('role', 'option');
      item.textContent = option.label;
      return item;
    }));
    syncSelection();
  }

  function positionList() {
    list.style.removeProperty('max-height');
    const rect = trigger.getBoundingClientRect();
    const bounds = container.closest('.content')?.getBoundingClientRect();
    const availableWidth = container.closest('.setting-control')
      ? rect.right - Math.max(0, bounds?.left ?? 0)
      : Math.min(window.innerWidth, bounds?.right ?? window.innerWidth) - rect.left;
    list.style.setProperty('--ds-select-available-width', availableWidth + 'px');
    const above = rect.top - Math.max(0, bounds?.top ?? 0);
    const below = Math.min(window.innerHeight, bounds?.bottom ?? window.innerHeight) - rect.bottom;
    const upward = below < Math.min(list.scrollHeight, 250) + 8 && above > below;
    container.classList.toggle('open-upward', upward);
    list.style.maxHeight = Math.max(0, Math.min(250, (upward ? above : below) - 8)) + 'px';
  }

  function focusOption(index) {
    const item = list.children[index];
    if (!item) return;
    item.focus({ preventScroll: true });
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
    }
  }

  // An outside click, a second control, or Escape can cancel a pending async refresh.
  let revision = 0;
  function close() {
    revision++;
    if (activeSelect === container) activeSelect = null;
    window.removeEventListener('resize', positionList);
    document.removeEventListener('pointerdown', onOutside, true);
    container.classList.remove('open', 'open-upward');
    trigger.setAttribute('aria-expanded', 'false');
    list.style.removeProperty('max-height');
  }
  function onOutside(event) {
    if (!container.contains(event.target)) close();
  }

  function focusInitialOption(key) {
    let index = Math.max(0, selectedIndex());
    if (key === 'Home') index = 0;
    if (key === 'End') index = options.length - 1;
    focusOption(index);
  }

  async function open(key) {
    if (activeSelect === container) {
      if (container.classList.contains('open')) focusInitialOption(key);
      return;
    }
    activeSelect?.close();
    activeSelect = container;
    const request = ++revision;
    document.addEventListener('pointerdown', onOutside, true);
    if (onOpen) {
      try { await onOpen(); }
      catch (error) { console.error('下拉选项刷新失败', error); }
    }
    if (revision !== request) return;
    if (!container.isConnected || trigger.disabled) {
      close();
      return;
    }
    positionList();
    container.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    window.addEventListener('resize', positionList);
    focusInitialOption(key);
  }

  trigger.addEventListener('click', () => {
    if (activeSelect === container) close();
    else void open();
  });
  list.addEventListener('click', event => {
    const index = Array.from(list.children).indexOf(event.target);
    if (index < 0) return;
    value = options[index].value;
    syncSelection();
    close();
    trigger.focus();
    onChange?.(value);
  });
  container.addEventListener('keydown', event => {
    if (activeSelect === container && (event.key === 'Escape' || event.key === 'Tab')) {
      if (event.key === 'Escape') event.preventDefault();
      close();
      trigger.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.target === trigger) {
      void open(event.key);
      return;
    }
    const index = Array.from(list.children).indexOf(event.target);
    if (index < 0) return;
    if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(options.length - 1);
    else {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      focusOption((index + step + options.length) % options.length);
    }
  });
  container.addEventListener('focusout', event => {
    if (!container.contains(event.relatedTarget)) close();
  });

  container.trigger = trigger;
  container.close = close;
  container.getValue = () => value;
  container.getSelectedOption = () => options[selectedIndex()] || options[0] || null;
  container.setValue = next => {
    value = next;
    syncSelection();
  };
  container.setOptions = (nextOptions, nextValue) => {
    const refocus = list.contains(document.activeElement);
    if (refocus) trigger.focus();
    options = nextOptions || [];
    value = nextValue === undefined ? options[0]?.value ?? '' : nextValue;
    renderOptions();
    if (container.classList.contains('open')) {
      positionList();
      if (refocus) focusOption(Math.max(0, selectedIndex()));
    }
  };
  renderOptions();
  return container;
}
