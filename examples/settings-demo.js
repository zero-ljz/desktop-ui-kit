'use strict';

const form = document.querySelector('#preferences');
const fields = [...form.querySelectorAll('[name]')];
const panels = [...form.querySelectorAll(':scope > section')];
const links = [...document.querySelectorAll('.sidebar-item')];
const topics = [...form.querySelectorAll('.topic input')];
const byId = id => document.getElementById(id);
const fontPicker = byId('font-picker');
const fontTrigger = byId('font-trigger');
const fontList = byId('font-options');
const fontOptions = [...fontList.querySelectorAll('[role="option"]')];

// Track disabled values too, so turning reminders back on restores the draft.
function readDraft() {
  const draft = {};
  for (const field of fields) {
    if (field.type === 'radio' && !field.checked) continue;
    draft[field.name] = field.type === 'checkbox' ? field.checked : field.value;
  }
  return draft;
}
const defaults = readDraft();
let saved = defaults;

function restore(draft) {
  for (const field of fields) {
    const value = draft[field.name];
    if (field.type === 'checkbox') field.checked = value;
    else if (field.type === 'radio') field.checked = field.value === value;
    else field.value = value;
  }
}

function showPanel(id, focusHeading = false) {
  closeFontList();
  const selected = panels.find(panel => panel.id === id) || panels[0];
  for (const panel of panels) panel.hidden = panel !== selected;
  for (const link of links) {
    if (link.hash === '#' + selected.id) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.querySelector('.content').scrollTop = 0;
  if (focusHeading) selected.querySelector('h1').focus({ preventScroll: true });
}

function setError(id, invalid) {
  byId(id).setAttribute('aria-invalid', String(invalid));
  byId(id + '-error').hidden = !invalid;
}

function closeFontList() {
  fontPicker.classList.remove('open', 'open-upward');
  fontTrigger.setAttribute('aria-expanded', 'false');
}

function openFontList() {
  const trigger = fontTrigger.getBoundingClientRect();
  const boundary = fontPicker.closest('.content').getBoundingClientRect();
  const above = trigger.top - boundary.top;
  const below = boundary.bottom - trigger.bottom;
  const upward = below < Math.min(fontList.scrollHeight, 250) + 8 && above > below;
  fontList.style.maxHeight = Math.max(0, Math.min(250, (upward ? above : below) - 8)) + 'px';
  fontPicker.classList.toggle('open-upward', upward);
  fontPicker.classList.add('open');
  fontTrigger.setAttribute('aria-expanded', 'true');
  fontOptions.find(option => option.dataset.value === byId('font').value).focus({ preventScroll: true });
}

fontTrigger.addEventListener('click', () => {
  if (fontPicker.classList.contains('open')) closeFontList();
  else openFontList();
});
fontPicker.addEventListener('keydown', event => {
  const index = fontOptions.indexOf(event.target);
  if (event.key === 'Escape' && fontPicker.classList.contains('open')) {
    event.preventDefault();
    closeFontList();
    fontTrigger.focus();
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    if (index === -1) openFontList();
    if (event.key === 'Home') fontOptions[0].focus();
    else if (event.key === 'End') fontOptions[fontOptions.length - 1].focus();
    else if (index !== -1) {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      fontOptions[(index + step + fontOptions.length) % fontOptions.length].focus();
    }
  }
});
fontList.addEventListener('click', event => {
  const option = event.target.closest('[role="option"]');
  if (!option) return;
  byId('font').value = option.dataset.value;
  closeFontList();
  fontTrigger.focus();
  render();
});
fontPicker.addEventListener('focusout', event => {
  if (!fontPicker.contains(event.relatedTarget)) closeFontList();
});
document.addEventListener('pointerdown', event => {
  if (!fontPicker.contains(event.target)) closeFontList();
});

function render(feedback) {
  const draft = readDraft();
  const dirty = Object.keys(draft).some(name => draft[name] !== saved[name]);
  document.body.dataset.theme = draft.theme;
  const sample = byId('sample');
  sample.dataset.font = draft.font;
  for (const option of fontOptions) {
    const selected = option.dataset.value === draft.font;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-selected', String(selected));
    if (selected) fontTrigger.querySelector('.select-label').textContent = option.textContent;
  }
  sample.style.fontSize = draft.size + 'px';
  sample.classList.toggle('spaced', draft.spacing);
  byId('size-value').value = draft.size + ' px';
  byId('size').setAttribute('aria-valuetext', draft.size + ' 像素');
  byId('volume-value').value = draft.volume + '%';
  byId('volume').setAttribute('aria-valuetext', draft.volume + '%');

  const count = topics.filter(input => input.checked).length;
  const all = byId('select-all');
  all.checked = count === topics.length;
  all.indeterminate = count > 0 && count < topics.length;
  byId('selected-count').textContent = '已选择 ' + count + ' 项，共 ' + topics.length + ' 项';
  for (const input of [all, ...topics]) {
    input.disabled = !draft.enabled;
    input.closest('label').classList.toggle('disabled', input.disabled);
  }
  byId('volume').disabled = !draft.enabled;
  byId('volume-control').classList.toggle('disabled', !draft.enabled);

  const recent = byId('recent');
  byId('shelf').setCustomValidity(draft.shelf.trim() ? '' : '请输入书架名称。');
  setError('shelf', !byId('shelf').validity.valid);
  setError('recent', !recent.validity.valid);
  byId('decrease').disabled = recent.valueAsNumber <= Number(recent.min);
  byId('increase').disabled = recent.valueAsNumber >= Number(recent.max);
  byId('revert').disabled = !dirty;
  byId('save').disabled = !dirty;
  byId('defaults').disabled = Object.keys(draft).every(name => draft[name] === defaults[name]);
  byId('status').textContent = feedback || (dirty ? '有未保存的更改' : '演示设置仅在本次打开期间保存');
}

form.addEventListener('input', () => render());
byId('select-all').addEventListener('input', event => {
  for (const topic of topics) topic.checked = event.target.checked;
});
function stepRecent(direction) {
  const input = byId('recent');
  if (direction > 0) input.stepUp();
  else input.stepDown();
  render();
}
byId('decrease').addEventListener('click', () => stepRecent(-1));
byId('increase').addEventListener('click', () => stepRecent(1));
byId('defaults').addEventListener('click', () => {
  restore(defaults);
  render(Object.keys(defaults).some(name => defaults[name] !== saved[name])
    ? '已恢复默认值，可在底部保存或撤销。'
    : '已恢复默认值，与已保存的设置一致。');
});
byId('revert').addEventListener('click', () => {
  restore(saved);
  render('已撤销更改。');
});
form.addEventListener('submit', event => {
  event.preventDefault();
  const invalid = fields.find(field => !field.validity.valid);
  if (invalid) {
    const panel = invalid.closest('form > section');
    // Replace the current fragment without a deferred hashchange stealing input focus.
    if (location.hash !== '#' + panel.id) history.replaceState(null, '', '#' + panel.id);
    showPanel(panel.id);
    invalid.focus();
    invalid.reportValidity();
    render('请修正资料库中标出的设置。');
    return;
  }
  saved = readDraft();
  render('更改已保存在本次演示中。');
});
window.addEventListener('hashchange', () => showPanel(location.hash.slice(1), true));
showPanel(location.hash.slice(1));
render();
