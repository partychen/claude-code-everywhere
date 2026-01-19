class SystemInfo {
  constructor(api) {
    this.api = api;
  }

  async render() {
    const container = document.getElementById('system-info');
    container.innerHTML = '<div class="card"><div class="loading"></div><p style="margin-top: 1rem; text-align: center; color: #4a5568;">加载中...</p></div>';

    try {
      const { data: info } = await this.api.getSystemInfo();
      const health = await this.api.getHealth();

      // 获取当前用户名
      const username = localStorage.getItem('username') || 'Admin';

      container.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(102, 126, 234, 0.05));">
          <!-- 用户信息和退出 -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 2px solid rgba(102, 126, 234, 0.1);">
            <div style="display: flex; align-items: center; gap: 1rem;">
              <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.75rem; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                👤
              </div>
              <div>
                <p style="margin: 0; font-size: 0.75rem; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">当前用户</p>
                <p style="margin: 0.25rem 0 0 0; font-size: 1.35rem; font-weight: 700; color: #2d3748;">
                  ${this.escapeHtml(username)}
                </p>
              </div>
            </div>
            <button id="logout-btn-system" class="btn btn-danger" style="padding: 0.65rem 1.25rem; font-size: 0.9rem; white-space: nowrap;">
              退出登录
            </button>
          </div>

          <div style="display: grid; gap: 1.5rem;">

            <!-- 健康状态 -->
            <div style="padding: 1.5rem; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 0.75rem; color: white;">
              <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="width: 48px; height: 48px; background: rgba(255, 255, 255, 0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">
                  ✓
                </div>
                <div>
                  <p style="margin: 0; font-size: 0.85rem; opacity: 0.9;">系统状态</p>
                  <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 700; text-transform: uppercase;">
                    ${health.status}
                  </p>
                </div>
              </div>
            </div>

            <!-- 允许的根目录 -->
            <div style="padding: 1.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 0.75rem; border-left: 4px solid #667eea;">
              <p style="margin: 0 0 0.75rem 0; color: #4a5568; font-size: 0.85rem; font-weight: 600;">
                🔒 安全配置
              </p>
              <p style="margin: 0; color: #4a5568; font-size: 0.9rem;">
                允许的根目录
              </p>
              <p style="margin: 0.5rem 0 0 0; color: #2d3748; font-family: 'Monaco', monospace; font-size: 0.95rem; font-weight: 600; word-break: break-all;">
                ${this.escapeHtml(info.allowedRootDir)}
              </p>
              <p style="margin: 1rem 0 0 0; color: #4a5568; font-size: 0.85rem; padding: 0.75rem; background: rgba(255, 255, 255, 0.5); border-radius: 0.5rem;">
                💡 所有工作目录必须在此根目录下，这是一项重要的安全限制。
              </p>
            </div>

            <!-- 功能说明 -->
            <div style="padding: 1.5rem; background: linear-gradient(to right, rgba(102, 126, 234, 0.05), rgba(118, 75, 162, 0.05)); border-radius: 0.75rem;">
              <p style="margin: 0 0 1rem 0; color: #2d3748; font-size: 1rem; font-weight: 600;">
                🚀 核心功能
              </p>
              <div style="display: grid; gap: 0.75rem;">
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                  <span style="font-size: 1.25rem;">📁</span>
                  <div>
                    <p style="margin: 0; color: #2d3748; font-weight: 600; font-size: 0.9rem;">工作目录管理</p>
                    <p style="margin: 0.25rem 0 0 0; color: #4a5568; font-size: 0.85rem;">管理多个项目工作目录，支持别名快速切换</p>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                  <span style="font-size: 1.25rem;">🌐</span>
                  <div>
                    <p style="margin: 0; color: #2d3748; font-weight: 600; font-size: 0.9rem;">预览服务</p>
                    <p style="margin: 0.25rem 0 0 0; color: #4a5568; font-size: 0.85rem;">通过 Cloudflare Tunnel 提供公网访问预览</p>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                  <span style="font-size: 1.25rem;">💬</span>
                  <div>
                    <p style="margin: 0; color: #2d3748; font-weight: 600; font-size: 0.9rem;">钉钉集成</p>
                    <p style="margin: 0.25rem 0 0 0; color: #4a5568; font-size: 0.85rem;">通过钉钉机器人远程触发 Claude Code 任务</p>
                  </div>
                </div>
                <div style="display: flex; align-items: start; gap: 0.75rem;">
                  <span style="font-size: 1.25rem;">🤖</span>
                  <div>
                    <p style="margin: 0; color: #2d3748; font-weight: 600; font-size: 0.9rem;">Claude Agent SDK</p>
                    <p style="margin: 0.25rem 0 0 0; color: #4a5568; font-size: 0.85rem;">基于 Claude Agent SDK 实现智能代码操作</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 版权信息 -->
          <div style="margin-top: 2.5rem; padding-top: 1.5rem; border-top: 2px solid rgba(102, 126, 234, 0.1); text-align: center;">
            <p style="margin: 0; color: #a0aec0; font-size: 0.8rem; line-height: 1.6;">
              Claude Code Everywhere v${info.version}
            </p>
            <p style="margin: 0.5rem 0 0 0; color: #cbd5e0; font-size: 0.75rem;">
              © ${new Date().getFullYear()} All Rights Reserved
            </p>
          </div>
        </div>
      `;

      // 绑定退出登录按钮事件
      const logoutBtn = document.getElementById('logout-btn-system');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('username');
            window.location.href = '/login.html';
          }
        };
      }
    } catch (error) {
      container.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
          <h3 style="margin: 0 0 0.5rem 0;">❌ 加载失败</h3>
          <p style="margin: 0;">${this.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
