/**
 * Configuration constants for API client
 */
const API_CONFIG = {
  /** HTTP status codes */
  STATUS: {
    UNAUTHORIZED: 401,
  },
  /** localStorage keys */
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
    USERNAME: 'username',
  },
  /** Redirect URLs */
  REDIRECTS: {
    LOGIN: '/login.html',
  },
  /** Default error messages */
  ERRORS: {
    UNAUTHORIZED: '未授权，请重新登录',
    REQUEST_FAILED: '请求失败',
  },
};

/**
 * API response structure
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Whether the request was successful
 * @property {*} [data] - Response data
 * @property {string} [error] - Error message if failed
 */

/**
 * Directory data structure
 * @typedef {Object} Directory
 * @property {string} alias - Directory alias
 * @property {string} path - Full directory path
 * @property {string} [description] - Directory description
 * @property {number} preview_enabled - Whether preview is enabled (0 or 1)
 * @property {string} [start_cmd] - Preview start command
 * @property {number} [preview_port] - Preview port number
 * @property {number} is_default - Whether this is the default directory (0 or 1)
 */

/**
 * Preview service data structure
 * @typedef {Object} Preview
 * @property {string} alias - Directory alias
 * @property {string} tunnelUrl - Cloudflare tunnel URL
 * @property {number} port - Local port number
 * @property {number} pid - Process ID
 * @property {number} tunnelPid - Tunnel process ID
 * @property {string} startedAt - ISO timestamp of start time
 */

/**
 * API client for Claude Code Everywhere backend.
 * Handles authentication, request formatting, and error handling.
 */
class ClaudeCodeEverywhereAPI {
  /**
   * Creates a new API client instance
   * @param {string} baseURL - Base URL for API requests (e.g., '/api')
   * @param {string|null} authToken - JWT authentication token
   */
  constructor(baseURL, authToken) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  // ============================================
  // Core Request Method
  // ============================================

  /**
   * Makes an authenticated HTTP request to the API
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} path - API path (e.g., '/directories')
   * @param {Object|null} [body=null] - Request body for POST/PUT requests
   * @returns {Promise<ApiResponse>} API response
   * @throws {Error} If request fails or returns an error
   */
  async request(method, path, body = null) {
    const headers = this.buildHeaders();
    const options = this.buildRequestOptions(method, headers, body);

    const response = await fetch(`${this.baseURL}${path}`, options);

    if (response.status === API_CONFIG.STATUS.UNAUTHORIZED) {
      this.handleUnauthorized();
      throw new Error(API_CONFIG.ERRORS.UNAUTHORIZED);
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || API_CONFIG.ERRORS.REQUEST_FAILED);
    }

    return data;
  }

  /**
   * Builds request headers with authentication
   * @returns {Object} Headers object
   */
  buildHeaders() {
    const headers = { 'Content-Type': 'application/json' };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Builds fetch request options
   * @param {string} method - HTTP method
   * @param {Object} headers - Request headers
   * @param {Object|null} body - Request body
   * @returns {Object} Fetch options object
   */
  buildRequestOptions(method, headers, body) {
    const options = { method, headers };

    if (body) {
      options.body = JSON.stringify(body);
    }

    return options;
  }

  /**
   * Handles unauthorized response by clearing auth and redirecting
   */
  handleUnauthorized() {
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(API_CONFIG.STORAGE_KEYS.USERNAME);
    window.location.href = API_CONFIG.REDIRECTS.LOGIN;
  }

  // ============================================
  // Directory API Methods
  // ============================================

  /**
   * Gets all working directories
   * @returns {Promise<ApiResponse>} Response with directories array
   */
  async getDirectories() {
    return this.request('GET', '/directories');
  }

  /**
   * Gets a single directory by alias
   * @param {string} alias - Directory alias
   * @returns {Promise<ApiResponse>} Response with directory data
   */
  async getDirectory(alias) {
    return this.request('GET', `/directories/${encodeURIComponent(alias)}`);
  }

  /**
   * Creates a new directory
   * @param {Object} data - Directory creation data
   * @param {string} data.alias - Directory alias
   * @param {string} data.path - Directory path (relative to root)
   * @param {string} [data.description] - Directory description
   * @param {boolean} [data.previewEnabled] - Enable preview
   * @param {string} [data.startCmd] - Preview start command
   * @param {number} [data.previewPort] - Preview port
   * @param {boolean} [data.isDefault] - Set as default
   * @returns {Promise<ApiResponse>} Response with created directory
   */
  async createDirectory(data) {
    return this.request('POST', '/directories', data);
  }

  /**
   * Updates an existing directory
   * @param {string} alias - Directory alias
   * @param {Object} data - Update data
   * @param {string} [data.description] - New description
   * @param {boolean} [data.previewEnabled] - Enable/disable preview
   * @param {string} [data.startCmd] - New start command
   * @param {number} [data.previewPort] - New preview port
   * @returns {Promise<ApiResponse>} Response with updated directory
   */
  async updateDirectory(alias, data) {
    return this.request('PUT', `/directories/${encodeURIComponent(alias)}`, data);
  }

  /**
   * Deletes a directory configuration
   * @param {string} alias - Directory alias
   * @returns {Promise<ApiResponse>} Response confirming deletion
   */
  async deleteDirectory(alias) {
    return this.request('DELETE', `/directories/${encodeURIComponent(alias)}`);
  }

  /**
   * Sets a directory as the default
   * @param {string} alias - Directory alias
   * @returns {Promise<ApiResponse>} Response confirming default set
   */
  async setDefaultDirectory(alias) {
    return this.request('PUT', `/directories/${encodeURIComponent(alias)}/default`);
  }

  // ============================================
  // Preview Service API Methods
  // ============================================

  /**
   * Gets all running preview services
   * @returns {Promise<ApiResponse>} Response with previews array
   */
  async getPreviews() {
    return this.request('GET', '/previews');
  }

  /**
   * Gets a single preview service by alias
   * @param {string} alias - Directory alias
   * @returns {Promise<ApiResponse>} Response with preview data
   */
  async getPreview(alias) {
    return this.request('GET', `/previews/${encodeURIComponent(alias)}`);
  }

  /**
   * Starts a preview service for a directory
   * @param {string} alias - Directory alias
   * @returns {Promise<ApiResponse>} Response with preview data
   */
  async startPreview(alias) {
    return this.request('POST', `/previews/${encodeURIComponent(alias)}/start`);
  }

  /**
   * Stops a preview service
   * @param {string} alias - Directory alias
   * @returns {Promise<ApiResponse>} Response confirming stop
   */
  async stopPreview(alias) {
    return this.request('POST', `/previews/${encodeURIComponent(alias)}/stop`);
  }

  /**
   * Stops all running preview services
   * @returns {Promise<ApiResponse>} Response confirming all stopped
   */
  async stopAllPreviews() {
    return this.request('POST', '/previews/stop-all');
  }

  // ============================================
  // System API Methods
  // ============================================

  /**
   * Gets system information
   * @returns {Promise<ApiResponse>} Response with system info
   */
  async getSystemInfo() {
    return this.request('GET', '/system/info');
  }

  /**
   * Gets health check status
   * @returns {Promise<Object>} Health status object
   */
  async getHealth() {
    return this.request('GET', '/system/health');
  }
}

/**
 * Global API client instance
 * @type {ClaudeCodeEverywhereAPI}
 */
const api = new ClaudeCodeEverywhereAPI(
  '/api',
  localStorage.getItem(API_CONFIG.STORAGE_KEYS.AUTH_TOKEN)
);
