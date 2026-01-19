/**
 * Configuration constants for PreviewList component
 */
const PREVIEW_CONFIG = {
  /** Toast display duration in milliseconds */
  TOAST_DURATION_MS: 3000,
  /** Toast fade out animation duration in milliseconds */
  TOAST_FADE_DURATION_MS: 300,
  /** Time unit constants for uptime calculation */
  TIME_UNITS: {
    SECONDS_PER_MINUTE: 60,
    SECONDS_PER_HOUR: 3600,
    MS_PER_SECOND: 1000,
  },
};

/**
 * PreviewList component for managing and displaying preview services.
 * Displays running Cloudflare Tunnel previews with their status and controls.
 */
class PreviewList {
  /**
   * Creates a new PreviewList instance
   * @param {ClaudeCodeEverywhereAPI} api - API client instance for backend communication
   */
  constructor(api) {
    this.api = api;
  }

  // ============================================
  // Rendering Methods
  // ============================================

  /**
   * Renders the preview list by fetching data from API
   * @returns {Promise<void>}
   */
  async render() {
    const container = document.getElementById('preview-list');
    container.innerHTML = this.renderLoadingState();

    try {
      const { data: previews } = await this.api.getPreviews();

      if (previews.length === 0) {
        container.innerHTML = this.renderEmptyState();
        return;
      }

      container.innerHTML = previews.map((p) => this.renderCard(p)).join('');
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
   * Renders empty state HTML when no previews exist
   * @returns {string} HTML string
   */
  renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🌐</div>
        <h3 class="empty-state-title">暂无运行中的预览服务</h3>
        <p class="empty-state-text">在工作目录中启用预览后，这里将显示运行中的服务</p>
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
   * Renders a preview service card
   * @param {Object} preview - Preview service data
   * @param {string} preview.alias - Directory alias
   * @param {string} preview.tunnelUrl - Cloudflare tunnel URL
   * @param {number} preview.port - Local port number
   * @param {number} preview.pid - Process ID
   * @param {number} preview.tunnelPid - Tunnel process ID
   * @param {string} preview.startedAt - ISO timestamp of start time
   * @returns {string} HTML string
   */
  renderCard(preview) {
    const startTime = new Date(preview.startedAt).toLocaleString('zh-CN');
    const uptime = this.getUptime(preview.startedAt);

    return `
      <div class="card preview-card">
        <div class="preview-card-layout">
          <div class="preview-card-content">
            ${this.renderCardHeader(preview.alias)}
            ${this.renderTunnelInfo(preview.tunnelUrl)}
            ${this.renderMetricsGrid(preview, uptime)}
            ${this.renderStartTime(startTime)}
          </div>
          <div class="card-actions">
            <button onclick="previewList.stop('${this.escapeHtml(preview.alias)}')" class="btn btn-danger btn-stop">
              🛑 停止服务
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the card header with alias and status badge
   * @param {string} alias - Directory alias
   * @returns {string} HTML string
   */
  renderCardHeader(alias) {
    return `
      <div class="preview-card-header">
        <div class="preview-status-indicator"></div>
        <h3 class="preview-card-title">${this.escapeHtml(alias)}</h3>
        <span class="badge badge-green">运行中</span>
      </div>
    `;
  }

  /**
   * Renders the tunnel URL section
   * @param {string} tunnelUrl - Cloudflare tunnel URL
   * @returns {string} HTML string
   */
  renderTunnelInfo(tunnelUrl) {
    return `
      <div class="preview-info-section">
        <div class="preview-tunnel-url">
          <p class="preview-info-label">🌐 Tunnel URL</p>
          <a href="${tunnelUrl}" target="_blank" class="preview-tunnel-link">
            ${tunnelUrl}
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Renders the metrics grid with port, PIDs, and uptime
   * @param {Object} preview - Preview data
   * @param {string} uptime - Formatted uptime string
   * @returns {string} HTML string
   */
  renderMetricsGrid(preview, uptime) {
    return `
      <div class="preview-metrics-grid">
        ${this.renderMetricItem('端口', `<code>${preview.port}</code>`)}
        ${this.renderMetricItem('进程 PID', `<code>${preview.pid}</code>`)}
        ${this.renderMetricItem('Tunnel PID', `<code>${preview.tunnelPid}</code>`)}
        ${this.renderMetricItem('运行时长', uptime)}
      </div>
    `;
  }

  /**
   * Renders a single metric item
   * @param {string} label - Metric label
   * @param {string} value - Metric value (can contain HTML)
   * @returns {string} HTML string
   */
  renderMetricItem(label, value) {
    return `
      <div class="preview-metric-item">
        <p class="preview-metric-label">${label}</p>
        <p class="preview-metric-value">${value}</p>
      </div>
    `;
  }

  /**
   * Renders the start time section
   * @param {string} startTime - Formatted start time
   * @returns {string} HTML string
   */
  renderStartTime(startTime) {
    return `
      <div class="preview-start-time">
        <p class="preview-info-label">启动时间</p>
        <p class="preview-start-time-value">${startTime}</p>
      </div>
    `;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Calculates and formats uptime from a start timestamp
   * @param {string} startedAt - ISO timestamp string
   * @returns {string} Formatted uptime string (e.g., "2小时 30分钟")
   */
  getUptime(startedAt) {
    const now = new Date();
    const start = new Date(startedAt);
    const diffSeconds = Math.floor(
      (now - start) / PREVIEW_CONFIG.TIME_UNITS.MS_PER_SECOND
    );

    const hours = Math.floor(diffSeconds / PREVIEW_CONFIG.TIME_UNITS.SECONDS_PER_HOUR);
    const minutes = Math.floor(
      (diffSeconds % PREVIEW_CONFIG.TIME_UNITS.SECONDS_PER_HOUR) /
        PREVIEW_CONFIG.TIME_UNITS.SECONDS_PER_MINUTE
    );
    const seconds = diffSeconds % PREVIEW_CONFIG.TIME_UNITS.SECONDS_PER_MINUTE;

    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    }
    if (minutes > 0) {
      return `${minutes}分钟 ${seconds}秒`;
    }
    return `${seconds}秒`;
  }

  /**
   * Escapes HTML special characters to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // API Actions
  // ============================================

  /**
   * Stops a preview service
   * @param {string} alias - Directory alias
   * @returns {Promise<void>}
   */
  async stop(alias) {
    const confirmed = await showConfirm(
      '停止预览服务',
      `确定停止 "${alias}" 的预览服务吗？`,
      { icon: '🛑', confirmText: '停止', cancelText: '取消' }
    );

    if (!confirmed) return;

    try {
      await this.api.stopPreview(alias);
      await this.render();
      this.showToast('✅ 已停止预览服务', 'success');
    } catch (error) {
      this.showToast(`❌ 停止失败: ${error.message}`, 'error');
    }
  }

  /**
   * Stops all running preview services
   * @returns {Promise<void>}
   */
  async stopAll() {
    const confirmed = await showConfirm(
      '停止所有预览',
      '确定停止所有预览服务吗？\n\n此操作将停止所有正在运行的预览。',
      { icon: '🛑', confirmText: '全部停止', cancelText: '取消' }
    );

    if (!confirmed) return;

    try {
      await this.api.stopAllPreviews();
      await this.render();
      this.showToast('✅ 已停止所有预览服务', 'success');
    } catch (error) {
      this.showToast(`❌ 停止失败: ${error.message}`, 'error');
    }
  }

  /**
   * Shows a toast notification
   * @param {string} message - Message to display
   * @param {'info' | 'success' | 'error'} type - Toast type
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), PREVIEW_CONFIG.TOAST_FADE_DURATION_MS);
    }, PREVIEW_CONFIG.TOAST_DURATION_MS);
  }
}
