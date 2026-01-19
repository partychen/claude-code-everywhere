/**
 * Configuration constants for the main application
 */
const APP_CONFIG = {
  /** Tab names for navigation */
  TABS: {
    DIRS: 'dirs',
    PREVIEWS: 'previews',
    SYSTEM: 'system',
  },
  /** Animation timing in milliseconds */
  ANIMATION: {
    TOUCH_FEEDBACK_DELAY_MS: 150,
  },
  /** DOM element IDs */
  ELEMENTS: {
    FAB_ADD: 'fab-add',
    FAB_MENU_PREVIEW: 'fab-menu-preview',
    FAB_MENU_TOGGLE: 'fab-menu-toggle',
    FAB_BACKDROP: 'fab-backdrop',
    TAB_INDICATOR: 'tab-indicator',
  },
};

/**
 * Global component instances
 * @type {DirectoryList|null}
 */
let directoryList = null;

/**
 * @type {PreviewList|null}
 */
let previewList = null;

/**
 * @type {SystemInfo|null}
 */
let systemInfo = null;

// ============================================
// Tab Navigation
// ============================================

/**
 * Switches to a specified tab
 * @param {string} tabName - Name of the tab to switch to
 */
function switchTab(tabName) {
  hideAllTabContents();
  deactivateAllTabButtons();
  showTabContent(tabName);
  activateTabButton(tabName);
  updateFabVisibility(tabName);
}

/**
 * Hides all tab content panels
 */
function hideAllTabContents() {
  document.querySelectorAll('.tab-content').forEach((el) => {
    el.classList.add('hidden');
  });
}

/**
 * Deactivates all tab buttons
 */
function deactivateAllTabButtons() {
  document.querySelectorAll('.tab-btn').forEach((el) => {
    el.classList.remove('active');
  });
}

/**
 * Shows the content panel for a specific tab
 * @param {string} tabName - Tab name
 */
function showTabContent(tabName) {
  const content = document.getElementById(`page-${tabName}`);
  if (content) {
    content.classList.remove('hidden');
  }
}

/**
 * Activates the button for a specific tab and updates indicator
 * @param {string} tabName - Tab name
 */
function activateTabButton(tabName) {
  const activeBtn = document.getElementById(`tab-${tabName}`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    updateTabIndicator(activeBtn);
  }
}

/**
 * Updates the floating action button visibility based on current tab
 * @param {string} tabName - Current tab name
 */
function updateFabVisibility(tabName) {
  const fabAdd = document.getElementById(APP_CONFIG.ELEMENTS.FAB_ADD);
  const fabMenuPreview = document.getElementById(APP_CONFIG.ELEMENTS.FAB_MENU_PREVIEW);

  switch (tabName) {
    case APP_CONFIG.TABS.DIRS:
      fabAdd.classList.add('show');
      fabMenuPreview.classList.remove('show');
      break;
    case APP_CONFIG.TABS.PREVIEWS:
      fabAdd.classList.remove('show');
      fabMenuPreview.classList.add('show');
      break;
    default:
      fabAdd.classList.remove('show');
      fabMenuPreview.classList.remove('show');
  }
}

/**
 * Updates the sliding indicator position under the active tab
 * @param {HTMLElement} activeBtn - The active tab button element
 */
function updateTabIndicator(activeBtn) {
  const indicator = document.getElementById(APP_CONFIG.ELEMENTS.TAB_INDICATOR);
  const tabNav = document.querySelector('.tab-nav');

  if (!indicator || !tabNav) return;

  const btnRect = activeBtn.getBoundingClientRect();
  const navRect = tabNav.getBoundingClientRect();

  const left = btnRect.left - navRect.left;
  const width = btnRect.width;

  indicator.style.width = `${width}px`;
  indicator.style.transform = `translateX(${left}px)`;
}

// ============================================
// FAB Menu Management
// ============================================

/**
 * Opens the FAB menu
 */
function openFabMenu() {
  const fabMenuPreview = document.getElementById(APP_CONFIG.ELEMENTS.FAB_MENU_PREVIEW);
  const fabBackdrop = document.getElementById(APP_CONFIG.ELEMENTS.FAB_BACKDROP);

  fabMenuPreview.classList.add('expanded');
  fabBackdrop.classList.add('show');
}

/**
 * Closes the FAB menu
 */
function closeFabMenu() {
  const fabMenuPreview = document.getElementById(APP_CONFIG.ELEMENTS.FAB_MENU_PREVIEW);
  const fabBackdrop = document.getElementById(APP_CONFIG.ELEMENTS.FAB_BACKDROP);

  fabMenuPreview.classList.remove('expanded');
  fabBackdrop.classList.remove('show');
}

// ============================================
// Event Binding
// ============================================

/**
 * Binds tab button click events
 */
function bindTabEvents() {
  document.getElementById('tab-dirs').onclick = () => {
    switchTab(APP_CONFIG.TABS.DIRS);
    directoryList.render();
  };

  document.getElementById('tab-previews').onclick = () => {
    switchTab(APP_CONFIG.TABS.PREVIEWS);
    previewList.render();
  };

  document.getElementById('tab-system').onclick = () => {
    switchTab(APP_CONFIG.TABS.SYSTEM);
    systemInfo.render();
  };
}

/**
 * Binds FAB add button events with touch feedback
 */
function bindFabAddEvents() {
  const fabAdd = document.getElementById(APP_CONFIG.ELEMENTS.FAB_ADD);

  fabAdd.addEventListener('touchstart', () => {
    fabAdd.style.transform = 'scale(0.95) rotate(90deg)';
  });

  fabAdd.addEventListener('touchend', () => {
    setTimeout(() => {
      fabAdd.style.transform = '';
    }, APP_CONFIG.ANIMATION.TOUCH_FEEDBACK_DELAY_MS);
  });

  fabAdd.onclick = () => {
    directoryList.showAddModal();
  };
}

/**
 * Binds FAB menu events
 */
function bindFabMenuEvents() {
  const fabMenuToggle = document.getElementById(APP_CONFIG.ELEMENTS.FAB_MENU_TOGGLE);
  const fabBackdrop = document.getElementById(APP_CONFIG.ELEMENTS.FAB_BACKDROP);
  const fabMenuPreview = document.getElementById(APP_CONFIG.ELEMENTS.FAB_MENU_PREVIEW);

  fabMenuToggle.onclick = () => {
    const isExpanded = fabMenuPreview.classList.contains('expanded');
    if (isExpanded) {
      closeFabMenu();
    } else {
      openFabMenu();
    }
  };

  fabBackdrop.onclick = () => {
    closeFabMenu();
  };

  bindFabActionButtons();
}

/**
 * Binds FAB action button events
 */
function bindFabActionButtons() {
  document.querySelectorAll('.fab-action').forEach((btn) => {
    btn.onclick = () => {
      const action = btn.getAttribute('data-action');
      executeFabAction(action);
      closeFabMenu();
    };
  });
}

/**
 * Executes a FAB action
 * @param {string} action - Action name
 */
function executeFabAction(action) {
  switch (action) {
    case 'refresh':
      previewList.render();
      break;
    case 'stop-all':
      previewList.stopAll();
      break;
  }
}

/**
 * Binds window resize event for indicator update
 */
function bindResizeEvent() {
  window.addEventListener('resize', () => {
    const currentActiveBtn = document.querySelector('.tab-btn.active');
    if (currentActiveBtn) {
      updateTabIndicator(currentActiveBtn);
    }
  });
}

// ============================================
// Initialization
// ============================================

/**
 * Initializes the application
 */
function initializeApp() {
  initializeComponents();
  bindTabEvents();
  bindFabAddEvents();
  bindFabMenuEvents();
  bindResizeEvent();
  renderInitialView();
}

/**
 * Creates component instances
 */
function initializeComponents() {
  directoryList = new DirectoryList(api);
  previewList = new PreviewList(api);
  systemInfo = new SystemInfo(api);
}

/**
 * Renders the initial view and sets up indicator
 */
function renderInitialView() {
  directoryList.render();
  document.getElementById(APP_CONFIG.ELEMENTS.FAB_ADD).classList.add('show');

  const firstActiveBtn = document.querySelector('.tab-btn.active');
  if (firstActiveBtn) {
    updateTabIndicator(firstActiveBtn);
  }
}

// Start the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
