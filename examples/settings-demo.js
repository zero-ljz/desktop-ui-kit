'use strict';

const form = document.querySelector('#preferences');
const fields = [...form.querySelectorAll('[name]')];
const panels = [...form.querySelectorAll(':scope > section')];
const links = [...document.querySelectorAll('.sidebar-item')];
const topics = [...form.querySelectorAll('.topic input')];
const byId = id => document.getElementById(id);
const fontField = byId('font');
const fontPicker = DesktopSettings.createSelect({
  id: 'font-trigger',
  labelledBy: 'font-label',
  options: [
    { value: 'serif', label: '衬线字体' },
    { value: 'sans', label: '系统字体' },
    { value: 'mono', label: '等宽字体' }
  ],
  value: fontField.value,
  onChange(value) {
    fontField.value = value;
    render();
  }
});
byId('font-picker').replaceWith(fontPicker);

const shelfPicker = DesktopSettings.bindEditableSelect(byId('shelf'), {
  label: '书架名称预设',
  options: ['我的书架', '正在读', '想读清单', '已读收藏']
});

const validationBar = DesktopSettings.createInfoBar({
  severity: 'error',
  title: '无法保存',
  action: { label: '查看第一项', onClick: () => getInvalidFields()[0]?.focus() }
});
validationBar.hidden = true;
byId('library-validation').replaceWith(validationBar);

const menuBar = DesktopSettings.createMenuBar({
  label: '偏好设置菜单',
  menus: [
    { label: '视图', items: links.map(link => ({
      label: link.querySelector('.sidebar-label').textContent,
      onSelect: () => link.click()
    })) },
    { label: '编辑', items: () => [
      menuCommand('save'), menuCommand('revert'), { type: 'separator' }, menuCommand('defaults')
    ] }
  ]
});
byId('settings-menu').replaceWith(menuBar);

function menuCommand(id) {
  const button = byId(id);
  return { label: button.textContent, disabled: button.disabled, onSelect: () => button.click() };
}

const size = byId('size');
function changeSize(larger) {
  if (larger) size.stepUp();
  else size.stepDown();
  render();
}
const previewMenu = DesktopSettings.bindContextMenu(byId('type-preview'), {
  label: '排版选项',
  trigger: byId('preview-menu'),
  items: () => [
    { label: '增大字号', disabled: size.valueAsNumber >= Number(size.max), onSelect: () => changeSize(true) },
    { label: '减小字号', disabled: size.valueAsNumber <= Number(size.min), onSelect: () => changeSize(false) },
    { type: 'separator' },
    { label: '段落留白', checked: byId('spacing').checked, onSelect: () => byId('spacing').click() }
  ]
});
DesktopSettings.setTooltip(byId('preview-menu'), '更多排版选项');

const narrowSidebar = matchMedia('(max-width: 620px)');
function updateNavTooltips() {
  for (const link of links) {
    if (narrowSidebar.matches) {
      DesktopSettings.setTooltip(link, link.querySelector('.sidebar-label').textContent, { placement: 'right' });
    } else {
      DesktopSettings.clearTooltip(link);
    }
  }
}
narrowSidebar.addEventListener('change', updateNavTooltips);
updateNavTooltips();

const bookmarkSearch = byId('bookmark-search');
const bookmarkRows = [...byId('bookmarks').children];
function filterBookmarks() {
  const query = bookmarkSearch.value.trim().toLocaleLowerCase();
  for (const row of bookmarkRows) {
    row.hidden = !row.querySelector('.manage-main').textContent.toLocaleLowerCase().includes(query);
  }
  byId('bookmarks-empty').hidden = bookmarkRows.some(row => !row.hidden);
  byId('clear-search').disabled = !bookmarkSearch.value;
}
bookmarkSearch.addEventListener('input', filterBookmarks);
bookmarkSearch.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.isComposing) event.preventDefault();
});
byId('clear-search').addEventListener('click', () => {
  bookmarkSearch.value = '';
  filterBookmarks();
  bookmarkSearch.focus();
});
for (const row of bookmarkRows) {
  const button = row.querySelector('[data-excerpt]');
  button.addEventListener('click', () => DesktopSettings.showAlert(button.dataset.excerpt, row.querySelector('.manage-title').textContent));
}

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
  shelfPicker.close();
  for (const field of fields) {
    const value = draft[field.name];
    if (field.type === 'checkbox') field.checked = value;
    else if (field.type === 'radio') field.checked = field.value === value;
    else field.value = value;
  }
  fontPicker.setValue(fontField.value);
}

function showPanel(id, focusHeading = false) {
  fontPicker.close();
  shelfPicker.close();
  menuBar.close();
  previewMenu.close();
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
  byId(id).setAttribute('aria-describedby', invalid ? `${id}-hint ${id}-error` : `${id}-hint`);
  byId(id + '-error').hidden = !invalid;
}

function getInvalidFields() {
  const shelf = byId('shelf');
  shelf.setCustomValidity(shelf.value.trim() ? '' : '请输入书架名称。');
  return fields.filter(field => field.willValidate && !field.validity.valid);
}

function render(feedback) {
  const draft = readDraft();
  const dirty = Object.keys(draft).some(name => draft[name] !== saved[name]);
  document.body.dataset.theme = draft.theme;
  const sample = byId('sample');
  sample.dataset.font = draft.font;
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
  const invalidFields = getInvalidFields();
  setError('shelf', !byId('shelf').validity.valid);
  setError('recent', !recent.validity.valid);
  if (!validationBar.hidden) {
    if (invalidFields.length) validationBar.setMessage(`仍有 ${invalidFields.length} 项需要修正。`);
    else validationBar.hidden = true;
  }
  byId('decrease').disabled = recent.valueAsNumber <= Number(recent.min);
  byId('increase').disabled = recent.valueAsNumber >= Number(recent.max);
  byId('revert').disabled = !dirty;
  byId('save').disabled = !dirty;
  byId('defaults').disabled = Object.keys(draft).every(name => draft[name] === defaults[name]);
  const status = byId('status');
  const message = feedback || (dirty ? '有未保存的更改' : '演示设置仅在本次打开期间保存');
  if (status.textContent !== message) status.textContent = message;
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
byId('preview-alert').addEventListener('click', async () => {
  await DesktopSettings.showAlert('阅读偏好仅在本次演示中保存。', '保存说明');
  byId('dialog-result').textContent = '已关闭提示。';
});
byId('preview-confirm').addEventListener('click', async () => {
  const accepted = await DesktopSettings.showConfirm('结束本次预览？');
  byId('dialog-result').textContent = accepted ? '已确认。' : '已取消。';
});
byId('preview-prompt').addEventListener('click', async () => {
  const text = await DesktopSettings.showPrompt('输入一个书签名称。', '读到这里', '书签名称');
  byId('dialog-result').textContent = text === null ? '已取消。' : `输入结果：“${text}”`;
});
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
  const [invalid] = getInvalidFields();
  if (invalid) {
    const panel = invalid.closest('form > section');
    // Replace the current fragment without a deferred hashchange stealing input focus.
    if (location.hash !== '#' + panel.id) history.replaceState(null, '', '#' + panel.id);
    showPanel(panel.id);
    validationBar.hidden = false;
    render();
    invalid.focus();
    invalid.reportValidity();
    return;
  }
  saved = readDraft();
  render('更改已保存在本次演示中。');
});
window.addEventListener('hashchange', () => showPanel(location.hash.slice(1), true));
showPanel(location.hash.slice(1));
render();
