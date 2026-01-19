// 全局组件实例
let directoryList;
let previewList;
let systemInfo;

// Tab 切换
function switchTab(tabName) {
  // 隐藏所有内容
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  // 移除所有激活状态
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  // 显示目标内容
  document.getElementById(`page-${tabName}`).classList.remove('hidden');
  // 激活目标按钮
  const activeBtn = document.getElementById(`tab-${tabName}`);
  activeBtn.classList.add('active');

  // 更新滑动指示器位置
  updateTabIndicator(activeBtn);

  // 控制浮动按钮显示
  const fabAdd = document.getElementById('fab-add');
  const fabMenuPreview = document.getElementById('fab-menu-preview');

  if (tabName === 'dirs') {
    fabAdd.classList.add('show');
    fabMenuPreview.classList.remove('show');
  } else if (tabName === 'previews') {
    fabAdd.classList.remove('show');
    fabMenuPreview.classList.add('show');
  } else {
    fabAdd.classList.remove('show');
    fabMenuPreview.classList.remove('show');
  }
}

// 更新滑动指示器位置
function updateTabIndicator(activeBtn) {
  const indicator = document.getElementById('tab-indicator');
  const tabNav = document.querySelector('.tab-nav');

  // 获取按钮相对于父容器的位置
  const btnRect = activeBtn.getBoundingClientRect();
  const navRect = tabNav.getBoundingClientRect();

  // 计算相对位置（考虑 padding）
  const left = btnRect.left - navRect.left;
  const width = btnRect.width;

  // 应用动画
  indicator.style.width = `${width}px`;
  indicator.style.transform = `translateX(${left}px)`;
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 创建组件实例
  directoryList = new DirectoryList(api);
  previewList = new PreviewList(api);
  systemInfo = new SystemInfo(api);

  // 绑定 Tab 事件
  document.getElementById('tab-dirs').onclick = () => {
    switchTab('dirs');
    directoryList.render();
  };

  document.getElementById('tab-previews').onclick = () => {
    switchTab('previews');
    previewList.render();
  };

  document.getElementById('tab-system').onclick = () => {
    switchTab('system');
    systemInfo.render();
  };

  // 绑定浮动按钮事件
  const fabAdd = document.getElementById('fab-add');

  // 添加触摸反馈
  fabAdd.addEventListener('touchstart', () => {
    fabAdd.style.transform = 'scale(0.95) rotate(90deg)';
  });

  fabAdd.addEventListener('touchend', () => {
    setTimeout(() => {
      fabAdd.style.transform = '';
    }, 150);
  });

  fabAdd.onclick = () => {
    directoryList.showAddModal();
  };

  // FAB Menu 交互
  const fabMenuPreview = document.getElementById('fab-menu-preview');
  const fabMenuToggle = document.getElementById('fab-menu-toggle');
  const fabBackdrop = document.getElementById('fab-backdrop');

  // 切换菜单展开/收起
  fabMenuToggle.onclick = () => {
    const isExpanded = fabMenuPreview.classList.contains('expanded');
    if (isExpanded) {
      closeFabMenu();
    } else {
      openFabMenu();
    }
  };

  // 点击背景关闭菜单
  fabBackdrop.onclick = () => {
    closeFabMenu();
  };

  // 绑定菜单操作
  document.querySelectorAll('.fab-action').forEach(btn => {
    btn.onclick = () => {
      const action = btn.getAttribute('data-action');
      if (action === 'refresh') {
        previewList.render();
      } else if (action === 'stop-all') {
        previewList.stopAll();
      }
      closeFabMenu();
    };
  });

  function openFabMenu() {
    fabMenuPreview.classList.add('expanded');
    fabBackdrop.classList.add('show');
  }

  function closeFabMenu() {
    fabMenuPreview.classList.remove('expanded');
    fabBackdrop.classList.remove('show');
  }

  // 默认加载工作目录页并显示浮动按钮
  directoryList.render();
  document.getElementById('fab-add').classList.add('show');

  // 初始化滑动指示器位置
  const firstActiveBtn = document.querySelector('.tab-btn.active');
  if (firstActiveBtn) {
    updateTabIndicator(firstActiveBtn);
  }

  // 监听窗口大小变化，更新指示器位置
  window.addEventListener('resize', () => {
    const currentActiveBtn = document.querySelector('.tab-btn.active');
    if (currentActiveBtn) {
      updateTabIndicator(currentActiveBtn);
    }
  });
});
