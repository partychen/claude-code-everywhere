/**
 * Configuration constants for SystemInfo component
 */
const SYSTEM_INFO_CONFIG = {
  /** Default username if not found in localStorage */
  DEFAULT_USERNAME: 'Admin',
  /** localStorage keys */
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
    USERNAME: 'username',
  },
  /** Redirect URL after logout */
  LOGOUT_REDIRECT: '/login.html',
};

/**
 * Feature item definition for core features section
 * @typedef {Object} FeatureItem
 * @property {string} icon - Emoji icon for the feature
 * @property {string} title - Feature title
 * @property {string} description - Feature description
 */

/**
 * Core features displayed in SystemInfo
 * @type {FeatureItem[]}
 */
const CORE_FEATURES = [
  {
    icon: '📁',
    title: '工作目录管理',
    description: '管理多个项目工作目录，支持别名快速切换',
  },
  {
    icon: '🌐',
    title: '预览服务',
    description: '通过 Cloudflare Tunnel 提供公网访问预览',
  },
  {
    icon: '💬',
    title: '钉钉集成',
    description: '通过钉钉机器人远程触发 Claude Code 任务',
  },
  {
    icon: '🤖',
    title: 'Claude Agent SDK',
    description: '基于 Claude Agent SDK 实现智能代码操作',
  },
];

/**
 * SystemInfo component for displaying system information and user profile.
 * Shows health status, security config, and core features.
 */
class SystemInfo {
  /**
   * Creates a new SystemInfo instance
   * @param {ClaudeCodeEverywhereAPI} api - API client instance for backend communication
   */
  constructor(api) {
    this.api = api;
  }

  // ============================================
  // Rendering Methods
  // ============================================

  /**
   * Renders the system info panel by fetching data from API
   * @returns {Promise<void>}
   */
  async render() {
    const container = document.getElementById('system-info');
    container.innerHTML = this.renderLoadingState();

    try {
      const { data: info } = await this.api.getSystemInfo();
      const health = await this.api.getHealth();
      const username =
        localStorage.getItem(SYSTEM_INFO_CONFIG.STORAGE_KEYS.USERNAME) ||
        SYSTEM_INFO_CONFIG.DEFAULT_USERNAME;

      container.innerHTML = this.renderContent(info, health, username);
      this.bindLogoutHandler();
    } catch (error) {
      container.innerHTML = this.renderErrorState(error.message);
    }
  }

  /**
   * Renders loading state HTML
   * @returns {string} HTML string
   */
  renderLoadingState() {
    return `
      <div class="card">
        <div class="loading"></div>
        <p class="system-loading-text">加载中...</p>
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
   * Renders the main content
   * @param {Object} info - System info data
   * @param {Object} health - Health check data
   * @param {string} username - Current username
   * @returns {string} HTML string
   */
  renderContent(info, health, username) {
    return `
      <div class="card system-info-card">
        ${this.renderUserSection(username)}
        <div class="system-info-grid">
          ${this.renderHealthStatus(health)}
          ${this.renderSecurityConfig(info)}
          ${this.renderCoreFeatures()}
        </div>
        ${this.renderFooter(info)}
      </div>
    `;
  }

  /**
   * Renders the user section with avatar and logout button
   * @param {string} username - Current username
   * @returns {string} HTML string
   */
  renderUserSection(username) {
    return `
      <div class="system-user-section">
        <div class="system-user-info">
          <div class="system-user-avatar">👤</div>
          <div class="system-user-details">
            <p class="system-user-label">当前用户</p>
            <p class="system-user-name">${this.escapeHtml(username)}</p>
          </div>
        </div>
        <button id="logout-btn-system" class="btn btn-danger btn-logout">
          退出登录
        </button>
      </div>
    `;
  }

  /**
   * Renders the health status card
   * @param {Object} health - Health check data
   * @returns {string} HTML string
   */
  renderHealthStatus(health) {
    return `
      <div class="system-health-card">
        <div class="system-health-content">
          <div class="system-health-icon">✓</div>
          <div class="system-health-details">
            <p class="system-health-label">系统状态</p>
            <p class="system-health-status">${health.status}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the security configuration section
   * @param {Object} info - System info containing allowedRootDir
   * @returns {string} HTML string
   */
  renderSecurityConfig(info) {
    return `
      <div class="system-security-card">
        <p class="system-section-title">🔒 安全配置</p>
        <p class="system-security-label">允许的根目录</p>
        <p class="system-security-path">${this.escapeHtml(info.allowedRootDir)}</p>
        <p class="system-security-note">
          💡 所有工作目录必须在此根目录下，这是一项重要的安全限制。
        </p>
      </div>
    `;
  }

  /**
   * Renders the core features section
   * @returns {string} HTML string
   */
  renderCoreFeatures() {
    const featureItems = CORE_FEATURES.map((feature) =>
      this.renderFeatureItem(feature)
    ).join('');

    return `
      <div class="system-features-card">
        <p class="system-section-title">🚀 核心功能</p>
        <div class="system-features-grid">${featureItems}</div>
      </div>
    `;
  }

  /**
   * Renders a single feature item
   * @param {FeatureItem} feature - Feature data
   * @returns {string} HTML string
   */
  renderFeatureItem(feature) {
    return `
      <div class="system-feature-item">
        <span class="system-feature-icon">${feature.icon}</span>
        <div class="system-feature-content">
          <p class="system-feature-title">${feature.title}</p>
          <p class="system-feature-description">${feature.description}</p>
        </div>
      </div>
    `;
  }

  /**
   * Renders the footer with version and copyright
   * @param {Object} info - System info containing version
   * @returns {string} HTML string
   */
  renderFooter(info) {
    const currentYear = new Date().getFullYear();

    return `
      <div class="system-footer">
        <p class="system-version">Claude Code Everywhere v${info.version}</p>
        <p class="system-copyright">© ${currentYear} All Rights Reserved</p>
      </div>
    `;
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Binds the logout button click handler
   */
  bindLogoutHandler() {
    const logoutBtn = document.getElementById('logout-btn-system');
    if (!logoutBtn) return;

    logoutBtn.onclick = async () => {
      const confirmed = await showConfirm(
        '退出登录',
        '确定要退出登录吗？',
        { icon: '👋', confirmText: '退出', cancelText: '取消', danger: false }
      );

      if (!confirmed) return;

      localStorage.removeItem(SYSTEM_INFO_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(SYSTEM_INFO_CONFIG.STORAGE_KEYS.USERNAME);
      window.location.href = SYSTEM_INFO_CONFIG.LOGOUT_REDIRECT;
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

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
}
