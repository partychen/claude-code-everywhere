class DirectoryList {
  constructor(api) {
    this.api = api;
    this.swipeState = {};
  }

  async render() {
    const container = document.getElementById('dir-list');
    container.innerHTML = '<div class="empty-state"><div class="loading"></div><p>加载中...</p></div>';

    try {
      const { data: directories } = await this.api.getDirectories();

      if (directories.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div style="font-size: 4rem;">📁</div>
            <h3 style="font-size: 1.25rem; margin-bottom: 0.5rem; color: white;">暂无工作目录</h3>
            <p style="color: rgba(255, 255, 255, 0.8);">点击右下角 + 按钮添加第一个工作目录</p>
          </div>
        `;
        return;
      }

      container.innerHTML = directories.map(dir => this.renderCard(dir)).join('');
      this.initSwipeHandlers();
    } catch (error) {
      container.innerHTML = `
        <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white;">
          <h3 style="margin: 0 0 0.5rem 0;">❌ 加载失败</h3>
          <p style="margin: 0;">${this.escapeHtml(error.message)}</p>
        </div>
      `;
    }
  }

  renderCard(dir) {
    const badges = [];
    if (dir.is_default) badges.push('<span class="badge badge-green">默认</span>');
    if (dir.preview_enabled) badges.push('<span class="badge badge-blue">预览</span>');

    return `
      <div class="card-swipe-container" data-alias="${this.escapeHtml(dir.alias)}">
        <div class="card-swipe-actions">
          <button class="swipe-action-btn swipe-action-edit" data-action="edit">
            ✏️ 编辑
          </button>
          <button class="swipe-action-btn swipe-action-delete" data-action="delete">
            🗑️ 删除
          </button>
        </div>
        <div class="card-swipe-wrapper">
          <div class="card">
            ${!dir.is_default ? `
              <button onclick="directoryList.setDefault('${this.escapeHtml(dir.alias)}')" class="btn btn-primary" style="font-size: 0.75rem; padding: 0.4rem 0.75rem; white-space: nowrap; float: right; margin-left: 0.75rem;">
                ⭐ 设为默认
              </button>
            ` : ''}
            <h3 style="font-size: 1.5rem; font-weight: 700; margin: 0 0 0.5rem 0; color: #2d3748; display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
              ${this.escapeHtml(dir.alias)}
              ${badges.join(' ')}
            </h3>
            <p style="color: #4a5568; margin: 0.5rem 0; font-family: 'Monaco', monospace; font-size: 0.9rem; overflow-wrap: break-word;">
              📂 ${this.escapeHtml(dir.path)}
            </p>
            ${dir.description ? `<p style="color: #718096; margin: 0.5rem 0; font-size: 0.9rem;">${this.escapeHtml(dir.description)}</p>` : ''}
            ${dir.preview_enabled ? `
              <div style="margin-top: 0.75rem; padding: 0.75rem; background: rgba(102, 126, 234, 0.05); border-radius: 0.5rem; border-left: 3px solid #667eea;">
                <p style="margin: 0; font-size: 0.85rem; color: #4a5568;">
                  <strong>启动命令:</strong> <code style="background: rgba(102, 126, 234, 0.1); padding: 0.125rem 0.375rem; border-radius: 0.25rem;">${this.escapeHtml(dir.start_cmd || 'N/A')}</code>
                </p>
                <p style="margin: 0.5rem 0 0 0; font-size: 0.85rem; color: #4a5568;">
                  <strong>端口:</strong> ${dir.preview_port || 'N/A'}
                </p>
              </div>
            ` : ''}
            <div style="clear: both;"></div>
          </div>
        </div>
      </div>
    `;
  }

  initSwipeHandlers() {
    const containers = document.querySelectorAll('.card-swipe-container');

    containers.forEach(container => {
      const wrapper = container.querySelector('.card-swipe-wrapper');
      const actions = container.querySelector('.card-swipe-actions');
      const alias = container.dataset.alias;

      let startX = 0;
      let currentX = 0;
      let isDragging = false;

      // 触摸事件
      wrapper.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        wrapper.style.transition = 'none';
      });

      wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        currentX = e.touches[0].clientX;
        const diff = startX - currentX;

        if (diff > 0 && diff < 100) {
          wrapper.style.transform = `translateX(-${diff}px)`;
          if (diff > 30) {
            actions.classList.add('visible');
          }
        }
      });

      wrapper.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = startX - currentX;
        wrapper.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        if (diff > 60) {
          wrapper.style.transform = 'translateX(-90px)';
          this.swipeState[alias] = true;
        } else {
          wrapper.style.transform = 'translateX(0)';
          actions.classList.remove('visible');
          this.swipeState[alias] = false;
        }
      });

      // 鼠标事件（桌面端）
      wrapper.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        wrapper.style.transition = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        currentX = e.clientX;
        const diff = startX - currentX;

        if (diff > 0 && diff < 100) {
          wrapper.style.transform = `translateX(-${diff}px)`;
          if (diff > 30) {
            actions.classList.add('visible');
          }
        }
      });

      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;

        const diff = startX - currentX;
        wrapper.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';

        if (diff > 60) {
          wrapper.style.transform = 'translateX(-90px)';
          this.swipeState[alias] = true;
        } else {
          wrapper.style.transform = 'translateX(0)';
          actions.classList.remove('visible');
          this.swipeState[alias] = false;
        }
      });

      // 动作按钮点击
      actions.querySelectorAll('.swipe-action-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const action = btn.dataset.action;
          if (action === 'edit') {
            await this.edit(alias);
          } else if (action === 'delete') {
            await this.delete(alias);
          }
          // 重置滑动状态
          wrapper.style.transform = 'translateX(0)';
          actions.classList.remove('visible');
          this.swipeState[alias] = false;
        });
      });

      // 点击卡片其他区域时收回
      wrapper.addEventListener('click', (e) => {
        if (this.swipeState[alias] && !e.target.closest('button')) {
          wrapper.style.transform = 'translateX(0)';
          actions.classList.remove('visible');
          this.swipeState[alias] = false;
        }
      });
    });
  }

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

  async edit(alias) {
    try {
      const { data: dir } = await this.api.getDirectory(alias);
      this.showEditModal(dir);
    } catch (error) {
      this.showToast(`❌ 加载失败: ${error.message}`, 'error');
    }
  }

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
        isDefault: false
      },
      isEdit: false
    });
  }

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
        isDefault: dir.is_default === 1
      },
      isEdit: true
    });
  }

  showModal({ title, data, isEdit }) {
    const modal = document.createElement('div');
    modal.className = 'modal show';

    modal.innerHTML = `
      <div class="modal-content">
        <h2 style="margin: 0 0 1.5rem 0; color: #2d3748; font-size: 1.5rem; font-weight: 700;">${title}</h2>

        <form id="dir-form">
          <div style="margin-bottom: 1rem;">
            <label>别名 *</label>
            <input type="text" name="alias" value="${this.escapeHtml(data.alias)}" ${isEdit ? 'readonly' : ''} required
              style="${isEdit ? 'background: #f7fafc; cursor: not-allowed;' : ''}"
              placeholder="例如: my-project">
          </div>

          <div style="margin-bottom: 1rem;">
            <label>路径 (相对于根目录) *</label>
            <input type="text" name="path" value="${this.escapeHtml(data.path)}" ${isEdit ? 'readonly' : ''} required
              style="${isEdit ? 'background: #f7fafc; cursor: not-allowed;' : ''}"
              placeholder="例如: project-folder">
          </div>

          <div style="margin-bottom: 1rem;">
            <label>描述</label>
            <textarea name="description" rows="2" placeholder="描述这个项目">${this.escapeHtml(data.description)}</textarea>
          </div>

          <div style="margin-bottom: 1rem; padding: 1rem; background: rgba(102, 126, 234, 0.05); border-radius: 0.75rem;">
            <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
              <input type="checkbox" name="previewEnabled" id="preview-enabled" ${data.previewEnabled ? 'checked' : ''}>
              <label for="preview-enabled" style="margin: 0; cursor: pointer;">启用预览功能</label>
            </div>

            <div id="preview-config" style="display: ${data.previewEnabled ? 'block' : 'none'};">
              <div style="margin-bottom: 1rem;">
                <label>启动命令</label>
                <input type="text" name="startCmd" value="${this.escapeHtml(data.startCmd)}" placeholder="例如: npm run dev">
              </div>

              <div style="margin-bottom: 0;">
                <label>预览端口</label>
                <input type="number" name="previewPort" value="${data.previewPort}" placeholder="例如: 3000">
              </div>
            </div>
          </div>

          ${!isEdit ? `
            <div style="margin-bottom: 1.5rem;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <input type="checkbox" name="isDefault" id="is-default" ${data.isDefault ? 'checked' : ''}>
                <label for="is-default" style="margin: 0; cursor: pointer;">设为默认目录</label>
              </div>
            </div>
          ` : ''}

          <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
            <button type="button" class="btn btn-secondary" onclick="document.querySelector('.modal').remove()" style="background: #e2e8f0; color: #2d3748;">
              取消
            </button>
            <button type="submit" class="btn btn-primary">
              ${isEdit ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </div>
    `;

    // 预览配置切换
    const previewCheckbox = modal.querySelector('#preview-enabled');
    const previewConfig = modal.querySelector('#preview-config');
    previewCheckbox.addEventListener('change', () => {
      previewConfig.style.display = previewCheckbox.checked ? 'block' : 'none';
    });

    // 表单提交
    const form = modal.querySelector('#dir-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);

      const payload = {
        alias: formData.get('alias'),
        path: formData.get('path'),
        description: formData.get('description') || undefined,
        previewEnabled: formData.get('previewEnabled') === 'on',
        startCmd: formData.get('startCmd') || undefined,
        previewPort: formData.get('previewPort') ? parseInt(formData.get('previewPort')) : undefined,
        isDefault: formData.get('isDefault') === 'on'
      };

      try {
        if (isEdit) {
          await this.api.updateDirectory(data.alias, {
            description: payload.description,
            previewEnabled: payload.previewEnabled,
            startCmd: payload.startCmd,
            previewPort: payload.previewPort
          });
          this.showToast('✅ 更新成功', 'success');
        } else {
          await this.api.createDirectory(payload);
          this.showToast('✅ 添加成功', 'success');
        }
        modal.remove();
        await this.render();
      } catch (error) {
        this.showToast(`❌ ${isEdit ? '更新' : '添加'}失败: ${error.message}`, 'error');
      }
    });

    document.getElementById('modal-container').appendChild(modal);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
      max-width: 320px;
    `;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// 添加动画样式
const directoryListStyle = document.createElement('style');
directoryListStyle.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(directoryListStyle);
