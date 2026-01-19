/**
 * Configuration constants for confirm dialog
 */
const CONFIRM_CONFIG = {
  /** Animation duration for fade out in milliseconds */
  FADE_OUT_DURATION_MS: 200,
  /** Default options */
  DEFAULTS: {
    CONFIRM_TEXT: '确认',
    CANCEL_TEXT: '取消',
    ICON: '⚠️',
    DANGER: true,
  },
  /** Container element ID */
  CONTAINER_ID: 'confirm-dialog',
};

/**
 * Confirm dialog options
 * @typedef {Object} ConfirmOptions
 * @property {string} [confirmText='确认'] - Text for confirm button
 * @property {string} [cancelText='取消'] - Text for cancel button
 * @property {string} [icon='⚠️'] - Icon to display in title
 * @property {boolean} [danger=true] - Whether to style as dangerous action
 */

/**
 * Shows a custom confirmation dialog
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {ConfirmOptions} [options={}] - Configuration options
 * @returns {Promise<boolean>} Resolves to true if confirmed, false if cancelled
 */
function showConfirm(title, message, options = {}) {
  return new Promise((resolve) => {
    const config = {
      confirmText: options.confirmText || CONFIRM_CONFIG.DEFAULTS.CONFIRM_TEXT,
      cancelText: options.cancelText || CONFIRM_CONFIG.DEFAULTS.CANCEL_TEXT,
      icon: options.icon || CONFIRM_CONFIG.DEFAULTS.ICON,
    };

    const overlay = createOverlayElement(title, message, config);
    bindDialogEvents(overlay, resolve);
    appendToContainer(overlay);
  });
}

/**
 * Creates the overlay element with dialog content
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Object} config - Resolved configuration
 * @returns {HTMLElement} Overlay element
 */
function createOverlayElement(title, message, config) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.innerHTML = renderDialogContent(title, message, config);
  return overlay;
}

/**
 * Renders the dialog content HTML
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message
 * @param {Object} config - Configuration object
 * @returns {string} HTML string
 */
function renderDialogContent(title, message, config) {
  return `
    <div class="confirm-dialog">
      <div class="confirm-title">
        <span>${config.icon}</span>
        <span>${escapeHtml(title)}</span>
      </div>
      <div class="confirm-message">${escapeHtml(message)}</div>
      <div class="confirm-actions">
        <button class="confirm-btn confirm-btn-cancel">${escapeHtml(config.cancelText)}</button>
        <button class="confirm-btn confirm-btn-confirm">${escapeHtml(config.confirmText)}</button>
      </div>
    </div>
  `;
}

/**
 * Binds event handlers to the dialog
 * @param {HTMLElement} overlay - Overlay element
 * @param {Function} resolve - Promise resolve function
 */
function bindDialogEvents(overlay, resolve) {
  const confirmBtn = overlay.querySelector('.confirm-btn-confirm');
  const cancelBtn = overlay.querySelector('.confirm-btn-cancel');

  confirmBtn.onclick = () => closeDialog(overlay, resolve, true);
  cancelBtn.onclick = () => closeDialog(overlay, resolve, false);

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeDialog(overlay, resolve, false);
    }
  };
}

/**
 * Closes the dialog with animation
 * @param {HTMLElement} overlay - Overlay element
 * @param {Function} resolve - Promise resolve function
 * @param {boolean} result - Dialog result (true for confirm, false for cancel)
 */
function closeDialog(overlay, resolve, result) {
  overlay.style.opacity = '0';
  setTimeout(() => {
    overlay.remove();
  }, CONFIRM_CONFIG.FADE_OUT_DURATION_MS);
  resolve(result);
}

/**
 * Appends the overlay to the container
 * @param {HTMLElement} overlay - Overlay element
 */
function appendToContainer(overlay) {
  const container = document.getElementById(CONFIRM_CONFIG.CONTAINER_ID);
  if (container) {
    container.appendChild(overlay);
  } else {
    document.body.appendChild(overlay);
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
