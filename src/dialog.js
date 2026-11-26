let nextDialogId = 0;

function showModal({
  title = '提示', message, type = 'alert', defaultValue = '',
  okLabel = '确定', cancelLabel = '取消',
  root = document.activeElement?.closest('.ds-settings') || document.querySelector('.ds-settings')
}) {
  const host = root && root !== document.documentElement ? root : document.body;
  const dialog = document.createElement('dialog');
  dialog.className = 'ds-dialog';
  const id = 'ds-dialog-' + ++nextDialogId;
  const heading = document.createElement('h2');
  heading.className = 'ds-dialog-title';
  heading.id = id + '-title';
  heading.textContent = title;
  const messageElement = document.createElement('p');
  messageElement.className = 'ds-dialog-message';
  messageElement.id = id + '-message';
  messageElement.textContent = message ?? '';
  dialog.setAttribute('aria-labelledby', heading.id);
  dialog.setAttribute('aria-describedby', messageElement.id);
  dialog.append(heading, messageElement);

  let input;
  if (type === 'prompt') {
    input = document.createElement('input');
    input.type = 'text';
    input.className = 'input-text';
    input.value = defaultValue;
    input.setAttribute('aria-labelledby', heading.id);
    input.setAttribute('aria-describedby', messageElement.id);
    input.autofocus = true;
    dialog.append(input);
  }

  const footer = document.createElement('div');
  footer.className = 'ds-dialog-actions';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.className = 'btn btn-primary';
  ok.textContent = okLabel;
  ok.autofocus = !input;
  ok.addEventListener('click', () => dialog.close('accept'));
  footer.append(ok);
  if (type === 'confirm' || input) {
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn';
    cancel.textContent = cancelLabel;
    cancel.addEventListener('click', () => dialog.close());
    footer.append(cancel);
  }
  dialog.append(footer);
  dialog.addEventListener('keydown', event => {
    if (event.isComposing || event.keyCode === 229) return;
    if (event.key === 'Enter' && event.target === input) {
      event.preventDefault();
      dialog.close('accept');
    } else if (event.key === 'Tab') {
      const first = input || ok;
      const last = footer.lastElementChild;
      if (event.shiftKey && event.target === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && event.target === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (['Enter', 'Tab', 'Escape'].includes(event.key)) event.stopPropagation();
  });

  return new Promise((resolve, reject) => {
    dialog.addEventListener('close', () => {
      const accepted = dialog.returnValue === 'accept';
      dialog.remove();
      if (input) resolve(accepted ? input.value : null);
      else resolve(type === 'alert' || accepted);
    }, { once: true });
    host.append(dialog);
    try {
      dialog.showModal();
      input?.select();
    } catch (error) {
      dialog.remove();
      reject(error);
    }
  });
}

function showAlert(message, title = '提示') {
  return showModal({ type: 'alert', title, message });
}

function showConfirm(message, title = '确认操作') {
  return showModal({ type: 'confirm', title, message });
}

function showPrompt(message, defaultValue = '', title = '输入') {
  return showModal({ type: 'prompt', title, message, defaultValue });
}
