(function() {
  'use strict';

  // Read settings from the global object
  var settings = window.chatwootSettings || {};
  var token = settings.token;
  var baseUrl = settings.baseUrl || '';

  if (!token) {
    console.error('[ChatWidget] Missing token in window.chatwootSettings');
    return;
  }

  // Session management
  var SESSION_KEY = 'cw_session_' + token;
  var CONV_KEY = 'cw_conv_' + token;

  function getSession() {
    var s = localStorage.getItem(SESSION_KEY);
    if (!s) {
      s = 'sess_' + Math.random().toString(36).substr(2, 12);
      localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  }

  function getStoredConversation() {
    try {
      var c = localStorage.getItem(CONV_KEY);
      return c ? JSON.parse(c) : null;
    } catch(e) { return null; }
  }

  function storeConversation(conv) {
    localStorage.setItem(CONV_KEY, JSON.stringify(conv));
  }

  var sessionToken = getSession();
  var config = null;
  var conversation = getStoredConversation();
  var messages = [];
  var isOpen = false;
  var isLoading = false;
  var pollInterval = null;

  // ========== API Helpers ==========
  function api(method, path, body) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, baseUrl + path, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('X-Widget-Session', sessionToken);
      xhr.onload = function() {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch(e) { resolve(null); }
        } else {
          reject(new Error(xhr.statusText));
        }
      };
      xhr.onerror = function() { reject(new Error('Network error')); };
      xhr.send(body ? JSON.stringify(body) : null);
    });
  }

  function loadConfig() {
    return api('GET', '/public/widget/config/' + token).then(function(cfg) {
      config = cfg;
      return cfg;
    });
  }

  function startConversation(name, email, message) {
    return api('POST', '/public/widget/' + token + '/conversations', {
      name: name || '',
      email: email || '',
      message: message || ''
    }).then(function(conv) {
      conversation = conv;
      storeConversation(conv);
      return conv;
    });
  }

  function loadMessages() {
    if (!conversation || !conversation.token) return Promise.resolve([]);
    return api('GET', '/public/widget/conversations/' + conversation.token + '/messages')
      .then(function(msgs) {
        messages = msgs || [];
        return messages;
      });
  }

  function sendMessage(content) {
    if (!conversation || !conversation.token) return Promise.resolve(null);
    return api('POST', '/public/widget/conversations/' + conversation.token + '/messages', {
      content: content
    });
  }

  // ========== UI ==========
  var WIDGET_ID = 'cw-widget-container';

  function injectStyles() {
    var style = document.createElement('style');
    style.textContent = '\n' +
      '#cw-widget-container * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }\n' +
      '#cw-launcher { position: fixed; bottom: 24px; right: 24px; width: 60px; height: 60px; border-radius: 50%; border: none; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; z-index: 2147483647; transition: transform 0.2s; }\n' +
      '#cw-launcher:hover { transform: scale(1.08); }\n' +
      '#cw-launcher svg { width: 28px; height: 28px; fill: #fff; }\n' +
      '#cw-panel { position: fixed; bottom: 96px; right: 24px; width: 380px; max-height: 560px; background: #fff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.18); z-index: 2147483647; display: none; flex-direction: column; overflow: hidden; }\n' +
      '#cw-panel.cw-open { display: flex; }\n' +
      '#cw-header { padding: 20px; color: #fff; }\n' +
      '#cw-header h3 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }\n' +
      '#cw-header p { font-size: 13px; opacity: 0.9; }\n' +
      '#cw-reply-time { font-size: 11px; opacity: 0.7; margin-top: 6px; }\n' +
      '#cw-prechat { padding: 20px; flex: 1; overflow-y: auto; }\n' +
      '#cw-prechat label { display: block; font-size: 13px; color: #555; margin-bottom: 4px; font-weight: 500; }\n' +
      '#cw-prechat input, #cw-prechat textarea { width: 100%; padding: 10px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; margin-bottom: 12px; outline: none; }\n' +
      '#cw-prechat input:focus, #cw-prechat textarea:focus { border-color: var(--cw-color, #1b72e8); }\n' +
      '#cw-prechat textarea { min-height: 70px; resize: vertical; font-family: inherit; }\n' +
      '#cw-prechat button { width: 100%; padding: 12px; border: none; border-radius: 6px; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }\n' +
      '#cw-prechat button:disabled { opacity: 0.6; cursor: default; }\n' +
      '#cw-messages { flex: 1; overflow-y: auto; padding: 16px; min-height: 260px; max-height: 360px; }\n' +
      '.cw-msg { margin-bottom: 12px; display: flex; flex-direction: column; }\n' +
      '.cw-msg-in { align-items: flex-start; }\n' +
      '.cw-msg-out { align-items: flex-end; }\n' +
      '.cw-bubble { display: inline-block; max-width: 75%; padding: 8px 12px; border-radius: 16px; font-size: 14px; line-height: 1.4; word-wrap: break-word; overflow-wrap: break-word; }\n' +
      '.cw-msg-in .cw-bubble { background: #f3f4f6; color: #333; border-bottom-left-radius: 4px; }\n' +
      '.cw-msg-out .cw-bubble { color: #fff; border-bottom-right-radius: 4px; }\n' +
      '.cw-msg-time { font-size: 10px; color: #999; margin-top: 2px; padding: 0 4px; }\n' +
      '.cw-msg-out .cw-msg-time { text-align: right; }\n' +
      '.cw-msg-sender { font-size: 11px; font-weight: 600; margin-bottom: 2px; opacity: 0.7; }\n' +
      '#cw-compose { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #eee; }\n' +
      '#cw-compose input { flex: 1; padding: 10px 12px; border: 1px solid #ddd; border-radius: 20px; font-size: 14px; outline: none; }\n' +
      '#cw-compose input:focus { border-color: var(--cw-color, #1b72e8); }\n' +
      '#cw-compose button { width: 40px; height: 40px; border: none; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }\n' +
      '#cw-compose button:disabled { opacity: 0.5; cursor: default; }\n' +
      '#cw-compose button svg { width: 18px; height: 18px; fill: #fff; }\n' +
      '#cw-powered { text-align: center; padding: 8px; font-size: 11px; color: #999; border-top: 1px solid #f0f0f0; }\n' +
      '#cw-powered a { color: #999; text-decoration: none; }\n' +
      '@media (max-width: 480px) {\n' +
      '  #cw-panel { width: calc(100vw - 16px); right: 8px; bottom: 88px; max-height: calc(100vh - 120px); }\n' +
      '}\n';
    document.head.appendChild(style);
  }

  function createWidget() {
    var container = document.createElement('div');
    container.id = WIDGET_ID;

    // Launcher button
    var launcher = document.createElement('button');
    launcher.id = 'cw-launcher';
    launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';
    launcher.onclick = togglePanel;

    // Panel
    var panel = document.createElement('div');
    panel.id = 'cw-panel';

    container.appendChild(launcher);
    container.appendChild(panel);
    document.body.appendChild(container);

    return { launcher: launcher, panel: panel };
  }

  function applyColors() {
    var color = (config && config.widgetColor) || '#1b72e8';
    document.documentElement.style.setProperty('--cw-color', color);
    var launcher = document.getElementById('cw-launcher');
    if (launcher) launcher.style.backgroundColor = color;
  }

  function renderHeader(panel) {
    var header = document.createElement('div');
    header.id = 'cw-header';
    header.style.backgroundColor = (config && config.widgetColor) || '#1b72e8';
    header.innerHTML =
      '<h3>' + escapeHtml((config && config.welcomeTitle) || 'Hi there!') + '</h3>' +
      '<p>' + escapeHtml((config && config.welcomeTagline) || 'Ask us anything.') + '</p>' +
      '<div id="cw-reply-time">We typically reply ' + escapeHtml((config && config.replyTime) || 'in a few minutes') + '</div>';
    panel.appendChild(header);
  }

  function renderPreChatForm(panel) {
    var form = document.createElement('div');
    form.id = 'cw-prechat';
    var color = (config && config.widgetColor) || '#1b72e8';
    var needsForm = config && config.preChatFormEnabled;

    form.innerHTML = (needsForm ?
      '<label>Name</label><input type="text" id="cw-name" placeholder="Your name">' +
      '<label>Email</label><input type="email" id="cw-email" placeholder="your@email.com">' : '') +
      '<label>Message</label><textarea id="cw-init-msg" placeholder="Type your message..."></textarea>' +
      '<button id="cw-start-btn" style="background-color:' + color + '">Start Conversation</button>';
    panel.appendChild(form);

    var btn = form.querySelector('#cw-start-btn');
    btn.onclick = function() {
      var name = needsForm ? (document.getElementById('cw-name').value || '') : '';
      var email = needsForm ? (document.getElementById('cw-email').value || '') : '';
      var msg = document.getElementById('cw-init-msg').value || '';
      if (!msg.trim()) return;
      btn.disabled = true;
      btn.textContent = 'Starting...';
      startConversation(name, email, msg).then(function() {
        renderChatView();
      }).catch(function() {
        btn.disabled = false;
        btn.textContent = 'Start Conversation';
      });
    };
  }

  function renderChatView() {
    var panel = document.getElementById('cw-panel');
    panel.innerHTML = '';
    renderHeader(panel);

    // Messages area
    var msgArea = document.createElement('div');
    msgArea.id = 'cw-messages';
    panel.appendChild(msgArea);

    // Compose area
    var compose = document.createElement('div');
    compose.id = 'cw-compose';
    var color = (config && config.widgetColor) || '#1b72e8';
    compose.innerHTML =
      '<input type="text" id="cw-msg-input" placeholder="Type a message...">' +
      '<button id="cw-send-btn" style="background-color:' + color + '">' +
      '<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>';
    panel.appendChild(compose);

    // Powered by
    var powered = document.createElement('div');
    powered.id = 'cw-powered';
    powered.innerHTML = 'Powered by <a href="#">ChatWidget</a>';
    panel.appendChild(powered);

    // Event handlers
    var input = document.getElementById('cw-msg-input');
    var sendBtn = document.getElementById('cw-send-btn');

    function doSend() {
      var text = input.value.trim();
      if (!text) return;
      input.value = '';
      sendBtn.disabled = true;

      // Optimistic add
      messages.push({
        id: Date.now(),
        content: text,
        messageType: 'INCOMING',
        senderName: 'You',
        createdAt: new Date().toISOString()
      });
      renderMessages();

      sendMessage(text).then(function() {
        sendBtn.disabled = false;
        input.focus();
      }).catch(function() {
        sendBtn.disabled = false;
      });
    }

    sendBtn.onclick = doSend;
    input.onkeydown = function(e) {
      if (e.key === 'Enter') { e.preventDefault(); doSend(); }
    };

    // Load existing messages
    loadMessages().then(function() {
      renderMessages();
    });

    // Start polling for new messages
    startPolling();
  }

  function renderMessages() {
    var msgArea = document.getElementById('cw-messages');
    if (!msgArea) return;

    msgArea.innerHTML = '';
    messages.forEach(function(msg) {
      var isOut = msg.messageType === 'INCOMING'; // INCOMING = from visitor
      var div = document.createElement('div');
      div.className = 'cw-msg ' + (isOut ? 'cw-msg-out' : 'cw-msg-in');

      var color = (config && config.widgetColor) || '#1b72e8';
      var bubble = document.createElement('div');
      bubble.className = 'cw-bubble';
      if (isOut) bubble.style.backgroundColor = color;

      if (!isOut) {
        var sender = document.createElement('div');
        sender.className = 'cw-msg-sender';
        sender.textContent = msg.senderName || 'Agent';
        bubble.appendChild(sender);
      }

      var content = document.createElement('div');
      content.textContent = msg.content;
      bubble.appendChild(content);

      div.appendChild(bubble);

      if (msg.createdAt) {
        var time = document.createElement('div');
        time.className = 'cw-msg-time';
        try {
          time.textContent = new Date(msg.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        } catch(e) {
          time.textContent = '';
        }
        div.appendChild(time);
      }
      msgArea.appendChild(div);
    });

    msgArea.scrollTop = msgArea.scrollHeight;
  }

  function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(function() {
      if (!isOpen || !conversation) return;
      loadMessages().then(function() {
        renderMessages();
      });
    }, 3000); // Poll every 3 seconds
  }

  function togglePanel() {
    isOpen = !isOpen;
    var panel = document.getElementById('cw-panel');

    if (isOpen) {
      panel.classList.add('cw-open');
      if (conversation && conversation.token) {
        renderChatView();
      } else {
        panel.innerHTML = '';
        renderHeader(panel);
        renderPreChatForm(panel);
      }
    } else {
      panel.classList.remove('cw-open');
      if (pollInterval) clearInterval(pollInterval);
    }

    // Toggle launcher icon (chat vs close)
    var launcher = document.getElementById('cw-launcher');
    if (isOpen) {
      launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';
    } else {
      launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/><path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>';
    }
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ========== Init ==========
  function init() {
    injectStyles();
    createWidget();
    loadConfig().then(function() {
      applyColors();
    }).catch(function(err) {
      console.error('[ChatWidget] Failed to load config:', err);
    });
  }

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
