class ClaudeCodeEverywhereAPI {
  constructor(baseURL, authToken) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  async request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${this.baseURL}${path}`, options);

    // 处理 401 未授权
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      window.location.href = '/login.html';
      throw new Error('未授权，请重新登录');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '请求失败');
    }

    return data;
  }

  // 工作目录 API
  async getDirectories() {
    return this.request('GET', '/directories');
  }

  async getDirectory(alias) {
    return this.request('GET', `/directories/${alias}`);
  }

  async createDirectory(data) {
    return this.request('POST', '/directories', data);
  }

  async updateDirectory(alias, data) {
    return this.request('PUT', `/directories/${alias}`, data);
  }

  async deleteDirectory(alias) {
    return this.request('DELETE', `/directories/${alias}`);
  }

  async setDefaultDirectory(alias) {
    return this.request('PUT', `/directories/${alias}/default`);
  }

  // 预览服务 API
  async getPreviews() {
    return this.request('GET', '/previews');
  }

  async getPreview(alias) {
    return this.request('GET', `/previews/${alias}`);
  }

  async startPreview(alias) {
    return this.request('POST', `/previews/${alias}/start`);
  }

  async stopPreview(alias) {
    return this.request('POST', `/previews/${alias}/stop`);
  }

  async stopAllPreviews() {
    return this.request('POST', '/previews/stop-all');
  }

  // 系统信息 API
  async getSystemInfo() {
    return this.request('GET', '/system/info');
  }

  async getHealth() {
    return this.request('GET', '/system/health');
  }
}

// 全局 API 实例
const api = new ClaudeCodeEverywhereAPI('/api', localStorage.getItem('authToken'));
