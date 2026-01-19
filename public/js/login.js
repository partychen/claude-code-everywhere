/**
 * Configuration constants for the login page
 */
const LOGIN_CONFIG = {
  /** API endpoints */
  API: {
    LOGIN: '/api/auth/login',
    VERIFY: '/api/auth/verify',
  },
  /** localStorage keys */
  STORAGE_KEYS: {
    AUTH_TOKEN: 'authToken',
    USERNAME: 'username',
  },
  /** Redirect URLs */
  REDIRECTS: {
    HOME: '/',
  },
  /** DOM element IDs */
  ELEMENTS: {
    FORM: 'login-form',
    USERNAME: 'username',
    PASSWORD: 'password',
    ERROR_MESSAGE: 'error-message',
    LOGIN_BTN: 'login-btn',
    LOGIN_TEXT: 'login-text',
    LOGIN_LOADING: 'login-loading',
  },
};

/**
 * Error messages for login failures
 */
const LOGIN_ERRORS = {
  EMPTY_CREDENTIALS: '请输入用户名和密码',
  DEFAULT: '登录失败',
};

// ============================================
// DOM Element References
// ============================================

/**
 * Gets DOM element references for the login form
 * @returns {Object} Object containing form element references
 */
function getFormElements() {
  return {
    form: document.getElementById(LOGIN_CONFIG.ELEMENTS.FORM),
    usernameInput: document.getElementById(LOGIN_CONFIG.ELEMENTS.USERNAME),
    passwordInput: document.getElementById(LOGIN_CONFIG.ELEMENTS.PASSWORD),
    errorMessage: document.getElementById(LOGIN_CONFIG.ELEMENTS.ERROR_MESSAGE),
    loginBtn: document.getElementById(LOGIN_CONFIG.ELEMENTS.LOGIN_BTN),
    loginText: document.getElementById(LOGIN_CONFIG.ELEMENTS.LOGIN_TEXT),
    loginLoading: document.getElementById(LOGIN_CONFIG.ELEMENTS.LOGIN_LOADING),
  };
}

// ============================================
// UI State Management
// ============================================

/**
 * Shows an error message
 * @param {HTMLElement} errorElement - Error message element
 * @param {string} message - Error message to display
 */
function showError(errorElement, message) {
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
}

/**
 * Hides the error message
 * @param {HTMLElement} errorElement - Error message element
 */
function hideError(errorElement) {
  errorElement.classList.add('hidden');
}

/**
 * Sets the loading state for the login button
 * @param {Object} elements - Object containing button and loading elements
 * @param {HTMLButtonElement} elements.loginBtn - Login button
 * @param {HTMLElement} elements.loginText - Login text element
 * @param {HTMLElement} elements.loginLoading - Loading indicator element
 * @param {boolean} loading - Whether to show loading state
 */
function setLoadingState(elements, loading) {
  const { loginBtn, loginText, loginLoading } = elements;

  loginBtn.disabled = loading;

  if (loading) {
    loginText.classList.add('hidden');
    loginLoading.classList.remove('hidden');
  } else {
    loginText.classList.remove('hidden');
    loginLoading.classList.add('hidden');
  }
}

// ============================================
// Authentication
// ============================================

/**
 * Attempts to login with the provided credentials
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Login response data
 * @throws {Error} If login fails
 */
async function attemptLogin(username, password) {
  const response = await fetch(LOGIN_CONFIG.API.LOGIN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || LOGIN_ERRORS.DEFAULT);
  }

  return data;
}

/**
 * Saves authentication data to localStorage
 * @param {string} token - Auth token
 * @param {string} username - Username
 */
function saveAuthData(token, username) {
  localStorage.setItem(LOGIN_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
  localStorage.setItem(LOGIN_CONFIG.STORAGE_KEYS.USERNAME, username);
}

/**
 * Clears authentication data from localStorage
 */
function clearAuthData() {
  localStorage.removeItem(LOGIN_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  localStorage.removeItem(LOGIN_CONFIG.STORAGE_KEYS.USERNAME);
}

/**
 * Verifies an existing token and redirects if valid
 * @param {string} token - Auth token to verify
 * @returns {Promise<void>}
 */
async function verifyAndRedirect(token) {
  try {
    const response = await fetch(LOGIN_CONFIG.API.VERIFY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      window.location.href = LOGIN_CONFIG.REDIRECTS.HOME;
    } else {
      clearAuthData();
    }
  } catch (error) {
    clearAuthData();
  }
}

/**
 * Redirects to the home page
 */
function redirectToHome() {
  window.location.href = LOGIN_CONFIG.REDIRECTS.HOME;
}

// ============================================
// Form Handling
// ============================================

/**
 * Validates form inputs
 * @param {string} username - Username value
 * @param {string} password - Password value
 * @returns {boolean} True if valid, false otherwise
 */
function validateCredentials(username, password) {
  return username.length > 0 && password.length > 0;
}

/**
 * Handles form submission
 * @param {Event} event - Submit event
 * @param {Object} elements - Form elements
 */
async function handleFormSubmit(event, elements) {
  event.preventDefault();

  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput.value;

  if (!validateCredentials(username, password)) {
    showError(elements.errorMessage, LOGIN_ERRORS.EMPTY_CREDENTIALS);
    return;
  }

  setLoadingState(elements, true);
  hideError(elements.errorMessage);

  try {
    const data = await attemptLogin(username, password);
    saveAuthData(data.data.token, data.data.username);
    redirectToHome();
  } catch (error) {
    showError(elements.errorMessage, error.message);
    setLoadingState(elements, false);
  }
}

// ============================================
// Initialization
// ============================================

/**
 * Initializes the login page
 */
function initializeLogin() {
  const elements = getFormElements();

  // Check for existing valid session
  const existingToken = localStorage.getItem(LOGIN_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  if (existingToken) {
    verifyAndRedirect(existingToken);
  }

  // Bind form submit handler
  elements.form.addEventListener('submit', (e) => handleFormSubmit(e, elements));
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializeLogin);
