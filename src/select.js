let nextSelectId = 0;
let activeSelect = null;

function createSelectArrow() {
  const arrow = document.createElement('span');
  arrow.className = 'select-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
  return arrow;
}

function positionSelectList(container, trigger, list) {
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

function scrollToSelectOption(list, item) {
  if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
  else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
  }
}

function markSelectedOption(item, selected) {
  item.classList.toggle('selected', selected);
  item.setAttribute('aria-selected', String(selected));
}

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
  trigger.append(label, createSelectArrow());

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
      markSelectedOption(item, index === selected);
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
    positionSelectList(container, trigger, list);
  }

  function focusOption(index) {
    const item = list.children[index];
    if (!item) return;
    item.focus({ preventScroll: true });
    scrollToSelectOption(list, item);
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

function bindEditableSelect(input, { options = [], label = '预设选项' } = {}) {
  const container = document.createElement('div');
  container.className = 'custom-select editable-select';
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.tabIndex = -1;
  toggle.className = 'editable-select-toggle';
  toggle.setAttribute('aria-label', label);
  toggle.setAttribute('aria-haspopup', 'listbox');
  toggle.append(createSelectArrow());

  const list = document.createElement('div');
  list.className = 'select-dropdown';
  do {
    list.id = 'ds-editable-list-' + ++nextSelectId;
  } while (document.getElementById(list.id));
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', label);
  toggle.setAttribute('aria-controls', list.id);

  const attributes = ['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'autocomplete', 'list'];
  const originalAttributes = attributes.map(name => [name, input.getAttribute(name)]);
  const hadInputClass = input.classList.contains('input-text');
  input.before(container);
  container.append(input, toggle, list);
  input.classList.add('input-text');
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-controls', list.id);
  input.setAttribute('autocomplete', 'off');
  input.removeAttribute('list');

  const listeners = new AbortController();
  const { signal } = listeners;
  let activeIndex = -1;
  let showAll = false;
  let composing = false;
  let picking = false;
  let pendingPresetChange = false;
  let committedText = input.value;
  const control = {
    close,
    setOptions(next) {
      options = next;
      if (activeSelect === control) open(showAll);
    },
    destroy() {
      close();
      listeners.abort();
      container.replaceWith(input);
      if (!hadInputClass) input.classList.remove('input-text');
      for (const [name, value] of originalAttributes) {
        if (value === null) input.removeAttribute(name);
        else input.setAttribute(name, value);
      }
    }
  };

  function highlight(index) {
    list.children[activeIndex]?.classList.remove('active-option');
    activeIndex = index;
    const item = list.children[index];
    if (item) {
      item.classList.add('active-option');
      input.setAttribute('aria-activedescendant', item.id);
      scrollToSelectOption(list, item);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function position() {
    positionSelectList(container, input, list);
  }
  function outside(event) {
    if (!container.contains(event.target)) close();
  }
  function close() {
    if (activeSelect === control) activeSelect = null;
    document.removeEventListener('pointerdown', outside, true);
    window.removeEventListener('resize', position);
    highlight(-1);
    container.classList.remove('open', 'open-upward');
    input.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-expanded', 'false');
  }
  function open(all) {
    if (input.matches(':disabled, [readonly]') || document.activeElement !== input || composing) {
      close();
      return;
    }
    showAll = all;
    const query = all ? '' : input.value.toLocaleLowerCase();
    const matches = options.filter(text => text.toLocaleLowerCase().includes(query)
      && (input.maxLength < 0 || text.length <= input.maxLength));
    if (!matches.length) {
      close();
      return;
    }
    if (activeSelect !== control) activeSelect?.close();
    activeSelect = control;
    highlight(-1);
    const selectedIndex = matches.indexOf(input.value);
    list.replaceChildren(...matches.map((text, index) => {
      const item = document.createElement('div');
      item.id = list.id + '-' + index;
      item.className = 'select-option';
      item.setAttribute('role', 'option');
      markSelectedOption(item, index === selectedIndex);
      item.textContent = text;
      return item;
    }));
    container.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-expanded', 'true');
    position();
    if (selectedIndex >= 0) scrollToSelectOption(list, list.children[selectedIndex]);
    else list.scrollTop = 0;
    window.addEventListener('resize', position);
    document.addEventListener('pointerdown', outside, true);
  }

  function choose(item) {
    close();
    if (!item || input.matches(':disabled, [readonly]') || input.value === item.textContent) return;
    input.value = item.textContent;
    pendingPresetChange = true;
    picking = true;
    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } finally {
      picking = false;
    }
  }
  // Keep the caret in the text field while the pointer acts on the list or its button.
  for (const element of [list, toggle]) {
    element.addEventListener('mousedown', event => event.preventDefault(), { signal });
  }
  toggle.addEventListener('click', () => {
    input.focus();
    if (activeSelect === control && showAll) close();
    else open(true);
  }, { signal });
  list.addEventListener('click', event => {
    const item = event.target.closest('[role="option"]');
    if (item && activeSelect === control) choose(item);
  }, { signal });
  input.addEventListener('compositionstart', () => { composing = true; close(); }, { signal });
  input.addEventListener('compositionend', () => { composing = false; open(false); }, { signal });
  input.addEventListener('input', event => {
    if (!picking && !composing && !event.isComposing) open(false);
  }, { signal });
  input.addEventListener('focus', () => { committedText = input.value; }, { signal });
  input.addEventListener('change', () => {
    pendingPresetChange = false;
    committedText = input.value;
  }, { signal });
  input.addEventListener('blur', () => {
    close();
    // Browsers already commit typed edits on blur. A preset-only edit needs the same event.
    if (pendingPresetChange && input.value !== committedText) {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    pendingPresetChange = false;
  }, { signal });
  input.form?.addEventListener('reset', () => { pendingPresetChange = false; close(); }, { signal });
  input.addEventListener('keydown', event => {
    if (composing || event.isComposing || event.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (activeSelect !== control) open(true);
      if (activeSelect !== control) return;
      event.preventDefault();
      const count = list.children.length;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const selected = list.querySelector('.selected');
      let start = activeIndex;
      if (start < 0 && selected) start = Array.from(list.children).indexOf(selected);
      if (start < 0 && step < 0) start = 0;
      highlight((start + step + count) % count);
    } else if (activeSelect === control) {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === 'Enter') choose(list.children[activeIndex]);
        else close();
      } else if (event.key === 'Tab') {
        close();
      } else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        highlight(-1);
      }
    }
  }, { signal });
  close();
  return control;
}
