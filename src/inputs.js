function commitInput(input, value) {
  if (input.value === value && !input.validity.badInput) return;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function bindNumberStepper(input) {
  const field = input.parentElement;
  const events = new AbortController();
  const { signal } = events;
  let repeatTimer;

  function nextValue(direction) {
    if (input.disabled || input.readOnly || input.step.toLowerCase() === 'any') return input.value;
    // Use the browser's decimal stepping and range rules without editing the live field.
    const probe = input.cloneNode(false);
    probe.value = input.value;
    if (direction > 0) probe.stepUp();
    else probe.stepDown();
    return probe.value;
  }

  function stopRepeat() {
    clearTimeout(repeatTimer);
  }
  function actionButton(className, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1;
    button.className = className;
    button.setAttribute('aria-label', label);
    if (input.id) button.setAttribute('aria-controls', input.id);
    return button;
  }
  function spinButton(direction, label) {
    const button = actionButton(direction > 0 ? 'number-spin' : 'number-spin number-spin-down', label);
    let repeated = false;
    function repeat() {
      if (signal.aborted || button.matches(':disabled')) return;
      repeated = true;
      commitInput(input, nextValue(direction));
      if (!signal.aborted && !button.matches(':disabled')) repeatTimer = setTimeout(repeat, 80);
    }
    button.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      input.focus({ preventScroll: true });
      stopRepeat();
      repeated = false;
      repeatTimer = setTimeout(repeat, 400);
    }, { signal });
    button.addEventListener('pointerleave', stopRepeat, { signal });
    button.addEventListener('click', event => {
      if (!repeated || event.detail === 0) {
        input.focus({ preventScroll: true });
        commitInput(input, nextValue(direction));
      }
      repeated = false;
    }, { signal });
    return button;
  }
  const clear = actionButton('number-clear', '清除数值');
  clear.addEventListener('pointerdown', event => event.preventDefault(), { signal });
  clear.addEventListener('click', () => {
    if (input.matches(':disabled') || input.readOnly) return;
    input.focus({ preventScroll: true });
    commitInput(input, '');
  }, { signal });
  const up = spinButton(1, '增加数值');
  const down = spinButton(-1, '减少数值');
  field.append(clear, up, down);
  field.addEventListener('click', event => {
    if (event.target === field) input.focus({ preventScroll: true });
  }, { signal });

  function refresh() {
    // Browsers without field-sizing use the character count for the input width.
    field.style.setProperty('--ds-number-length', Math.max(1, (input.value || input.placeholder).length));
    clear.disabled = !(input.value || input.validity.badInput);
    up.disabled = input.value === nextValue(1);
    down.disabled = input.value === nextValue(-1);
  }
  input.addEventListener('input', refresh, { signal });
  input.addEventListener('change', refresh, { signal });
  field.addEventListener('pointerenter', refresh, { signal });
  field.addEventListener('focusin', refresh, { signal });
  input.form?.addEventListener('reset', () => queueMicrotask(refresh), { signal });
  window.addEventListener('pointerup', stopRepeat, { signal, capture: true });
  window.addEventListener('pointercancel', stopRepeat, { signal, capture: true });
  window.addEventListener('blur', stopRepeat, { signal });
  const observer = new MutationObserver(refresh);
  observer.observe(input, { attributeFilter: ['min', 'max', 'step', 'value', 'placeholder', 'disabled', 'readonly'] });
  refresh();
  return {
    refresh,
    destroy() {
      stopRepeat();
      events.abort();
      observer.disconnect();
      field.style.removeProperty('--ds-number-length');
      clear.remove();
      up.remove();
      down.remove();
    }
  };
}

function bindPathPicker(input, button, { kind = 'file', choose, onError } = {}) {
  const events = new AbortController();
  const { signal } = events;
  const directory = kind === 'directory';
  const files = document.createElement('input');
  files.type = 'file';
  files.hidden = true;
  files.toggleAttribute('webkitdirectory', directory);
  button.after(files);
  let pending = false;

  files.addEventListener('change', () => {
    const file = files.files[0];
    if (!file || input.matches(':disabled')) return;
    const name = directory ? file.webkitRelativePath.split('/')[0] : file.name;
    files.value = '';
    if (name) commitInput(input, name);
  }, { signal });
  button.addEventListener('click', async () => {
    if (pending || input.matches(':disabled')) return;
    pending = true;
    try {
      let path;
      if (choose) {
        path = await choose({ kind, value: input.value });
      } else if (directory && typeof window.showDirectoryPicker === 'function') {
        const handle = await window.showDirectoryPicker();
        path = handle.name;
      } else {
        files.value = '';
        files.click();
        return;
      }
      if (!signal.aborted && !input.matches(':disabled') && path != null) commitInput(input, path);
    } catch (error) {
      if (!signal.aborted && error.name !== 'AbortError') {
        if (onError) onError(error);
        else throw error;
      }
    } finally {
      pending = false;
    }
  }, { signal });
  return { destroy() { events.abort(); files.remove(); } };
}

function bindShortcutInput(input, record, clear) {
  const events = new AbortController();
  const { signal } = events;
  const idleLabel = record.textContent;
  const wasReadOnly = input.readOnly;
  input.readOnly = true;
  let recording = false;

  function stop() {
    recording = false;
    delete input.dataset.recording;
    record.textContent = idleLabel;
  }
  function start() {
    if (input.matches(':disabled')) return;
    recording = true;
    input.dataset.recording = 'true';
    record.textContent = '录入中…';
    input.focus();
  }
  record.addEventListener('click', start, { signal });
  input.addEventListener('click', start, { signal });
  input.addEventListener('blur', stop, { signal });
  clear.addEventListener('click', () => {
    if (input.matches(':disabled')) return;
    stop();
    commitInput(input, '');
  }, { signal });
  input.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (!recording) {
      if (event.key === 'Enter' && !event.repeat) {
        event.preventDefault();
        start();
      }
      return;
    }
    if (event.key === 'Tab') return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') { stop(); return; }
    if (event.repeat || ['Control', 'Alt', 'Shift', 'Meta', 'AltGraph', 'Dead', 'Process', 'Unidentified'].includes(event.key)) return;
    const keys = [];
    if (event.ctrlKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    if (event.metaKey) keys.push('Meta');
    let key = event.key;
    if (key === ' ') key = 'Space';
    else if (key === '+') key = 'Plus';
    else if (key.length === 1) key = key.toUpperCase();
    keys.push(key);
    stop();
    commitInput(input, keys.join('+'));
  }, { signal });
  return { destroy() { stop(); events.abort(); input.readOnly = wasReadOnly; } };
}

function bindPasswordInput(input, button) {
  const toggle = () => {
    if (input.matches(':disabled')) return;
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? '隐藏密码' : '显示密码';
  };
  button.addEventListener('click', toggle);
  return {
    destroy() {
      button.removeEventListener('click', toggle);
      input.type = 'password';
      button.textContent = '显示密码';
    }
  };
}

function bindColorInput(hex, swatch) {
  const events = new AbortController();
  const { signal } = events;
  function updateSwatch() {
    if (/^#[0-9a-f]{6}$/i.test(hex.value)) swatch.value = hex.value;
  }
  function updateHex(event) {
    hex.value = swatch.value;
    hex.dispatchEvent(new Event(event.type, { bubbles: true }));
  }
  hex.addEventListener('input', updateSwatch, { signal });
  swatch.addEventListener('input', updateHex, { signal });
  swatch.addEventListener('change', updateHex, { signal });
  hex.form?.addEventListener('reset', () => queueMicrotask(updateSwatch), { signal });
  updateSwatch();
  return { destroy() { events.abort(); } };
}

function createTagInput({ id, values = [], placeholder = '', onChange } = {}) {
  const root = document.createElement('div');
  root.className = 'tag-input';
  const field = document.createElement('div');
  field.className = 'input-text tag-field';
  const list = document.createElement('ul');
  list.className = 'tag-list';
  list.setAttribute('role', 'list');
  list.setAttribute('aria-label', '已添加的标签');
  const input = document.createElement('input');
  input.className = 'tag-entry';
  if (id) input.id = id;
  input.placeholder = placeholder;
  input.enterKeyHint = 'done';
  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn';
  add.textContent = '添加';
  const status = document.createElement('span');
  status.className = 'setting-desc';
  status.setAttribute('role', 'status');
  field.append(list, input);
  root.append(field, add, status);
  function revealEntry() {
    const rtl = getComputedStyle(field).direction === 'rtl';
    field.scrollLeft = rtl ? -field.scrollWidth : field.scrollWidth;
  }
  input.addEventListener('focus', revealEntry);
  input.addEventListener('input', revealEntry);
  field.addEventListener('click', event => {
    if (event.target === field) input.focus();
  });

  const tags = new Map();
  function insert(text) {
    const key = text.toLowerCase();
    if (!text || tags.has(key)) return false;
    tags.set(key, text);
    const item = document.createElement('li');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn tag-remove';
    remove.setAttribute('aria-label', '移除 ' + text);
    remove.textContent = text + ' ×';
    remove.addEventListener('click', () => {
      const next = item.nextElementSibling || item.previousElementSibling;
      tags.delete(key);
      item.remove();
      (next?.firstElementChild || input).focus();
      status.textContent = '已移除 ' + text;
      onChange?.([...tags.values()]);
    });
    item.append(remove);
    list.append(item);
    return true;
  }
  function submit() {
    const text = input.value.trim();
    input.focus();
    if (!text) return;
    if (!insert(text)) {
      status.textContent = '已存在标签 ' + text;
      input.select();
      return;
    }
    input.value = '';
    revealEntry();
    status.textContent = '已添加 ' + text;
    onChange?.([...tags.values()]);
  }
  add.addEventListener('click', submit);
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
      event.preventDefault();
      submit();
    }
  });
  for (const value of values) insert(value.trim());
  root.getValues = () => [...tags.values()];
  return root;
}
