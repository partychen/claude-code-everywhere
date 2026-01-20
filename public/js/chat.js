/**
 * Chat page for interacting with Claude Code agent
 */

class ChatPage {
  constructor() {
    this.alias = this.getAliasFromURL();
    this.messages = [];
    this.isProcessing = false;
    this.isLoadingHistory = false;
    this.hasMoreHistory = true;
    this.oldestMessageId = null;

    this.elements = {
      title: document.getElementById('chat-title'),
      path: document.getElementById('chat-path'),
      messagesContainer: document.getElementById('chat-messages'),
      input: document.getElementById('chat-input'),
      sendBtn: document.getElementById('send-btn'),
      newSessionToggle: document.getElementById('new-session-toggle'),
    };

    this.init();
  }

  getAliasFromURL() {
    const params = new URLSearchParams(window.location.search);
    const alias = params.get('alias');
    if (!alias) {
      window.location.href = '/';
      return '';
    }
    return alias;
  }

  async init() {
    await this.loadDirectoryInfo();
    this.loadChatHistory();
    this.setupEventListeners();
    this.elements.input.focus();
  }

  async loadDirectoryInfo() {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/directories/${this.alias}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load directory');
      }

      const { data: directory } = await response.json();
      this.elements.title.textContent = `💬 ${directory.alias}`;
      this.elements.path.textContent = `📂 ${directory.path}`;
      this.directory = directory;
    } catch (error) {
      console.error('Failed to load directory:', error);
      this.showToast('加载失败，返回首页...', 'error');
      setTimeout(() => window.location.href = '/', 2000);
    }
  }

  async loadChatHistory() {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(`/api/chat/history/${this.alias}?limit=1`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        console.warn('Failed to load chat history');
        return;
      }

      const { data: conversations } = await response.json();

      if (conversations && conversations.length > 0) {
        // 清空容器（移除初始提示）
        this.elements.messagesContainer.innerHTML = '';

        conversations.forEach((conv) => {
          // 添加用户消息
          this.addMessage('user', conv.user_message, conv.id);
          // 添加助手回复
          this.addMessage('assistant', conv.assistant_message, conv.id);
        });

        // 记录最早的对话 ID
        this.oldestMessageId = conversations[0].id;
        // 假设可能有更多历史记录
        this.hasMoreHistory = true;

        this.scrollToBottom();
      } else {
        // 没有历史记录，保留初始提示，但标记没有更多历史
        this.hasMoreHistory = false;
      }
    } catch (error) {
      console.warn('Failed to load chat history:', error);
      this.hasMoreHistory = false;
    }
  }

  async loadMoreHistory() {
    if (this.isLoadingHistory || !this.hasMoreHistory || !this.oldestMessageId) {
      return;
    }

    this.isLoadingHistory = true;

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/chat/history/${this.alias}?limit=3&beforeId=${this.oldestMessageId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        console.warn('Failed to load more history');
        return;
      }

      const { data: conversations } = await response.json();

      if (conversations && conversations.length > 0) {
        // 保存当前滚动位置
        const currentScrollHeight = this.elements.messagesContainer.scrollHeight;
        const currentScrollTop = this.elements.messagesContainer.scrollTop;

        // 在顶部插入旧对话（每个对话包含用户消息和助手回复）
        const firstMessage = this.elements.messagesContainer.firstChild;
        conversations.forEach((conv) => {
          // 插入助手消息（先插入，因为是倒序）
          const assistantElement = this.createMessageElement('assistant', conv.assistant_message, conv.id);
          this.elements.messagesContainer.insertBefore(assistantElement, firstMessage);

          // 插入用户消息
          const userElement = this.createMessageElement('user', conv.user_message, conv.id);
          this.elements.messagesContainer.insertBefore(userElement, assistantElement);
        });

        // 更新最早对话 ID
        this.oldestMessageId = conversations[0].id;
        this.hasMoreHistory = conversations.length === 3;

        // 恢复滚动位置（保持在原来的位置）
        const newScrollHeight = this.elements.messagesContainer.scrollHeight;
        this.elements.messagesContainer.scrollTop = currentScrollTop + (newScrollHeight - currentScrollHeight);
      } else {
        this.hasMoreHistory = false;
      }
    } catch (error) {
      console.warn('Failed to load more history:', error);
    } finally {
      this.isLoadingHistory = false;
    }
  }

  setupEventListeners() {
    this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

    this.elements.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    this.elements.input.addEventListener('input', () => {
      this.autoResizeTextarea();
    });

    // 监听滚动事件，实现下拉加载更多
    this.elements.messagesContainer.addEventListener('scroll', () => {
      this.handleScroll();
    });
  }

  handleScroll() {
    const container = this.elements.messagesContainer;
    // 当滚动到顶部（距离顶部小于 50px）时，加载更多历史记录
    if (container.scrollTop < 50) {
      this.loadMoreHistory();
    }
  }

  autoResizeTextarea() {
    const textarea = this.elements.input;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }

  async sendMessage() {
    const message = this.elements.input.value.trim();
    if (!message || this.isProcessing) return;

    this.isProcessing = true;
    this.elements.sendBtn.disabled = true;
    this.elements.input.value = '';
    this.autoResizeTextarea();

    this.addMessage('user', message);

    const typingIndicator = this.showTypingIndicator();

    try {
      const newSession = this.elements.newSessionToggle.checked;
      await this.executeAgent(message, newSession, typingIndicator);
    } catch (error) {
      console.error('Error:', error);
      typingIndicator.remove();
      this.addMessage('status', `❌ 错误: ${error.message}`);
    } finally {
      this.isProcessing = false;
      this.elements.sendBtn.disabled = false;
      this.elements.input.focus();
    }
  }

  async executeAgent(prompt, newSession, typingIndicator) {
    const authToken = localStorage.getItem('authToken');
    const response = await fetch('/api/chat/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        alias: this.alias,
        prompt,
        newSession,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let assistantMessage = null;
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        typingIndicator.remove();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
          typingIndicator.remove();
          continue;
        }

        try {
          const event = JSON.parse(data);

          if (event.type === 'assistant_response') {
            typingIndicator.remove();
            if (!assistantMessage) {
              assistantMessage = this.addMessage('assistant', event.text);
            } else {
              this.appendToMessage(assistantMessage, event.text);
            }
          } else if (event.type === 'status') {
            this.addMessage('status', event.text);
          } else if (event.type === 'result') {
            this.addMessage('status', `✅ ${event.text}`);
          } else if (event.type === 'error') {
            typingIndicator.remove();
            this.addMessage('status', `❌ ${event.text}`);
          }
        } catch (e) {
          console.warn('Failed to parse event:', e);
        }
      }
    }

    if (!assistantMessage) {
      typingIndicator.remove();
      this.addMessage('assistant', '任务已完成');
    }
  }

  showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'message message-assistant';
    indicator.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    this.elements.messagesContainer.appendChild(indicator);
    this.scrollToBottom();
    return indicator;
  }

  createMessageElement(type, text, id = null) {
    const message = document.createElement('div');
    message.className = `message message-${type}`;
    if (id) {
      message.dataset.messageId = id;
    }

    const content = document.createElement('div');
    content.className = 'message-content';

    if (type === 'assistant') {
      content.innerHTML = this.renderMarkdown(text);
    } else {
      content.textContent = text;
    }

    message.appendChild(content);
    return message;
  }

  addMessage(type, text, id = null) {
    const message = this.createMessageElement(type, text, id);
    this.elements.messagesContainer.appendChild(message);
    this.scrollToBottom();

    // 更新最早消息 ID
    if (id && (!this.oldestMessageId || id < this.oldestMessageId)) {
      this.oldestMessageId = id;
    }

    return message;
  }

  appendToMessage(messageElement, text) {
    const content = messageElement.querySelector('.message-content');
    const isAssistant = messageElement.classList.contains('message-assistant');

    if (isAssistant) {
      const currentText = content.getAttribute('data-raw-text') || '';
      const newText = currentText + text;
      content.setAttribute('data-raw-text', newText);
      content.innerHTML = this.renderMarkdown(newText);
    } else {
      content.textContent += text;
    }

    this.scrollToBottom();
  }

  renderMarkdown(text) {
    if (typeof marked === 'undefined') {
      return text.replace(/\n/g, '<br>');
    }

    try {
      marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false,
      });

      // 使用同步方法
      const result = marked.parse(text);
      return result;
    } catch (error) {
      console.error('Markdown parse error:', error);
      return text.replace(/\n/g, '<br>');
    }
  }

  scrollToBottom() {
    this.elements.messagesContainer.scrollTop =
      this.elements.messagesContainer.scrollHeight;
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

new ChatPage();
