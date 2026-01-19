/**
 * Configuration constants for DirectoryList component
 */
const CONFIG = {
  // Drag thresholds
  DRAG_MAX_DISTANCE: 90,
  DRAG_EXPAND_THRESHOLD_TOUCH: 25,
  DRAG_EXPAND_THRESHOLD_MOUSE: 14,
  DRAG_ARROW_THRESHOLD_TOUCH: 25,
  DRAG_ARROW_THRESHOLD_MOUSE: 14,
  DRAG_ACTIONS_VISIBLE_THRESHOLD_TOUCH: 50,
  DRAG_ACTIONS_VISIBLE_THRESHOLD_MOUSE: 30,

  // Toast
  TOAST_DURATION_MS: 3000,
  TOAST_FADE_DURATION_MS: 300,
};

/**
 * DirectoryList component for managing and displaying working directories.
 * Supports swipe-to-reveal actions on mobile and desktop.
 */
class DirectoryList {
  /**
   * @param {Object} api - API client instance for backend communication
   */
  constructor(api) {
    this.api = api;
    this.currentOpenAlias = null;
    this.eventListeners = [];
  }

  // ============================================
  // Rendering Methods
  // ============================================

  /**
   * Renders the directory list, fetching data from API
   */
  async render() {
    const container = document.getElementById('dir-list');
    container.innerHTML = this.renderLoadingState();

    try {
      const { data: directories } = await this.api.getDirectories();

      if (directories.length === 0) {
        container.innerHTML = this.renderEmptyState();
        return;
      }

      const previewsMap = await this.fetchPreviewsMap();
      container.innerHTML = directories
        .map((dir) => this.renderCard(dir, previewsMap[dir.alias]))
        .join('');

      this.cleanupEventListeners();
      this.initSwipeHandlers();
      this.initToggleButtons();
    } catch (error) {
      container.innerHTML = this.renderErrorState(error.message);
    }
  }

  /**
   * Renders loading state HTML
   * @returns {string} HTML string
   */
  renderLoadingState() {
    return '<div class="empty-state"><div class="loading"></div><p>加载中...</p></div>';
  }

  /**
   * Renders empty state HTML when no directories exist
   * @returns {string} HTML string
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📁</div>
        <h3 class="empty-state-title">暂无工作目录</h3>
        <p class="empty-state-text">点击右下角 + 按钮添加第一个工作目录</p>
      </div>
    `;
  }

  /**
   * Renders error state HTML
   * @param {string} message - Error message to display
   * @returns {string} HTML string
   */
  renderErrorState(message) {
    return `
      <div class="card card-error">
        <h3 class="card-error-title">❌ 加载失败</h3>
        <p class="card-error-message">${this.escapeHtml(message)}</p>
      </div>
    `;
  }

  /**
   * Renders a directory card
   * @param {Object} dir - Directory data
   * @param {Object|undefined} previewStatus - Preview status if available
   * @returns {string} HTML string
   */
  renderCard(dir, previewStatus) {
    const alias = this.escapeHtml(dir.alias);
    const isPreviewRunning = previewStatus && previewStatus.tunnelUrl;

    return `
      <div class="card-swipe-container" data-alias="${alias}">
        ${this.renderSwipeActions(dir, isPreviewRunning)}
        <div class="card-swipe-wrapper card-collapsed with-transition">
          <div class="card">
            ${this.renderSetDefaultButton(dir)}
            ${this.renderCardHeader(dir, isPreviewRunning)}
            <p class="card-path">📂 ${this.escapeHtml(dir.path)}</p>
            ${this.renderDescription(dir.description)}
            ${this.renderPreviewConfig(dir)}
            <div class="clearfix"></div>
          </div>
        </div>
        <button class="card-toggle-btn toggle-btn-collapsed with-transition" data-alias="${alias}">
          <svg class="toggle-arrow toggle-arrow-collapsed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"></path>
          </svg>
          <svg class="toggle-arrow toggle-arrow-expanded" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"></path>
          </svg>
        </button>
      </div>
    `;
  }

  /**
   * Renders swipe action buttons
   * @param {Object} dir - Directory data
   * @param {boolean} isPreviewRunning - Whether preview is currently running
   * @returns {string} HTML string
   */
  renderSwipeActions(dir, isPreviewRunning) {
    const previewButton = dir.preview_enabled
      ? `<button class="swipe-action-btn swipe-action-preview ${isPreviewRunning ? 'preview-stop' : 'preview-start'}"
           data-action="${isPreviewRunning ? 'stop-preview' : 'start-preview'}">
           ${isPreviewRunning ? '🛑 停止' : '🚀 启动'}
         </button>`
      : '';

    return `
      <div class="card-swipe-actions">
        ${previewButton}
        <button class="swipe-action-btn swipe-action-edit" data-action="edit">✏️ 编辑</button>
        <button class="swipe-action-btn swipe-action-delete" data-action="delete">🗑️ 删除</button>
      </div>
    `;
  }

  /**
   * Renders the "set as default" button if applicable
   * @param {Object} dir - Directory data
   * @returns {string} HTML string
   */
  renderSetDefaultButton(dir) {
    if (dir.is_default) return '';
    const alias = this.escapeHtml(dir.alias);
    return `
      <button onclick="directoryList.setDefault('${alias}')" class="btn btn-primary btn-set-default">
        ⭐ 设为默认
      </button>
    `;
  }

  /**
   * Renders card header with title and badges
   * @param {Object} dir - Directory data
   * @param {boolean} isPreviewRunning - Whether preview is running
   * @returns {string} HTML string
   */
  renderCardHeader(dir, isPreviewRunning) {
    const badges = this.renderBadges(dir, isPreviewRunning);
    return `
      <h3 class="card-header card-title">
        ${this.escapeHtml(dir.alias)}
        ${badges}
      </h3>
    `;
  }

  /**
   * Renders status badges for a directory
   * @param {Object} dir - Directory data
   * @param {boolean} isPreviewRunning - Whether preview is running
   * @returns {string} HTML string of badges
   */
  renderBadges(dir, isPreviewRunning) {
    const badges = [];
    if (dir.is_default) {
      badges.push('<span class="badge badge-green">默认</span>');
    }
    if (dir.preview_enabled) {
      badges.push('<span class="badge badge-blue">预览</span>');
      if (isPreviewRunning) {
        badges.push('<span class="badge badge-success">运行中</span>');
      }
    }
    return badges.join(' ');
  }

  /**
   * Renders description if present
   * @param {string|null} description - Description text
   * @returns {string} HTML string
   */
  renderDescription(description) {
    if (!description) return '';
    return `<p class="card-description">${this.escapeHtml(description)}</p>`;
  }

  /**
   * Renders preview configuration section
   * @param {Object} dir - Directory data
   * @returns {string} HTML string
   */
  renderPreviewConfig(dir) {
    if (!dir.preview_enabled) return '';
    return `
      <div class="preview-config">
        <p class="preview-config-item">
          <strong>启动命令:</strong>
          <code class="preview-config-code">${this.escapeHtml(dir.start_cmd || 'N/A')}</code>
        </p>
        <p class="preview-config-item">
          <strong>端口:</strong> ${dir.preview_port || 'N/A'}
        </p>
      </div>
    `;
  }

  // ============================================
  // Data Fetching
  // ============================================

  /**
   * Fetches preview statuses and returns a map by alias
   * @returns {Promise<Object>} Map of alias to preview status
   */
  async fetchPreviewsMap() {
    try {
      const { data: previews } = await this.api.getPreviews();
      return previews.reduce((map, preview) => {
        map[preview.alias] = preview;
        return map;
      }, {});
    } catch (error) {
      console.warn('Failed to load preview statuses:', error);
      return {};
    }
  }

  // ============================================
  // Card State Management
  // ============================================

  /**
   * Sets transition state for card elements
   * @param {HTMLElement} wrapper - Card wrapper element
   * @param {HTMLElement} toggleBtn - Toggle button element
   * @param {boolean} enabled - Whether transitions should be enabled
   */
  setTransitionEnabled(wrapper, toggleBtn, enabled) {
    const addClass = enabled ? 'with-transition' : 'no-transition';
    const removeClass = enabled ? 'no-transition' : 'with-transition';

    wrapper.classList.remove(removeClass);
    wrapper.classList.add(addClass);
    toggleBtn.classList.remove(removeClass);
    toggleBtn.classList.add(addClass);
  }

  /**
   * Sets expanded/collapsed state for card
   * @param {HTMLElement} wrapper - Card wrapper element
   * @param {HTMLElement} toggleBtn - Toggle button element
   * @param {boolean} expanded - Whether card should be expanded
   */
  setCardExpanded(wrapper, toggleBtn, expanded) {
    if (expanded) {
      wrapper.classList.replace('card-collapsed', 'card-expanded');
      toggleBtn.classList.replace('toggle-btn-collapsed', 'toggle-btn-expanded');
    } else {
      wrapper.classList.replace('card-expanded', 'card-collapsed');
      toggleBtn.classList.replace('toggle-btn-expanded', 'toggle-btn-collapsed');
    }
  }

  /**
   * Sets drag position during swipe
   * @param {HTMLElement} wrapper - Card wrapper element
   * @param {HTMLElement} toggleBtn - Toggle button element
   * @param {number} distance - Distance in pixels
   */
  setDragPosition(wrapper, toggleBtn, distance) {
    wrapper.style.transform = `translateX(-${distance}px)`;
    toggleBtn.style.transform = `translateY(-50%) translateX(-${distance}px)`;
  }

  /**
   * Clears inline transform styles
   * @param {HTMLElement} wrapper - Card wrapper element
   * @param {HTMLElement} toggleBtn - Toggle button element
   */
  clearInlineTransform(wrapper, toggleBtn) {
    wrapper.style.transform = '';
    toggleBtn.style.transform = '';
  }

  /**
   * Toggles FAB button visibility
   * @param {boolean} show - Whether to show the FAB
   */
  toggleFabButton(show) {
    const fabAdd = document.getElementById('fab-add');
    if (fabAdd) {
      fabAdd.style.display = show ? '' : 'none';
    }
  }

  /**
   * Closes the currently open card
   */
  closeOpenCard() {
    if (!this.currentOpenAlias) return;

    const container = document.querySelector(`[data-alias="${this.currentOpenAlias}"]`);
    if (!container) return;

    const { wrapper, actions, toggleBtn } = this.getCardElements(container);
    this.collapseCard(wrapper, toggleBtn, actions);
  }

  /**
   * Gets all relevant elements from a card container
   * @param {HTMLElement} container - Card container element
   * @returns {Object} Object containing wrapper, actions, toggleBtn elements
   */
  getCardElements(container) {
    const wrapper = container.querySelector('.card-swipe-wrapper');
    const actions = container.querySelector('.card-swipe-actions');
    const toggleBtn = container.querySelector('.card-toggle-btn');
    return { wrapper, actions, toggleBtn };
  }

  // ============================================
  // Event Handling
  // ============================================

  /**
   * Cleans up all registered event listeners
   */
  cleanupEventListeners() {
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];
  }

  /**
   * Registers an event listener and stores it for cleanup
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  registerEventListener(element, event, handler) {
    element.addEventListener(event, handler);
    this.eventListeners.push({ element, event, handler });
  }

  /**
   * Creates a drag state object for tracking swipe gestures
   * @returns {Object} Drag state object
   */
  createDragState() {
    return {
      startX: 0,
      currentX: 0,
      isDragging: false,
      hasDragged: false,
    };
  }

  /**
   * Handles drag move logic (shared between touch and mouse)
   * @param {Object} params - Parameters object
   * @param {Object} params.state - Drag state
   * @param {number} params.clientX - Current X position
   * @param {HTMLElement} params.wrapper - Card wrapper
   * @param {HTMLElement} params.toggleBtn - Toggle button
   * @param {HTMLElement} params.actions - Actions container
   * @param {boolean} params.isTouch - Whether this is a touch event
   */
  handleDragMove({ state, clientX, wrapper, toggleBtn, actions, isTouch }) {
    if (!state.isDragging) return;

    state.currentX = clientX;
    const diff = state.startX - state.currentX;

    if (diff <= 0) return;

    state.hasDragged = true;
    this.setTransitionEnabled(wrapper, toggleBtn, false);

    const distance = Math.min(diff, CONFIG.DRAG_MAX_DISTANCE);
    this.setDragPosition(wrapper, toggleBtn, distance);

    const arrowThreshold = isTouch
      ? CONFIG.DRAG_ARROW_THRESHOLD_TOUCH
      : CONFIG.DRAG_ARROW_THRESHOLD_MOUSE;

    // 根据拖动距离切换箭头状态
    if (diff > arrowThreshold) {
      toggleBtn.classList.replace('toggle-btn-collapsed', 'toggle-btn-expanded');
    } else {
      toggleBtn.classList.replace('toggle-btn-expanded', 'toggle-btn-collapsed');
    }

    const actionsThreshold = isTouch
      ? CONFIG.DRAG_ACTIONS_VISIBLE_THRESHOLD_TOUCH
      : CONFIG.DRAG_ACTIONS_VISIBLE_THRESHOLD_MOUSE;
    if (diff > actionsThreshold) {
      actions.classList.add('visible');
    }
  }

  /**
   * Handles drag end logic (shared between touch and mouse)
   * @param {Object} params - Parameters object
   * @param {Object} params.state - Drag state
   * @param {HTMLElement} params.wrapper - Card wrapper
   * @param {HTMLElement} params.toggleBtn - Toggle button
   * @param {HTMLElement} params.actions - Actions container
   * @param {string} params.alias - Directory alias
   * @param {boolean} params.isTouch - Whether this is a touch event
   */
  handleDragEnd({ state, wrapper, toggleBtn, actions, alias, isTouch }) {
    if (!state.isDragging) return;
    state.isDragging = false;

    const diff = state.startX - state.currentX;
    const expandThreshold = isTouch
      ? CONFIG.DRAG_EXPAND_THRESHOLD_TOUCH
      : CONFIG.DRAG_EXPAND_THRESHOLD_MOUSE;

    this.setTransitionEnabled(wrapper, toggleBtn, true);
    this.clearInlineTransform(wrapper, toggleBtn);

    if (diff > expandThreshold) {
      this.expandCard(wrapper, toggleBtn, actions, alias);
    } else {
      this.collapseCard(wrapper, toggleBtn, actions);
    }
  }

  /**
   * Initializes swipe handlers for all card containers
   */
  initSwipeHandlers() {
    const containers = document.querySelectorAll('.card-swipe-container');

    containers.forEach((container) => {
      const { wrapper, actions, toggleBtn } = this.getCardElements(container);
      const alias = container.dataset.alias;
      const state = this.createDragState();

      this.initTouchHandlers(wrapper, toggleBtn, actions, alias, state);
      this.initMouseHandlers(wrapper, toggleBtn, actions, alias, state);
      this.initActionButtons(actions, wrapper, toggleBtn, alias);
      this.initCardClickHandler(wrapper, toggleBtn, actions, alias, state);
    });
  }

  /**
   * Initializes touch event handlers for a card
   */
  initTouchHandlers(wrapper, toggleBtn, actions, alias, state) {
    wrapper.addEventListener('touchstart', (e) => {
      state.startX = e.touches[0].clientX;
      state.isDragging = true;
      state.hasDragged = false;
      this.setTransitionEnabled(wrapper, toggleBtn, false);
    });

    wrapper.addEventListener('touchmove', (e) => {
      this.handleDragMove({
        state,
        clientX: e.touches[0].clientX,
        wrapper,
        toggleBtn,
        actions,
        isTouch: true,
      });
    });

    wrapper.addEventListener('touchend', () => {
      this.handleDragEnd({
        state,
        wrapper,
        toggleBtn,
        actions,
        alias,
        isTouch: true,
      });
    });
  }

  /**
   * Initializes mouse event handlers for a card
   */
  initMouseHandlers(wrapper, toggleBtn, actions, alias, state) {
    wrapper.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      state.startX = e.clientX;
      state.isDragging = true;
      state.hasDragged = false;
      this.setTransitionEnabled(wrapper, toggleBtn, false);
      e.preventDefault();
    });

    const mouseMoveHandler = (e) => {
      this.handleDragMove({
        state,
        clientX: e.clientX,
        wrapper,
        toggleBtn,
        actions,
        isTouch: false,
      });
    };

    const mouseUpHandler = () => {
      this.handleDragEnd({
        state,
        wrapper,
        toggleBtn,
        actions,
        alias,
        isTouch: false,
      });
    };

    this.registerEventListener(document, 'mousemove', mouseMoveHandler);
    this.registerEventListener(document, 'mouseup', mouseUpHandler);
  }

  /**
   * Initializes action button event handlers
   */
  initActionButtons(actions, wrapper, toggleBtn, alias) {
    const handleAction = async (btn, e) => {
      e.preventDefault();
      e.stopPropagation();

      const action = btn.dataset.action;
      await this.executeAction(action, alias);

      this.clearInlineTransform(wrapper, toggleBtn);
      this.collapseCard(wrapper, toggleBtn, actions);
    };

    actions.querySelectorAll('.swipe-action-btn').forEach((btn) => {
      btn.addEventListener('touchend', (e) => handleAction(btn, e));
      btn.addEventListener('click', (e) => handleAction(btn, e));
    });
  }

  /**
   * Executes an action based on action type
   * @param {string} action - Action type
   * @param {string} alias - Directory alias
   */
  async executeAction(action, alias) {
    switch (action) {
      case 'edit':
        await this.edit(alias);
        break;
      case 'delete':
        await this.delete(alias);
        break;
      case 'start-preview':
        await this.startPreview(alias);
        break;
      case 'stop-preview':
        await this.stopPreview(alias);
        break;
    }
  }

  /**
   * Initializes click handler for collapsing card
   */
  initCardClickHandler(wrapper, toggleBtn, actions, alias, state) {
    wrapper.addEventListener('click', (e) => {
      if (state.hasDragged) {
        state.hasDragged = false;
        return;
      }

      if (e.target.closest('.card-toggle-btn') || e.target.closest('.swipe-action-btn')) {
        return;
      }

      if (this.currentOpenAlias === alias) {
        this.clearInlineTransform(wrapper, toggleBtn);
        this.collapseCard(wrapper, toggleBtn, actions);
      }
    });
  }

  /**
   * Initializes toggle button click handlers
   */
  initToggleButtons() {
    const toggleButtons = document.querySelectorAll('.card-toggle-btn');

    toggleButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

        const alias = btn.dataset.alias;
        const container = btn.closest('.card-swipe-container');
        const { wrapper, actions, toggleBtn } = this.getCardElements(container);

        if (this.currentOpenAlias === alias) {
          this.collapseCard(wrapper, toggleBtn, actions);
        } else {
          this.expandCard(wrapper, toggleBtn, actions, alias);
        }
      });
    });

    const outsideClickHandler = (e) => {
      if (!e.target.closest('.card-swipe-container')) {
        this.closeOpenCard();
      }
    };
    this.registerEventListener(document, 'click', outsideClickHandler);
  }

  /**
   * Collapses a card
   */
  collapseCard(wrapper, toggleBtn, actions) {
    this.setTransitionEnabled(wrapper, toggleBtn, true);
    this.clearInlineTransform(wrapper, toggleBtn);
    this.setCardExpanded(wrapper, toggleBtn, false);
    actions.classList.remove('visible');
    this.currentOpenAlias = null;
    this.toggleFabButton(true);
  }

  /**
   * Expands a card
   */
  expandCard(wrapper, toggleBtn, actions, alias) {
    this.closeOpenCard();
    this.setTransitionEnabled(wrapper, toggleBtn, true);
    this.clearInlineTransform(wrapper, toggleBtn);
    this.setCardExpanded(wrapper, toggleBtn, true);
    actions.classList.add('visible');
    this.currentOpenAlias = alias;
    this.toggleFabButton(false);
  }

  // ============================================
  // API Actions
  // ============================================

  /**
   * Sets a directory as default
   * @param {string} alias - Directory alias
   */
  async setDefault(alias) {
    const confirmed = await showConfirm(
      '设为默认目录',
      `确定将 "${alias}" 设为默认工作目录吗？`,
      { icon: '⭐', confirmText: '确定', danger: false }
    );

    if (!confirmed) return;

    try {
      await this.api.setDefaultDirectory(alias);
      await this.render();
      this.showToast('✅ 已设为默认目录', 'success');
    } catch (error) {
      this.showToast(`❌ 设置失败: ${error.message}`, 'error');
    }
  }

  /**
   * Deletes a directory
   * @param {string} alias - Directory alias
   */
  async delete(alias) {
    const confirmed = await showConfirm(
      '删除工作目录',
      `确定要删除工作目录 "${alias}" 吗？\n\n此操作不会删除实际文件，仅移除配置记录。`,
      { icon: '🗑️', confirmText: '删除', cancelText: '取消' }
    );

    if (!confirmed) return;

    try {
      await this.api.deleteDirectory(alias);
      await this.render();
      this.showToast('✅ 已删除工作目录', 'success');
    } catch (error) {
      this.showToast(`❌ 删除失败: ${error.message}`, 'error');
    }
  }

  /**
   * Opens edit modal for a directory
   * @param {string} alias - Directory alias
   */
  async edit(alias) {
    try {
      const { data: dir } = await this.api.getDirectory(alias);
      this.showEditModal(dir);
    } catch (error) {
      this.showToast(`❌ 加载失败: ${error.message}`, 'error');
    }
  }

  /**
   * Starts preview for a directory
   * @param {string} alias - Directory alias
   */
  async startPreview(alias) {
    try {
      this.showToast('🚀 正在启动预览...', 'info');
      await this.api.startPreview(alias);
      await this.render();
      this.showToast('✅ 预览启动成功', 'success');
    } catch (error) {
      this.showToast(`❌ 启动失败: ${error.message}`, 'error');
    }
  }

  /**
   * Stops preview for a directory
   * @param {string} alias - Directory alias
   */
  async stopPreview(alias) {
    const confirmed = await showConfirm('停止预览', `确定要停止 "${alias}" 的预览服务吗？`, {
      icon: '🛑',
      confirmText: '停止',
      cancelText: '取消',
    });

    if (!confirmed) return;

    try {
      await this.api.stopPreview(alias);
      await this.render();
      this.showToast('✅ 预览已停止', 'success');
    } catch (error) {
      this.showToast(`❌ 停止失败: ${error.message}`, 'error');
    }
  }

  // ============================================
  // Modal Methods
  // ============================================

  /**
   * Shows add directory modal
   */
  showAddModal() {
    this.showModal({
      title: '➕ 添加工作目录',
      data: {
        alias: '',
        path: '',
        description: '',
        previewEnabled: false,
        startCmd: '',
        previewPort: '',
        isDefault: false,
      },
      isEdit: false,
    });
  }

  /**
   * Shows edit directory modal
   * @param {Object} dir - Directory data
   */
  showEditModal(dir) {
    this.showModal({
      title: '✏️ 编辑工作目录',
      data: {
        alias: dir.alias,
        path: dir.path,
        description: dir.description || '',
        previewEnabled: dir.preview_enabled === 1,
        startCmd: dir.start_cmd || '',
        previewPort: dir.preview_port || '',
        isDefault: dir.is_default === 1,
      },
      isEdit: true,
    });
  }

  /**
   * Shows modal for add/edit directory
   * @param {Object} options - Modal options
   * @param {string} options.title - Modal title
   * @param {Object} options.data - Form data
   * @param {boolean} options.isEdit - Whether this is edit mode
   */
  showModal({ title, data, isEdit }) {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = this.renderModalContent(title, data, isEdit);

    this.initModalEventHandlers(modal, data, isEdit);
    document.getElementById('modal-container').appendChild(modal);
  }

  /**
   * Renders modal content HTML
   * @param {string} title - Modal title
   * @param {Object} data - Form data
   * @param {boolean} isEdit - Whether this is edit mode
   * @returns {string} HTML string
   */
  renderModalContent(title, data, isEdit) {
    const readonlyAttr = isEdit ? 'readonly' : '';
    const readonlyClass = isEdit ? 'input-readonly' : '';

    return `
      <div class="modal-content">
        <h2 class="modal-title">${title}</h2>
        <form id="dir-form">
          <div class="form-group">
            <label>别名 *</label>
            <input type="text" name="alias" value="${this.escapeHtml(data.alias)}"
              ${readonlyAttr} required class="${readonlyClass}" placeholder="例如: my-project">
          </div>

          <div class="form-group">
            <label>路径 (相对于根目录) *</label>
            <input type="text" name="path" value="${this.escapeHtml(data.path)}"
              ${readonlyAttr} required class="${readonlyClass}" placeholder="例如: project-folder">
          </div>

          <div class="form-group">
            <label>描述</label>
            <textarea name="description" rows="2" placeholder="描述这个项目">${this.escapeHtml(data.description)}</textarea>
          </div>

          <div class="form-group preview-section">
            <div class="checkbox-group">
              <input type="checkbox" name="previewEnabled" id="preview-enabled" ${data.previewEnabled ? 'checked' : ''}>
              <label for="preview-enabled" class="checkbox-label">启用预览功能</label>
            </div>

            <div id="preview-config" style="display: ${data.previewEnabled ? 'block' : 'none'};">
              <div class="form-group">
                <label>启动命令</label>
                <input type="text" name="startCmd" value="${this.escapeHtml(data.startCmd)}" placeholder="例如: npm run dev">
              </div>

              <div>
                <label>预览端口</label>
                <input type="number" name="previewPort" value="${data.previewPort}" placeholder="例如: 3000">
              </div>
            </div>
          </div>

          ${this.renderDefaultCheckbox(isEdit, data.isDefault)}

          <div class="form-actions">
            <button type="button" class="btn btn-secondary btn-cancel" onclick="document.querySelector('.modal').remove()">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              ${isEdit ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Renders default checkbox for add mode
   * @param {boolean} isEdit - Whether this is edit mode
   * @param {boolean} isDefault - Current default value
   * @returns {string} HTML string
   */
  renderDefaultCheckbox(isEdit, isDefault) {
    if (isEdit) return '';
    return `
      <div class="form-group-last">
        <div class="checkbox-group">
          <input type="checkbox" name="isDefault" id="is-default" ${isDefault ? 'checked' : ''}>
          <label for="is-default" class="checkbox-label">设为默认目录</label>
        </div>
      </div>
    `;
  }

  /**
   * Initializes modal event handlers
   * @param {HTMLElement} modal - Modal element
   * @param {Object} data - Original form data
   * @param {boolean} isEdit - Whether this is edit mode
   */
  initModalEventHandlers(modal, data, isEdit) {
    const previewCheckbox = modal.querySelector('#preview-enabled');
    const previewConfig = modal.querySelector('#preview-config');

    previewCheckbox.addEventListener('change', () => {
      previewConfig.style.display = previewCheckbox.checked ? 'block' : 'none';
    });

    const form = modal.querySelector('#dir-form');
    form.addEventListener('submit', (e) => this.handleFormSubmit(e, modal, data.alias, isEdit));
  }

  /**
   * Handles form submission
   * @param {Event} e - Submit event
   * @param {HTMLElement} modal - Modal element
   * @param {string} originalAlias - Original alias (for edit mode)
   * @param {boolean} isEdit - Whether this is edit mode
   */
  async handleFormSubmit(e, modal, originalAlias, isEdit) {
    e.preventDefault();
    const formData = new FormData(e.target);

    const payload = {
      alias: formData.get('alias'),
      path: formData.get('path'),
      description: formData.get('description') || undefined,
      previewEnabled: formData.get('previewEnabled') === 'on',
      startCmd: formData.get('startCmd') || undefined,
      previewPort: formData.get('previewPort') ? parseInt(formData.get('previewPort'), 10) : undefined,
      isDefault: formData.get('isDefault') === 'on',
    };

    try {
      if (isEdit) {
        await this.api.updateDirectory(originalAlias, {
          description: payload.description,
          previewEnabled: payload.previewEnabled,
          startCmd: payload.startCmd,
          previewPort: payload.previewPort,
        });
        this.showToast('✅ 更新成功', 'success');
      } else {
        await this.api.createDirectory(payload);
        this.showToast('✅ 添加成功', 'success');
      }
      modal.remove();
      await this.render();
    } catch (error) {
      const action = isEdit ? '更新' : '添加';
      this.showToast(`❌ ${action}失败: ${error.message}`, 'error');
    }
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Escapes HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Shows a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Toast type (info, success, error)
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), CONFIG.TOAST_FADE_DURATION_MS);
    }, CONFIG.TOAST_DURATION_MS);
  }
}
