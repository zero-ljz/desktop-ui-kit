const infoBarIcons = new Map([
  ['info', 'i'],
  ['success', '✓'],
  ['warning', '!'],
  ['error', '×']
]);

function createInfoBar({
  severity = 'info', title, message = '', action, closable = false, closeLabel = '关闭提示', onClose
} = {}) {
  const bar = document.createElement('div');
  bar.className = 'ds-info-bar';
  bar.dataset.severity = infoBarIcons.has(severity) ? severity : 'info';

  const icon = document.createElement('span');
  icon.className = 'ds-info-bar-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = infoBarIcons.get(bar.dataset.severity);

  const body = document.createElement('div');
  body.className = 'ds-info-bar-body';
  const text = document.createElement('div');
  text.className = 'ds-info-bar-text';
  text.setAttribute('role', bar.dataset.severity === 'error' ? 'alert' : 'status');
  text.setAttribute('aria-atomic', 'true');
  if (title) {
    const heading = document.createElement('strong');
    heading.textContent = title;
    text.append(heading, ' ');
  }
  const detail = document.createElement('span');
  detail.textContent = message;
  text.append(detail);
  body.append(text);
  bar.append(icon, body);

  if (action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = action.label;
    button.addEventListener('click', action.onClick);
    body.append(button);
  }
  if (closable) {
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'ds-info-bar-close';
    close.setAttribute('aria-label', closeLabel);
    close.textContent = '×';
    close.addEventListener('click', () => {
      bar.hidden = true;
      onClose?.();
    });
    bar.append(close);
  }
  bar.setMessage = next => {
    if (detail.textContent !== next) detail.textContent = next;
  };
  return bar;
}
