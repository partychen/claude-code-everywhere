/**
 * 显示自定义确认对话框
 * @param {string} title - 对话框标题
 * @param {string} message - 对话框消息
 * @param {object} options - 配置选项
 * @returns {Promise<boolean>} - 用户选择结果
 */
function showConfirm(title, message, options = {}) {
  return new Promise((resolve) => {
    const {
      confirmText = '确认',
      cancelText = '取消',
      icon = '⚠️',
      danger = true
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    overlay.innerHTML = `
      <div class="confirm-dialog">
        <div class="confirm-title">
          <span>${icon}</span>
          <span>${escapeHtml(title)}</span>
        </div>
        <div class="confirm-message">${escapeHtml(message)}</div>
        <div class="confirm-actions">
          <button class="confirm-btn confirm-btn-cancel">${escapeHtml(cancelText)}</button>
          <button class="confirm-btn confirm-btn-confirm">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    const confirmBtn = overlay.querySelector('.confirm-btn-confirm');
    const cancelBtn = overlay.querySelector('.confirm-btn-cancel');

    const cleanup = () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    };

    confirmBtn.onclick = () => {
      cleanup();
      resolve(true);
    };

    cancelBtn.onclick = () => {
      cleanup();
      resolve(false);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    };

    document.getElementById('confirm-dialog').appendChild(overlay);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
