'use strict';

const byId = id => document.getElementById(id);
const links = [...document.querySelectorAll('.sidebar-item')];
const themeOptions = [...byId('theme-options').querySelectorAll('input')];
function applyTheme(option) {
  option.checked = true;
  document.body.dataset.theme = option.value;
}
byId('theme-options').addEventListener('change', event => applyTheme(event.target));
applyTheme(themeOptions.find(option => option.checked));
const menuBar = DesktopSettings.createMenuBar({
  label: '图库菜单',
  menus: [
    { label: '分类', items: () => links.map(link => ({
      label: link.querySelector('.sidebar-label').textContent,
      checked: link.hasAttribute('aria-current'),
      onSelect: () => link.click()
    })) },
    { label: '主题', items: () => themeOptions.map(option => ({
      label: option.labels[0].textContent,
      checked: option.checked,
      onSelect: () => applyTheme(option)
    })) }
  ]
});
byId('gallery-menu').replaceWith(menuBar);

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

const demoButtons = document.querySelectorAll('.button-samples button:enabled');
const buttonResult = byId('button-result');
const initialResult = buttonResult.textContent;
let clicks = 0;
for (const button of demoButtons) {
  button.addEventListener('click', () => {
    clicks++;
    buttonResult.textContent = `最近点击「${button.textContent}」，共触发 ${clicks} 次。`;
    byId('clear-clicks').disabled = false;
  });
}
byId('disable-buttons').addEventListener('change', event => {
  for (const button of demoButtons) button.disabled = event.target.checked;
});
byId('clear-clicks').addEventListener('click', () => {
  clicks = 0;
  buttonResult.textContent = initialResult;
  byId('clear-clicks').disabled = true;
});

function showFieldError(input, hint, error) {
  const invalid = !input.validity.valid;
  input.setAttribute('aria-invalid', String(invalid));
  input.setAttribute('aria-describedby', invalid ? hint + ' ' + error : hint);
  byId(error).hidden = !invalid;
}
byId('sample-text').addEventListener('input', ({ target }) => {
  target.setCustomValidity(target.value.trim() ? '' : byId('text-error').textContent);
  showFieldError(target, 'text-hint', 'text-error');
});
const level = byId('level');
function updateLevel() {
  byId('level-value').value = level.value + '%';
  level.setAttribute('aria-valuetext', level.value + '%');
}
level.addEventListener('input', updateLevel);
updateLevel();
const timeout = byId('timeout');
DesktopSettings.bindNumberStepper(timeout);
timeout.addEventListener('input', () => showFieldError(timeout, 'timeout-hint', 'timeout-error'));

DesktopSettings.bindPasswordInput(byId('proxy-password'), byId('toggle-password'));
DesktopSettings.bindShortcutInput(byId('shortcut'), byId('record-shortcut'), byId('clear-shortcut'));
byId('extension-tags').append(DesktopSettings.createTagInput({
  id: 'extension', values: ['.log', '.tmp'], placeholder: '例如 .bak'
}));
const date = byId('effective-date');
const today = new Date();
date.min = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
date.value = date.min;
date.addEventListener('input', () => showFieldError(date, 'date-hint', 'date-error'));
byId('reminder-time').addEventListener('input', ({ target }) => showFieldError(target, 'time-hint', 'time-error'));

function reportPickerError() {
  DesktopSettings.showAlert('无法打开选择器，可以在文本框中直接输入路径。', '选择路径');
}
DesktopSettings.bindPathPicker(byId('config-file'), byId('browse-file'), { onError: reportPickerError });
DesktopSettings.bindPathPicker(byId('download-folder'), byId('browse-folder'), {
  kind: 'directory', onError: reportPickerError
});
const hex = byId('color-hex');
DesktopSettings.bindColorInput(hex, byId('color-swatch'));
hex.addEventListener('input', () => showFieldError(hex, 'hex-hint', 'hex-error'));

const sizePicker = DesktopSettings.createSelect({
  id: 'size-trigger', labelledBy: 'size-label', value: 'medium',
  options: [
    { value: 'small', label: '小号' },
    { value: 'medium', label: '中号' },
    { value: 'large', label: '大号' }
  ]
});
byId('size-picker').append(sizePicker);
const colorPicker = DesktopSettings.bindEditableSelect(byId('color-input'), {
  label: '颜色预设', options: ['天蓝', '深蓝', '草绿', '石墨灰']
});
const formatsPicker = DesktopSettings.createMultiSelect({
  id: 'formats-trigger', labelledBy: 'formats-label', placeholder: '选择文件格式',
  options: ['PDF', 'Word (.docx)', 'Markdown (.md)', '纯文本 (.txt)', 'PNG', 'JPEG'].map(label => ({ value: label, label })),
  values: ['PDF', 'Markdown (.md)']
});
byId('formats-picker').append(formatsPicker);

const options = [...document.querySelectorAll('.child-option input')];
const selectAll = byId('select-all');
function updateCheckboxes() {
  const count = options.filter(option => option.checked).length;
  selectAll.checked = count === options.length;
  selectAll.indeterminate = count > 0 && count < options.length;
  byId('selected-count').textContent = `已选择 ${count} 项，共 ${options.length} 项`;
  for (const input of [selectAll, ...options]) {
    input.disabled = !byId('enable-options').checked;
    input.closest('label').classList.toggle('disabled', input.disabled);
  }
}
byId('checkbox-group').addEventListener('change', event => {
  if (event.target === selectAll) {
    for (const option of options) option.checked = selectAll.checked;
  }
  updateCheckboxes();
});
byId('enable-options').addEventListener('change', updateCheckboxes);
updateCheckboxes();

DesktopSettings.bindPivot(byId('settings-pivot'));

const search = byId('list-search');
const rows = [...byId('component-list').children];
function filterRows() {
  const query = search.value.trim().toLowerCase();
  for (const row of rows) {
    row.hidden = !row.querySelector('.manage-main').textContent.toLowerCase().includes(query);
  }
  byId('list-empty').hidden = rows.some(row => !row.hidden);
  byId('clear-search').disabled = !search.value;
}
search.addEventListener('input', filterRows);
byId('clear-search').addEventListener('click', () => {
  search.value = '';
  filterRows();
  search.focus();
});

const dialogResult = byId('dialog-result');
byId('preview-alert').addEventListener('click', async () => {
  await DesktopSettings.showAlert('点击确定或按 Esc 关闭。', '提示框');
  dialogResult.textContent = '已关闭提示框。';
});
byId('preview-confirm').addEventListener('click', async () => {
  const accepted = await DesktopSettings.showConfirm('确认此次示例操作？', '确认框');
  dialogResult.textContent = accepted ? '已确认。' : '已取消。';
});
byId('preview-prompt').addEventListener('click', async () => {
  const text = await DesktopSettings.showPrompt('请输入示例文本。', '示例', '输入框');
  dialogResult.textContent = text === null ? '已取消。' : `返回文本：“${text}”`;
});
const previewMenu = DesktopSettings.bindContextMenu(byId('menu-sample'), {
  label: '预览操作', trigger: byId('open-menu'),
  items: [
    { label: '打开提示框', onSelect: () => byId('preview-alert').click() },
    { label: '打开确认框', onSelect: () => byId('preview-confirm').click() }
  ]
});
DesktopSettings.setTooltip(byId('open-menu'), '使用 Shift+F10 也可展开菜单');

const infoMessages = {
  info: '可以切换提示类型，比较颜色和图标。',
  success: '示例操作已完成。',
  warning: '请在继续前检查输入内容。',
  error: '输入值超出允许范围。'
};
function showInfo() {
  const select = byId('severity');
  byId('info-preview').replaceChildren(DesktopSettings.createInfoBar({
    severity: select.value, title: select.selectedOptions[0].textContent,
    message: infoMessages[select.value], closable: true,
    onClose: () => byId('show-info').focus()
  }));
}
byId('severity').addEventListener('change', showInfo);
byId('show-info').addEventListener('click', showInfo);
showInfo();

function showPanel(focusHeading = false) {
  sizePicker.close();
  colorPicker.close();
  formatsPicker.close();
  menuBar.close();
  previewMenu.close();
  const current = links.find(link => link.hash === location.hash) || links[0];
  const index = links.indexOf(current);
  for (const link of links) {
    byId(link.hash.slice(1)).hidden = link !== current;
    if (link === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  byId('previous').disabled = index === 0;
  byId('next').disabled = index === links.length - 1;
  byId('page-status').textContent = `第 ${index + 1} 类，共 ${links.length} 类`;
  document.querySelector('.content').scrollTop = 0;
  const heading = byId(current.hash.slice(1)).querySelector('h1');
  if (focusHeading) heading.focus({ preventScroll: true });
}
function moveCategory(offset) {
  const index = links.findIndex(link => link.hasAttribute('aria-current'));
  links[index + offset]?.click();
}
byId('previous').addEventListener('click', () => moveCategory(-1));
byId('next').addEventListener('click', () => moveCategory(1));
window.addEventListener('hashchange', () => showPanel(true));
showPanel();
