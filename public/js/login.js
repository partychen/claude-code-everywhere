document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const errorMessage = document.getElementById('error-message');
  const loginBtn = document.getElementById('login-btn');
  const loginText = document.getElementById('login-text');
  const loginLoading = document.getElementById('login-loading');

  // 如果已经登录，跳转到主页
  const existingToken = localStorage.getItem('authToken');
  if (existingToken) {
    verifyAndRedirect(existingToken);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('请输入用户名和密码');
      return;
    }

    // 显示加载状态
    setLoading(true);
    hideError();

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '登录失败');
      }

      // 保存 token
      localStorage.setItem('authToken', data.data.token);
      localStorage.setItem('username', data.data.username);

      // 跳转到主页
      window.location.href = '/';
    } catch (error) {
      showError(error.message);
      setLoading(false);
    }
  });

  async function verifyAndRedirect(token) {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        window.location.href = '/';
      } else {
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
      }
    } catch (error) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
  }

  function hideError() {
    errorMessage.classList.add('hidden');
  }

  function setLoading(loading) {
    loginBtn.disabled = loading;
    if (loading) {
      loginText.classList.add('hidden');
      loginLoading.classList.remove('hidden');
    } else {
      loginText.classList.remove('hidden');
      loginLoading.classList.add('hidden');
    }
  }
});
