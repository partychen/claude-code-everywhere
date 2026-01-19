class PreviewList {
  constructor(api) {
    this.api = api;
  }

  async render() {
    const container = document.getElementById('preview-list');
    container.innerHTML = '<div class="empty-state"><div class="loading"></div><p>加载中...</p></div>';

    try {
      const { data: previews } = await this.api.getPreviews();

      if (previews.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div style="font-size: 4rem;">🌐</div>
            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem;">暂无运行中的预览服务</h3>
            <p>在工作目录中启用预览后，这里将显示运行中的服务</p>
          </div>
        `;
        return;
      }

      container.innerHTML = previews.map(p => this.renderCard(p)).join('');
    } catch (error) {
      container.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
          <h3 style="margin: 0 0 0.5rem 0;">❌ 加载失败</h3>
          <p style="margin: 0;">${this.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  renderCard(preview) {
    const startTime = new Date(preview.startedAt).toLocaleString('zh-CN');
    const uptime = this.getUptime(preview.startedAt);

    return `
      <div class="card" style="background: linear-gradient(to right, rgba(255, 255, 255, 0.95), rgba(102, 126, 234, 0.05));">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 200px;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <div style="width: 12px; height: 12px; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); border-radius: 50%; box-shadow: 0 0 10px rgba(56, 239, 125, 0.5); animation: pulse 2s infinite;"></div>
              <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0; color: #2d3748;">
                ${this.escapeHtml(preview.alias)}
              </h3>
              <span class="badge badge-green">运行中</span>
            </div>

            <div style="background: rgba(102, 126, 234, 0.05); padding: 1rem; border-radius: 0.75rem; border-left: 4px solid #667eea;">
              <div style="margin-bottom: 0.75rem;">
                <p style="margin: 0; color: #4a5568; font-size: 0.85rem; font-weight: 600;">🌐 Tunnel URL</p>
                <a href="${preview.tunnelUrl}" target="_blank" style="display: inline-block; margin-top: 0.25rem; font-size: 0.95rem; word-break: break-all;">
                  ${preview.tunnelUrl}
                </a>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-top: 1rem;">
                <div>
                  <p style="margin: 0; color: #718096; font-size: 0.8rem;">端口</p>
                  <p style="margin: 0.25rem 0 0 0; color: #2d3748; font-weight: 600; font-size: 0.95rem;">
                    <code>${preview.port}</code>
                  </p>
                </div>
                <div>
                  <p style="margin: 0; color: #718096; font-size: 0.8rem;">进程 PID</p>
                  <p style="margin: 0.25rem 0 0 0; color: #2d3748; font-weight: 600; font-size: 0.95rem;">
                    <code>${preview.pid}</code>
                  </p>
                </div>
                <div>
                  <p style="margin: 0; color: #718096; font-size: 0.8rem;">Tunnel PID</p>
                  <p style="margin: 0.25rem 0 0 0; color: #2d3748; font-weight: 600; font-size: 0.95rem;">
                    <code>${preview.tunnelPid}</code>
                  </p>
                </div>
                <div>
                  <p style="margin: 0; color: #718096; font-size: 0.8rem;">运行时长</p>
                  <p style="margin: 0.25rem 0 0 0; color: #2d3748; font-weight: 600; font-size: 0.95rem;">
                    ${uptime}
                  </p>
                </div>
              </div>

              <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(102, 126, 234, 0.1);">
                <p style="margin: 0; color: #718096; font-size: 0.8rem;">启动时间</p>
                <p style="margin: 0.25rem 0 0 0; color: #4a5568; font-size: 0.9rem;">
                  ${startTime}
                </p>
              </div>
            </div>
          </div>

          <div class="card-actions">
            <button onclick="previewList.stop('${this.escapeHtml(preview.alias)}')" class="btn btn-danger" style="font-size: 0.85rem; padding: 0.6rem 1rem;">
              🛑 停止服务
            </button>
          </div>
        </div>
      </div>
    `;
  }

  getUptime(startedAt) {
    const now = new Date();
    const start = new Date(startedAt);
    const diff = Math.floor((now - start) / 1000); // 秒

    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds}秒`;
    } else {
      return `${seconds}秒`;
    }
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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

  showToast(message, type = 'info') {
    const colors = {
      success: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      error: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      info: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 2rem;
      right: 2rem;
      background: ${colors[type]};
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 0.75rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
      font-weight: 600;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// 添加脉冲动画
const previewListStyle = document.createElement('style');
previewListStyle.textContent = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.1);
    }
  }
`;
document.head.appendChild(previewListStyle);
