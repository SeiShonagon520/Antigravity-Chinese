function scheduleSemanticUpdate() {
    clearTimeout(semanticTimer);
    semanticTimer = setTimeout(() => {
        annotateSemanticDom();
        injectBranchButton();
        injectSideChatButton();
        injectComposerPet();
        injectMessageBranchButtons();
    }, 70);
}

function getCurrentConversationId() {
    const urlStr = location.href || location.hash || location.pathname || '';
    const match = urlStr.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (match) return match[1];
    const domMatch = document.querySelector('[data-cascade-id], [data-conversation-id], [data-agy-active="true"]');
    if (domMatch) {
        const id = domMatch.getAttribute('data-cascade-id') || domMatch.getAttribute('data-conversation-id');
        if (id && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) return id;
    }
    const linkMatch = document.querySelector('a[href*="/c/"]');
    if (linkMatch && linkMatch.getAttribute('href')) {
        const m = linkMatch.getAttribute('href').match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (m) return m[1];
    }
    return '';
}

/* --- [AGY UI 增强 1] 顶部新建分支按钮 --- */
function injectBranchButton() {
    if (document.getElementById('agy-branch-btn')) return;
    const openIdeBtn = Array.from(document.querySelectorAll('button')).find(btn => {
        const txt = (btn.textContent || '').trim();
        return txt.includes('Open IDE') || txt.includes('打开 IDE');
    });
    if (!openIdeBtn || !openIdeBtn.parentElement) return;

    const branchBtn = document.createElement('button');
    branchBtn.id = 'agy-branch-btn';
    branchBtn.type = 'button';
    branchBtn.title = '从当前对话创建新分支 (快捷键 Ctrl+Shift+B)';
    branchBtn.className = openIdeBtn.className;
    branchBtn.style.marginRight = '8px';
    branchBtn.style.display = 'inline-flex';
    branchBtn.style.alignItems = 'center';
    branchBtn.style.gap = '5px';
    branchBtn.style.cursor = 'pointer';
    branchBtn.innerHTML = '<span style="font-size: 13px;">🌿</span><span>新建分支</span>';

    branchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBranchModal();
    });

    openIdeBtn.parentElement.insertBefore(branchBtn, openIdeBtn);
}

/* --- [AGY UI 增强 1.1] Codex 风格：顶部侧边对话按钮 --- */
function injectSideChatButton() {
    if (document.getElementById('agy-side-chat-btn')) return;
    const openIdeBtn = Array.from(document.querySelectorAll('button')).find(btn => {
        const txt = (btn.textContent || '').trim();
        return txt.includes('Open IDE') || txt.includes('打开 IDE');
    });
    if (!openIdeBtn || !openIdeBtn.parentElement) return;

    const sideChatBtn = document.createElement('button');
    sideChatBtn.id = 'agy-side-chat-btn';
    sideChatBtn.type = 'button';
    sideChatBtn.title = '开启/关闭侧边对话 (快捷键 Ctrl+Shift+S) - 独立思考空间，不污染主任务';
    sideChatBtn.className = openIdeBtn.className;
    sideChatBtn.style.marginRight = '8px';
    sideChatBtn.style.display = 'inline-flex';
    sideChatBtn.style.alignItems = 'center';
    sideChatBtn.style.gap = '5px';
    sideChatBtn.style.cursor = 'pointer';
    sideChatBtn.style.transition = 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)';
    sideChatBtn.innerHTML = '<span style="font-size: 13px;">💬</span><span>侧边对话</span>';

    sideChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleSideChatPanel();
    });

    openIdeBtn.parentElement.insertBefore(sideChatBtn, openIdeBtn);
}


/* --- [AGY UI 增强 1.2] Codex 风格：消息气泡操作栏分支按钮 --- */
function findMessageActionBars() {
    const actionBars = new Set();
    const allButtons = Array.from(document.querySelectorAll('button'));

    allButtons.forEach(btn => {
        if (btn.closest('header') || btn.closest('aside') || btn.closest('[data-agy-surface="sidebar"]')) return;
        if (btn.closest('#antigravity\\.agentSidePanelInputBox') || btn.closest('[data-agy-component="composer"]')) return;
        if (btn.closest('#agy-branch-modal') || btn.closest('#agy-composer-pet') || btn.closest('#agy-pet-context-menu')) return;
        if (btn.classList.contains('agy-msg-branch-btn') || btn.id === 'agy-branch-btn') return;
        if (btn.closest('pre') || btn.closest('.monaco-editor') || btn.closest('code') || btn.closest('[class*="code-block"]')) return;

        const title = (btn.getAttribute('title') || '').toLowerCase();
        const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
        const text = (btn.textContent || '').trim().toLowerCase();

        const isCopy = title.includes('copy') || aria.includes('copy') || title.includes('复制') || aria.includes('复制') || text === 'copy' || text === '复制';
        const isFeedback = title.includes('thumb') || aria.includes('thumb') || aria.includes('like') || aria.includes('赞') || title.includes('赞') || aria.includes('踩');
        const isRetry = title.includes('retry') || aria.includes('retry') || title.includes('重试') || aria.includes('重新生成');

        if ((isCopy || isFeedback || isRetry) && btn.parentElement) {
            actionBars.add(btn.parentElement);
        }
    });

    return Array.from(actionBars);
}

function injectMessageBranchButtons() {
    const bars = findMessageActionBars();
    bars.forEach(bar => {
        if (bar.querySelector('.agy-msg-branch-btn')) return;

        const refBtn = bar.querySelector('button');
        if (!refBtn) return;

        const branchBtn = document.createElement('button');
        branchBtn.type = 'button';
        branchBtn.className = refBtn.className + ' agy-msg-branch-btn';
        branchBtn.title = '从此消息处创建新分支 (Codex 风格历史分叉)';
        branchBtn.style.cursor = 'pointer';
        branchBtn.style.display = 'inline-flex';
        branchBtn.style.alignItems = 'center';
        branchBtn.style.justifyContent = 'center';
        branchBtn.style.gap = '4px';

        const hasText = (refBtn.textContent || '').trim().length > 0;
        const branchSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.85;"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>';

        if (hasText) {
            branchBtn.innerHTML = branchSvg + '<span style="font-size:12px;margin-left:2px;">分支</span>';
        } else {
            branchBtn.innerHTML = branchSvg;
        }

        branchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const info = getMessageTurnInfo(bar);
            openBranchModal({
                sourceId: getCurrentConversationId(),
                snippet: info.snippet,
                turnIndex: info.turnIndex
            });
        });

        bar.appendChild(branchBtn);
    });
}

function getMessageTurnInfo(bar) {
    let cur = bar.parentElement;
    let turnContainer = cur;
    for (let i = 0; i < 6 && cur && cur !== document.body; i++) {
        const cls = String(cur.className || '').toLowerCase();
        if (
            cls.includes('message') || 
            cls.includes('turn') || 
            cls.includes('bubble') ||
            cls.includes('chat-item') ||
            cur.hasAttribute('data-turn-id') ||
            cur.hasAttribute('data-message-id') ||
            (cur.parentElement && cur.parentElement.children.length > 2 && cls.includes('group'))
        ) {
            turnContainer = cur;
            break;
        }
        cur = cur.parentElement;
    }

    let text = (turnContainer.innerText || turnContainer.textContent || '').trim();
    text = text.replace(/(Copy|复制|分支|Branch|🌿|重试|Retry|赞|踩)/g, ' ').replace(/\s+/g, ' ').trim();
    const snippet = text.slice(0, 100);

    let turnIndex = null;
    if (turnContainer && turnContainer.parentElement) {
        const siblings = Array.from(turnContainer.parentElement.children).filter(el => {
            return el.querySelector('.agy-msg-branch-btn') || el === turnContainer;
        });
        const idx = siblings.indexOf(turnContainer);
        if (idx >= 0) {
            turnIndex = idx;
        }
    }

    return { snippet, turnIndex };
}

function openBranchModal(options = {}) {
    if (document.getElementById('agy-branch-modal')) return;

    let currentTitle = '当前对话';
    const activeItem = document.querySelector('[data-agy-active="true"], [data-agy-nav-item="true"], [aria-current="page"]');
    if (activeItem && activeItem.textContent) {
        const itemTxt = activeItem.textContent.trim().replace(/^(🌿\s*)/, '');
        if (itemTxt && itemTxt.length < 80) currentTitle = itemTxt;
    }
    if (currentTitle === '当前对话') {
        const titleEl = document.querySelector('header h1, header h2, [class*="header"] h1, [class*="header"] h2, [class*="title-bar"] h1, [class*="title-bar"] h2, main h1, main h2');
        if (titleEl && titleEl.textContent) {
            const txt = titleEl.textContent.trim();
            if (txt && txt.length < 80 && !txt.includes('Open IDE') && !txt.includes('打开 IDE')) currentTitle = txt;
        }
    }

    let currentId = options.sourceId || getCurrentConversationId();
    const snippet = options.snippet || '';
    const turnIndex = options.turnIndex !== undefined && options.turnIndex !== null ? options.turnIndex : null;

    let defaultBranchTitle = `${currentTitle} (分支)`;
    if (turnIndex !== null && turnIndex >= 0) {
        defaultBranchTitle = `${currentTitle} (第 ${turnIndex + 1} 轮分支)`;
    }

    const modal = document.createElement('div');
    modal.id = 'agy-branch-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    
    modal.innerHTML = `
      <div style="background:rgba(24,28,36,0.97);color:#f1f5f9;border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:22px 24px;width:450px;box-shadow:0 20px 50px rgba(0,0,0,0.55);display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,197,94,0.15);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:18px;">🌿</div>
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:600;color:#f8fafc;">新建会话分支 (分叉修剪历史)</h3>
            <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">可自由指定保留的历史对话轮次，彻底丢弃后续对话</p>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label style="font-size:12px;font-weight:500;color:#cbd5e1;">分叉截断点 (保留历史轮次)：</label>
            <span id="agy-branch-turn-badge" style="font-size:11px;color:#94a3b8;">正在分析历史...</span>
          </div>
          <select id="agy-branch-turn-select" style="background:rgba(30,36,48,0.95);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:9px 12px;color:#fff;font-size:12px;outline:none;cursor:pointer;width:100%;box-sizing:border-box;">
            <option value="-1">⏳ 正在读取会话历史轮次...</option>
          </select>
        </div>

        <div id="agy-branch-turn-hint" style="font-size:11px;color:#cbd5e1;line-height:1.5;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:9px 12px;min-height:36px;display:flex;align-items:center;">
          ⏳ 正在载入会话历史...
        </div>

        <div style="display:flex;flex-direction:column;gap:6px;">
          <label style="font-size:12px;font-weight:500;color:#cbd5e1;">分支会话标题：</label>
          <input id="agy-branch-title-input" type="text" value="${defaultBranchTitle.replace(/"/g, '&quot;')}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none;width:100%;box-sizing:border-box;" />
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px;">
          <button id="agy-branch-cancel" type="button" style="padding:7px 15px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;">取消</button>
          <button id="agy-branch-submit" type="button" style="padding:7px 18px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;font-size:12px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">确认创建分支</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('agy-branch-title-input');
    const select = document.getElementById('agy-branch-turn-select');
    const hint = document.getElementById('agy-branch-turn-hint');
    const badge = document.getElementById('agy-branch-turn-badge');
    const btnCancel = document.getElementById('agy-branch-cancel');
    const btnSubmit = document.getElementById('agy-branch-submit');

    let userEditedTitle = false;
    input.addEventListener('input', () => { userEditedTitle = true; });

    let conversationTurns = [];

    // 异步加载会话轮次数据
    (async () => {
        try {
            const turnRes = await electron_1.ipcRenderer.invoke('agy:get-conversation-turns', { sourceId: currentId });
            if (turnRes && turnRes.success && Array.isArray(turnRes.turns)) {
                conversationTurns = turnRes.turns;
                if (!currentId && turnRes.sourceId) {
                    currentId = turnRes.sourceId;
                }
            }
        } catch (e) {
            console.warn('[AGY] Failed to fetch turns:', e);
        }

        select.innerHTML = '';
        if (conversationTurns.length === 0) {
            const opt = document.createElement('option');
            opt.value = '-1';
            opt.textContent = '🌟 完整克隆当前会话 (全量保留)';
            select.appendChild(opt);
            badge.textContent = '暂无历史轮次';
            hint.innerHTML = '🌟 将完整克隆当前会话的全部上下文。';
        } else {
            badge.textContent = '共 ' + conversationTurns.length + ' 轮对话';

            // 倒序排列 (最新的轮次在上方，便于选择)
            conversationTurns.slice().reverse().forEach(t => {
                const opt = document.createElement('option');
                opt.value = String(t.turnIndex);
                const num = t.turnIndex + 1;
                const snippetText = t.userText ? (t.userText.length > 26 ? t.userText.slice(0, 26) + '...' : t.userText) : ('第 ' + num + ' 轮');
                opt.textContent = '🌿 第 ' + num + ' 轮: ' + snippetText + ' (保留第 1~' + num + ' 轮)';
                select.appendChild(opt);
            });

            // 底部选项: 全量克隆
            const fullOpt = document.createElement('option');
            fullOpt.value = '-1';
            fullOpt.textContent = '🌟 完整克隆当前会话 (全量保留所有 ' + conversationTurns.length + ' 轮)';
            select.appendChild(fullOpt);

            // 匹配预选轮次
            let targetTurnIndex = -1;
            if (snippet && snippet.length >= 4) {
                const sNorm = snippet.toLowerCase().replace(/\s+/g, ' ');
                const matched = conversationTurns.find(t => {
                    const uNorm = (t.userText || '').toLowerCase().replace(/\s+/g, ' ');
                    const aNorm = (t.assistantSnippet || '').toLowerCase().replace(/\s+/g, ' ');
                    return (uNorm && (uNorm.includes(sNorm.slice(0, 18)) || sNorm.includes(uNorm.slice(0, 18)))) ||
                           (aNorm && (aNorm.includes(sNorm.slice(0, 18)) || sNorm.includes(aNorm.slice(0, 18))));
                });
                if (matched) {
                    targetTurnIndex = matched.turnIndex;
                }
            }

            if (targetTurnIndex === -1 && turnIndex !== null && turnIndex >= 0 && turnIndex < conversationTurns.length) {
                targetTurnIndex = turnIndex;
            }

            if (targetTurnIndex >= 0) {
                select.value = String(targetTurnIndex);
            } else {
                // 如果是从消息按钮点开但未精确匹配，默认选最后一轮；如果是顶部按钮点开，选全量克隆 (-1)
                select.value = (snippet || turnIndex !== null) && conversationTurns.length > 0 
                    ? String(conversationTurns[conversationTurns.length - 1].turnIndex) 
                    : '-1';
            }
        }

        function updateSelectionView() {
            const val = parseInt(select.value, 10);
            if (val === -1 || isNaN(val) || conversationTurns.length === 0) {
                hint.innerHTML = '🌟 <span style="color:#38bdf8;font-weight:600;">全量保留</span>：完整保留当前会话的所有 ' + conversationTurns.length + ' 轮历史对话与执行状态，作为全新独立起点。';
                if (!userEditedTitle) {
                    input.value = `${currentTitle} (完整分支)`;
                }
            } else {
                const preserved = val + 1;
                const pruned = conversationTurns.length - preserved;
                const chosen = conversationTurns.find(t => t.turnIndex === val);
                const userQuery = chosen && chosen.userText ? `"${chosen.userText.slice(0, 30)}..."` : `第 ${preserved} 轮`;
                hint.innerHTML = '<span style="color:#4ade80;font-weight:600;">✂️ 精准修剪分叉</span>：仅保留第 <strong>1 ~ ' + preserved + '</strong> 轮历史 (' + userQuery + ')。后续的 <strong>' + pruned + '</strong> 轮对话将被彻底丢弃！';
                if (!userEditedTitle) {
                    input.value = `${currentTitle} (第 ${preserved} 轮分支)`;
                }
            }
        }

        select.addEventListener('change', updateSelectionView);
        updateSelectionView();
    })();

    input.focus();
    input.select();

    const closeModal = () => modal.remove();
    btnCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    btnSubmit.addEventListener('click', async () => {
      const val = parseInt(select.value, 10);
      let upToStep = null;
      let chosenTurnIndex = null;
      if (val >= 0 && conversationTurns.length > 0) {
          const chosen = conversationTurns.find(t => t.turnIndex === val);
          if (chosen) {
              upToStep = chosen.lastStep;
              chosenTurnIndex = chosen.turnIndex;
          }
      }

      const branchTitle = input.value.trim() || defaultBranchTitle;
      btnSubmit.disabled = true;
      btnSubmit.textContent = '正在修剪并创建分支...';
      btnSubmit.style.opacity = '0.7';

      try {
        const res = await electron_1.ipcRenderer.invoke('agy:branch-conversation', {
          sourceId: currentId,
          title: branchTitle,
          upToStep: upToStep,
          turnIndex: chosenTurnIndex,
          snippet: snippet
        });
        if (res && res.success && res.branchId) {
          btnSubmit.textContent = '正在载入新分支...';
          showBranchToast('🌿 分支「' + branchTitle + '」创建成功！正在载入新分支...');
          setTimeout(() => {
            closeModal();
            // 自动无缝切换到新分支会话
            if (location.hash && location.hash.includes('/c/')) {
              window.location.hash = '#/c/' + res.branchId;
            } else if (location.pathname && location.pathname.includes('/c/')) {
              window.location.href = location.pathname.replace(/\/c\/[^\/?#]+/, '/c/' + res.branchId);
            } else if (location.href.includes('#')) {
              window.location.hash = '#/c/' + res.branchId;
            } else {
              window.location.href = '/c/' + res.branchId;
            }
          }, 350);
        } else {
          btnSubmit.disabled = false;
          btnSubmit.textContent = '确认创建分支';
          btnSubmit.style.opacity = '1';
          alert('创建分支失败: ' + (res && res.error ? res.error : '未知错误'));
        }
      } catch (err) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = '确认创建分支';
        btnSubmit.style.opacity = '1';
        alert('调用分支接口出错: ' + err.message);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnSubmit.click();
      if (e.key === 'Escape') closeModal();
    });
}

function showBranchToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(15,23,42,0.95);color:#4ade80;border:1px solid rgba(74,222,128,0.3);padding:10px 22px;border-radius:30px;font-size:13px;font-weight:500;box-shadow:0 12px 32px rgba(0,0,0,0.45);z-index:2147483647;pointer-events:none;transition:all 0.3s cubic-bezier(0.16,1,0.3,1);opacity:0;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(6px)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

/* --- [AGY UI 增强 1.3] Codex 风格独立侧边对话系统 (零上下文污染 + 基准继承 + 一键回填) --- */

let agySideChatOpen = false;
let agySideChatBaseline = null;
let agySideChatMessages = [];
let agySideChatIsGenerating = false;

try {
    const savedMsgs = localStorage.getItem('agy_side_chat_msgs');
    if (savedMsgs) agySideChatMessages = JSON.parse(savedMsgs);
} catch (_) {}

function ensureSideChatStyles() {
    if (document.getElementById('agy-side-chat-styles')) return;
    const style = document.createElement('style');
    style.id = 'agy-side-chat-styles';
    style.textContent = `
      #agy-side-chat-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: 440px;
        min-width: 320px;
        max-width: 860px;
        background: rgba(20, 22, 27, 0.96);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border-left: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: -10px 0 40px rgba(0, 0, 0, 0.5);
        z-index: 2147483645;
        display: flex;
        flex-direction: column;
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        transform: translateX(100%);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
        color: #e2e8f0;
        box-sizing: border-box;
      }
      #agy-side-chat-panel.open {
        transform: translateX(0);
      }
      #agy-side-chat-resizer {
        position: absolute;
        top: 0;
        left: -4px;
        bottom: 0;
        width: 8px;
        cursor: col-resize;
        z-index: 10;
        background: transparent;
        transition: background 0.15s ease;
      }
      #agy-side-chat-resizer:hover, #agy-side-chat-resizer.dragging {
        background: #3b82f6;
      }
      .agy-side-header {
        height: 52px;
        padding: 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(25, 28, 35, 0.7);
        flex-shrink: 0;
      }
      .agy-side-header-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: #f8fafc;
      }
      .agy-side-badge {
        font-size: 10px;
        font-weight: 500;
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        border: 1px solid rgba(56, 189, 248, 0.25);
        padding: 2px 7px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .agy-side-header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .agy-side-icon-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #94a3b8;
        cursor: pointer;
        padding: 5px 8px;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .agy-side-icon-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #f1f5f9;
        border-color: rgba(255, 255, 255, 0.2);
      }
      .agy-side-context-card {
        margin: 10px 14px 4px 14px;
        background: rgba(30, 35, 45, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 12px;
        color: #cbd5e1;
        flex-shrink: 0;
        transition: all 0.2s ease;
      }
      .agy-side-context-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: pointer;
        user-select: none;
      }
      .agy-side-context-detail {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .agy-side-context-files {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
      }
      .agy-side-file-chip {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 4px;
        padding: 1px 6px;
        font-family: monospace;
        font-size: 10px;
        color: #7dd3fc;
      }
      .agy-side-messages {
        flex: 1;
        overflow-y: auto;
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 16px;
        box-sizing: border-box;
      }
      .agy-side-messages::-webkit-scrollbar {
        width: 6px;
      }
      .agy-side-messages::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.15);
        border-radius: 3px;
      }
      .agy-side-msg-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
        max-width: 100%;
      }
      .agy-side-msg-row.user {
        align-items: flex-end;
      }
      .agy-side-msg-row.assistant {
        align-items: flex-start;
      }
      .agy-side-msg-bubble {
        padding: 10px 14px;
        border-radius: 12px;
        font-size: 13px;
        line-height: 1.55;
        max-width: 90%;
        word-break: break-word;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .agy-side-msg-row.user .agy-side-msg-bubble {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: #fff;
        border-bottom-right-radius: 2px;
      }
      .agy-side-msg-row.assistant .agy-side-msg-bubble {
        background: rgba(30, 36, 48, 0.9);
        color: #e2e8f0;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-bottom-left-radius: 2px;
        width: 100%;
        box-sizing: border-box;
      }
      .agy-side-msg-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        padding-left: 2px;
      }
      .agy-side-msg-action-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: #cbd5e1;
        cursor: pointer;
        padding: 3px 8px;
        font-size: 11px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.15s ease;
      }
      .agy-side-msg-action-btn:hover {
        background: rgba(59, 130, 246, 0.2);
        border-color: #3b82f6;
        color: #93c5fd;
      }
      .agy-side-hero {
        background: rgba(30, 38, 52, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
      }
      .agy-side-hero-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(56, 189, 248, 0.12);
        color: #38bdf8;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
      }
      .agy-side-hero-title {
        font-size: 15px;
        font-weight: 600;
        color: #f1f5f9;
        margin: 0;
      }
      .agy-side-hero-desc {
        font-size: 12px;
        color: #94a3b8;
        line-height: 1.5;
        margin: 0;
        max-width: 320px;
      }
      .agy-side-hero-features {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        width: 100%;
        margin-top: 6px;
      }
      .agy-side-feature-card {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 8px;
        font-size: 11px;
        color: #cbd5e1;
        text-align: left;
      }
      .agy-side-quick-prompts {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        padding: 6px 14px;
        flex-shrink: 0;
        scrollbar-width: none;
      }
      .agy-side-quick-prompts::-webkit-scrollbar {
        display: none;
      }
      .agy-side-prompt-chip {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.09);
        border-radius: 14px;
        padding: 4px 10px;
        font-size: 11px;
        color: #cbd5e1;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }
      .agy-side-prompt-chip:hover {
        background: rgba(56, 189, 248, 0.15);
        border-color: rgba(56, 189, 248, 0.3);
        color: #38bdf8;
      }
      .agy-side-input-bar {
        padding: 10px 14px 14px 14px;
        background: rgba(25, 28, 35, 0.85);
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex-shrink: 0;
      }
      .agy-side-input-wrapper {
        position: relative;
        display: flex;
        align-items: flex-end;
        background: rgba(15, 18, 24, 0.9);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 8px 10px;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .agy-side-input-wrapper:focus-within {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
      }
      #agy-side-textarea {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #f1f5f9;
        font-size: 13px;
        font-family: inherit;
        resize: none;
        max-height: 140px;
        min-height: 22px;
        line-height: 1.45;
        box-sizing: border-box;
      }
      #agy-side-send-btn {
        background: #2563eb;
        border: none;
        border-radius: 7px;
        color: #fff;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        margin-left: 8px;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }
      #agy-side-send-btn:hover {
        background: #1d4ed8;
        transform: scale(1.05);
      }
      #agy-side-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .agy-side-code-block {
        background: #0d1117;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        margin: 8px 0;
        overflow: hidden;
      }
      .agy-side-code-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(255, 255, 255, 0.04);
        padding: 4px 10px;
        font-size: 11px;
        color: #94a3b8;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .agy-side-code-block pre {
        margin: 0;
        padding: 10px;
        overflow-x: auto;
        font-family: "Cascadia Code", Consolas, Monaco, monospace;
        font-size: 12px;
        color: #e2e8f0;
      }
      .agy-side-inline-code {
        background: rgba(255, 255, 255, 0.08);
        color: #f472b6;
        padding: 2px 5px;
        border-radius: 4px;
        font-family: "Cascadia Code", Consolas, Monaco, monospace;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
}

function formatSideChatMarkdown(text) {
    if (!text) return '';
    let out = String(text);
    // Escape HTML tags to prevent XSS
    out = out.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    
    // Code blocks
    out = out.replace(/```([a-zA-Z0-9_\-\+]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        const langStr = (lang || 'code').trim();
        const rawCode = code.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const encoded = encodeURIComponent(rawCode);
        return `<div class="agy-side-code-block"><div class="agy-side-code-header"><span>${langStr}</span><button class="agy-side-msg-action-btn" type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')).then(()=>this.textContent='已复制!').catch(()=>{})">复制代码</button></div><pre><code>${code.trim()}</code></pre></div>`;
    });

    // Inline code
    out = out.replace(/`([^`]+)`/g, '<code class="agy-side-inline-code">$1</code>');
    // Headers
    out = out.replace(/^### (.*$)/gim, '<h4 style="margin:8px 0 4px 0;font-size:14px;color:#f8fafc;">$1</h4>');
    out = out.replace(/^## (.*$)/gim, '<h3 style="margin:10px 0 6px 0;font-size:15px;color:#f8fafc;">$1</h3>');
    out = out.replace(/^# (.*$)/gim, '<h2 style="margin:12px 0 8px 0;font-size:16px;color:#f8fafc;">$1</h2>');
    // Bold
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#f1f5f9;">$1</strong>');
    // Blockquote
    out = out.replace(/^> (.*$)/gim, '<blockquote style="margin:6px 0;padding-left:10px;border-left:3px solid #38bdf8;color:#94a3b8;">$1</blockquote>');
    // Unordered lists
    out = out.replace(/^\s*-\s+(.*$)/gim, '<li style="margin-left:16px;list-style-type:disc;">$1</li>');
    // Newlines
    out = out.replace(/\n/g, '<br>');
    return out;
}

function sendTextToMainComposer(text) {
    let composer = null;
    if (typeof findAgyComposerContainer === 'function') {
        composer = findAgyComposerContainer();
    }
    let input = composer ? composer.querySelector('textarea, [contenteditable="true"]') : null;
    if (!input) {
        input = document.querySelector('#antigravity\\.agentSidePanelInputBox textarea, #antigravity\\.agentSidePanelInputBox [contenteditable="true"], [data-agy-component="composer"] textarea, textarea');
    }
    if (!input) {
        showBranchToast('⚠️ 未找到主会话输入框，请先激活主对话界面');
        return false;
    }
    input.focus();
    if (input.tagName && input.tagName.toLowerCase() === 'textarea') {
        const prev = input.value;
        const sep = prev && !prev.endsWith('\n') ? '\n\n' : '';
        input.value = (prev + sep + text).trim();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
        const prev = input.innerText || input.textContent || '';
        const sep = prev && !prev.endsWith('\n') ? '\n\n' : '';
        input.innerText = (prev + sep + text).trim();
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    showBranchToast('📌 已成功将内容引用填入主对话输入框！');
    return true;
}

function getSideChatProviderConfig() {
    try {
        const raw = localStorage.getItem('agy_side_chat_provider');
        if (raw) return JSON.parse(raw);
    } catch (_) {}
    return {
        type: 'deepseek',
        apiKey: '',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat'
    };
}

function saveSideChatProviderConfig(cfg) {
    localStorage.setItem('agy_side_chat_provider', JSON.stringify(cfg));
}

function ensureSideChatPanel() {
    ensureSideChatStyles();
    let panel = document.getElementById('agy-side-chat-panel');
    if (panel) return panel;

    const savedWidth = localStorage.getItem('agy_side_chat_w') || '440px';

    panel = document.createElement('div');
    panel.id = 'agy-side-chat-panel';
    panel.style.width = savedWidth;

    panel.innerHTML = `
      <div id="agy-side-chat-resizer" title="拖动调整侧边宽度"></div>
      
      <div class="agy-side-header">
        <div class="agy-side-header-title">
          <span style="font-size:16px;">💬</span>
          <span>侧边对话</span>
          <span class="agy-side-badge">⚡ 零污染 · 独立上下文</span>
        </div>
        <div class="agy-side-header-actions">
          <button class="agy-side-icon-btn" id="agy-side-quote-all-btn" type="button" title="提取当前结论并填入主对话输入框">
            <span>📌</span><span>引用结论</span>
          </button>
          <button class="agy-side-icon-btn" id="agy-side-refresh-btn" type="button" title="刷新主任务基准上下文">
            <span>🔄</span>
          </button>
          <button class="agy-side-icon-btn" id="agy-side-settings-btn" type="button" title="配置大模型接入服务 (DeepSeek / OpenAI / Gemini / Ollama)">
            <span>⚙️</span>
          </button>
          <button class="agy-side-icon-btn" id="agy-side-clear-btn" type="button" title="清空侧边对话记录">
            <span>🗑️</span>
          </button>
          <button class="agy-side-icon-btn" id="agy-side-close-btn" type="button" title="关闭侧边栏 (快捷键 Ctrl+Shift+S)">
            <span>✕</span>
          </button>
        </div>
      </div>

      <div class="agy-side-context-card" id="agy-side-context-card">
        <div class="agy-side-context-header" id="agy-side-context-toggle">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:#38bdf8;font-size:13px;">📋</span>
            <span style="font-weight:600;" id="agy-side-context-title">正在同步主会话基准...</span>
          </div>
          <span id="agy-side-context-arrow" style="font-size:10px;color:#94a3b8;">▼</span>
        </div>
        <div class="agy-side-context-detail" id="agy-side-context-detail" style="display:none;">
          <div id="agy-side-context-prompt-row"><strong>最近指令：</strong><span id="agy-side-context-prompt">暂无</span></div>
          <div><strong>涉及文件：</strong></div>
          <div class="agy-side-context-files" id="agy-side-context-files">
            <span class="agy-side-file-chip">暂无文件记录</span>
          </div>
          <div style="margin-top:4px;font-size:10px;color:#64748b;">
            💡 侧边对话会自动参考上述基准，探讨过程完全隔离，绝不污染主会话。
          </div>
        </div>
      </div>

      <div class="agy-side-messages" id="agy-side-messages"></div>

      <div class="agy-side-quick-prompts">
        <div class="agy-side-prompt-chip" data-prompt="总结当前主任务进展与已完成步骤">💡 总结主任务进展</div>
        <div class="agy-side-prompt-chip" data-prompt="分析最近的报错日志根因并提供排查建议">🔍 分析报错根因</div>
        <div class="agy-side-prompt-chip" data-prompt="列出当前任务涉及修改的代码文件清单">📂 涉及哪些文件</div>
        <div class="agy-side-prompt-chip" data-prompt="请生成一段精简清晰的下一步执行提示词，方便我发送给主智能体">✍️ 生成主对话指令</div>
      </div>

      <div class="agy-side-input-bar">
        <div class="agy-side-input-wrapper">
          <textarea id="agy-side-textarea" rows="1" placeholder="向侧边助手提问... (Enter 发送, Shift+Enter 换行)"></textarea>
          <button id="agy-side-send-btn" type="button" title="发送">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Resizer logic
    const resizer = document.getElementById('agy-side-chat-resizer');
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        resizer.classList.add('dragging');
        const startX = e.clientX;
        const startW = panel.offsetWidth;
        function onMove(ev) {
            const newW = Math.max(340, Math.min(850, startW + (startX - ev.clientX)));
            panel.style.width = newW + 'px';
            localStorage.setItem('agy_side_chat_w', newW + 'px');
        }
        function onUp() {
            resizer.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    });

    // Close button
    document.getElementById('agy-side-close-btn').addEventListener('click', () => {
        toggleSideChatPanel(false);
    });

    // Clear button
    document.getElementById('agy-side-clear-btn').addEventListener('click', () => {
        agySideChatMessages = [];
        localStorage.removeItem('agy_side_chat_msgs');
        renderSideChatMessages();
        showBranchToast('🗑️ 已清空侧边对话记录');
    });

    // Refresh context button
    document.getElementById('agy-side-refresh-btn').addEventListener('click', () => {
        refreshSideChatBaselineContext(true);
    });

    // Settings button
    document.getElementById('agy-side-settings-btn').addEventListener('click', () => {
        openSideChatSettingsModal();
    });

    // Quote all conclusion button
    document.getElementById('agy-side-quote-all-btn').addEventListener('click', () => {
        const lastAssistantMsg = [...agySideChatMessages].reverse().find(m => m.role === 'assistant');
        if (!lastAssistantMsg || !lastAssistantMsg.content) {
            showBranchToast('⚠️ 当前侧边栏尚无结论可供引用');
            return;
        }
        sendTextToMainComposer(`我们在侧边对话中确认了如下方案，请按此执行：\n\n${lastAssistantMsg.content}`);
    });

    // Context toggle accordion
    const toggle = document.getElementById('agy-side-context-toggle');
    const detail = document.getElementById('agy-side-context-detail');
    const arrow = document.getElementById('agy-side-context-arrow');
    toggle.addEventListener('click', () => {
        const isHidden = detail.style.display === 'none';
        detail.style.display = isHidden ? 'flex' : 'none';
        arrow.textContent = isHidden ? '▲' : '▼';
    });

    // Quick prompt chips
    panel.querySelectorAll('.agy-side-prompt-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const prompt = chip.getAttribute('data-prompt');
            const textarea = document.getElementById('agy-side-textarea');
            textarea.value = prompt;
            handleSideChatSend();
        });
    });

    // Textarea auto-resize and Enter send
    const textarea = document.getElementById('agy-side-textarea');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(140, textarea.scrollHeight) + 'px';
    });
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSideChatSend();
        }
    });

    // Send button
    document.getElementById('agy-side-send-btn').addEventListener('click', () => {
        handleSideChatSend();
    });

    renderSideChatMessages();
    return panel;
}

function toggleSideChatPanel(forceState) {
    const panel = ensureSideChatPanel();
    if (forceState !== undefined) {
        agySideChatOpen = forceState;
    } else {
        agySideChatOpen = !agySideChatOpen;
    }

    if (agySideChatOpen) {
        panel.classList.add('open');
        refreshSideChatBaselineContext(false);
        const topBtn = document.getElementById('agy-side-chat-btn');
        if (topBtn) {
            topBtn.style.background = 'rgba(56, 189, 248, 0.2)';
            topBtn.style.borderColor = '#38bdf8';
            topBtn.style.color = '#38bdf8';
        }
        setTimeout(() => {
            const ta = document.getElementById('agy-side-textarea');
            if (ta) ta.focus();
        }, 150);
    } else {
        panel.classList.remove('open');
        const topBtn = document.getElementById('agy-side-chat-btn');
        if (topBtn) {
            topBtn.style.background = '';
            topBtn.style.borderColor = '';
            topBtn.style.color = '';
        }
    }
}

async function refreshSideChatBaselineContext(showToastFeedback = false) {
    try {
        const titleEl = document.getElementById('agy-side-context-title');
        const promptEl = document.getElementById('agy-side-context-prompt');
        const filesEl = document.getElementById('agy-side-context-files');
        if (titleEl) titleEl.textContent = '正在获取主会话基准...';

        const curId = typeof getCurrentConversationId === 'function' ? getCurrentConversationId() : '';
        let res = null;
        if (typeof electron_1 !== 'undefined' && electron_1.ipcRenderer) {
            res = await electron_1.ipcRenderer.invoke('agy:get-side-chat-context', { sourceId: curId });
        }

        if (res && res.success && res.context) {
            agySideChatBaseline = res.context;
            if (titleEl) titleEl.textContent = agySideChatBaseline.title || '当前工作区主任务';
            if (promptEl) promptEl.textContent = agySideChatBaseline.latestUserPrompt ? agySideChatBaseline.latestUserPrompt.slice(0, 80) + '...' : '暂无详细用户指令';
            if (filesEl) {
                if (agySideChatBaseline.recentFiles && agySideChatBaseline.recentFiles.length > 0) {
                    filesEl.innerHTML = agySideChatBaseline.recentFiles.map(f => `<span class="agy-side-file-chip">${f}</span>`).join('');
                } else {
                    filesEl.innerHTML = '<span class="agy-side-file-chip" style="color:#94a3b8;">暂无记录</span>';
                }
            }
            if (showToastFeedback) showBranchToast('🔄 已同步最新主会话基准上下文！');
        } else {
            if (titleEl) titleEl.textContent = '当前工作区 (就绪)';
        }
    } catch (err) {
        console.error('refreshSideChatBaselineContext error:', err);
    }
}

function renderSideChatMessages() {
    const container = document.getElementById('agy-side-messages');
    if (!container) return;

    if (!agySideChatMessages || agySideChatMessages.length === 0) {
        container.innerHTML = `
          <div class="agy-side-hero">
            <div class="agy-side-hero-icon">⚡</div>
            <h3 class="agy-side-hero-title">Codex 风格侧边对话</h3>
            <p class="agy-side-hero-desc">在此处自由探讨、头脑风暴或测试草稿，绝不污染主任务的上下文与步骤历史！</p>
            <div class="agy-side-hero-features">
              <div class="agy-side-feature-card">
                <div style="font-weight:600;color:#38bdf8;margin-bottom:2px;">🛡️ 严格隔离</div>
                不写入主任务历史，不消耗主任务上下文窗口。
              </div>
              <div class="agy-side-feature-card">
                <div style="font-weight:600;color:#38bdf8;margin-bottom:2px;">📌 一键回填</div>
                得出的关键结论，一键填充到主会话输入框。
              </div>
            </div>
          </div>
        `;
        return;
    }

    let html = '';
    agySideChatMessages.forEach((msg, idx) => {
        const isUser = msg.role === 'user';
        if (isUser) {
            html += `
              <div class="agy-side-msg-row user">
                <div class="agy-side-msg-bubble">${formatSideChatMarkdown(msg.content)}</div>
              </div>
            `;
        } else {
            const rawContent = msg.content || '';
            const encoded = encodeURIComponent(rawContent);
            html += `
              <div class="agy-side-msg-row assistant">
                <div class="agy-side-msg-bubble">${formatSideChatMarkdown(msg.content)}</div>
                <div class="agy-side-msg-actions">
                  <button class="agy-side-msg-action-btn" type="button" onclick="sendTextToMainComposer(decodeURIComponent('${encoded}'))" title="直接将此段结论填入主对话输入框">
                    <span>📌</span><span>引用到主输入框</span>
                  </button>
                  <button class="agy-side-msg-action-btn" type="button" onclick="navigator.clipboard.writeText(decodeURIComponent('${encoded}')).then(()=>showBranchToast('📋 已复制到剪贴板')).catch(()=>{})">
                    <span>📋</span><span>复制</span>
                  </button>
                </div>
              </div>
            `;
        }
    });

    if (agySideChatIsGenerating) {
        html += `
          <div class="agy-side-msg-row assistant">
            <div class="agy-side-msg-bubble" style="display:flex;align-items:center;gap:8px;color:#94a3b8;">
              <span style="display:inline-block;animation:spin 1s linear infinite;">⏳</span>
              <span>思考中...</span>
            </div>
          </div>
        `;
    }

    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
}

async function handleSideChatSend() {
    if (agySideChatIsGenerating) return;
    const textarea = document.getElementById('agy-side-textarea');
    if (!textarea) return;
    const text = textarea.value.trim();
    if (!text) return;

    textarea.value = '';
    textarea.style.height = 'auto';

    agySideChatMessages.push({ role: 'user', content: text });
    agySideChatIsGenerating = true;
    renderSideChatMessages();

    try {
        const provider = getSideChatProviderConfig();
        const base = agySideChatBaseline || {};

        let res = null;
        if (typeof electron_1 !== 'undefined' && electron_1.ipcRenderer) {
            res = await electron_1.ipcRenderer.invoke('agy:side-chat-query', {
                messages: agySideChatMessages,
                provider,
                baselineContext: base
            });
        }

        if (res && res.success) {
            agySideChatMessages.push({ role: 'assistant', content: res.text || '（无回复内容）' });
        } else {
            agySideChatMessages.push({
                role: 'assistant',
                content: `⚠️ 请求失败: ${res ? res.error : '未知错误'}\n\n💡 请点击侧边栏右上角 **⚙️ 设置** 检查 API Key 或接入服务。`
            });
        }
    } catch (err) {
        agySideChatMessages.push({
            role: 'assistant',
            content: `⚠️ 通信异常: ${err.message}`
        });
    } finally {
        agySideChatIsGenerating = false;
        try {
            localStorage.setItem('agy_side_chat_msgs', JSON.stringify(agySideChatMessages));
        } catch (_) {}
        renderSideChatMessages();
    }
}

function openSideChatSettingsModal() {
    if (document.getElementById('agy-side-settings-modal')) return;

    const currentCfg = getSideChatProviderConfig();

    const modal = document.createElement('div');
    modal.id = 'agy-side-settings-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    modal.innerHTML = `
      <div style="background:rgba(22,25,32,0.98);color:#f1f5f9;border:1px solid rgba(255,255,255,0.15);border-radius:14px;padding:22px 24px;width:440px;box-shadow:0 24px 60px rgba(0,0,0,0.6);display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,0.15);color:#3b82f6;display:flex;align-items:center;justify-content:center;font-size:18px;">⚙️</div>
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:600;color:#f8fafc;">侧边对话模型配置</h3>
            <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">支持接入常用云端模型或本地 Ollama（独立运行）</p>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label style="font-size:12px;font-weight:500;color:#cbd5e1;">服务商预设：</label>
          <select id="agy-side-set-type" style="background:rgba(30,36,48,0.95);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:8px 10px;color:#fff;font-size:12px;outline:none;cursor:pointer;">
            <option value="deepseek" ${currentCfg.type === 'deepseek' ? 'selected' : ''}>DeepSeek (推荐 - 速度极快且实惠)</option>
            <option value="openai" ${currentCfg.type === 'openai' ? 'selected' : ''}>OpenAI (GPT-4o / GPT-4o-mini)</option>
            <option value="gemini" ${currentCfg.type === 'gemini' ? 'selected' : ''}>Google Gemini (Gemini 1.5 Flash)</option>
            <option value="ollama" ${currentCfg.type === 'ollama' ? 'selected' : ''}>本地 Ollama (完全离线隐私)</option>
            <option value="custom" ${currentCfg.type === 'custom' ? 'selected' : ''}>自定义 OpenAI 兼容接口</option>
          </select>
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;" id="agy-side-key-group">
          <label style="font-size:12px;font-weight:500;color:#cbd5e1;">API Key：</label>
          <input id="agy-side-set-key" type="password" value="${(currentCfg.apiKey || '').replace(/"/g, '&quot;')}" placeholder="sk-..." style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:8px 10px;color:#fff;font-size:12px;outline:none;width:100%;box-sizing:border-box;" />
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label style="font-size:12px;font-weight:500;color:#cbd5e1;">Base URL：</label>
          <input id="agy-side-set-url" type="text" value="${(currentCfg.baseUrl || '').replace(/"/g, '&quot;')}" placeholder="https://api.deepseek.com/v1" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:8px 10px;color:#fff;font-size:12px;outline:none;width:100%;box-sizing:border-box;" />
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label style="font-size:12px;font-weight:500;color:#cbd5e1;">模型标识 (Model)：</label>
          <input id="agy-side-set-model" type="text" value="${(currentCfg.model || '').replace(/"/g, '&quot;')}" placeholder="deepseek-chat" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:8px 10px;color:#fff;font-size:12px;outline:none;width:100%;box-sizing:border-box;" />
        </div>

        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;">
          <button id="agy-side-test-btn" type="button" style="padding:6px 12px;border:1px solid rgba(59,130,246,0.4);border-radius:8px;background:rgba(59,130,246,0.15);color:#93c5fd;cursor:pointer;font-size:11px;">⚡ 测试连接</button>
          <div style="display:flex;gap:8px;">
            <button id="agy-side-cancel-btn" type="button" style="padding:6px 14px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;">取消</button>
            <button id="agy-side-save-btn" type="button" style="padding:6px 18px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-weight:600;cursor:pointer;font-size:12px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">保存</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const typeSel = document.getElementById('agy-side-set-type');
    const keyInp = document.getElementById('agy-side-set-key');
    const urlInp = document.getElementById('agy-side-set-url');
    const modelInp = document.getElementById('agy-side-set-model');
    const keyGrp = document.getElementById('agy-side-key-group');

    typeSel.addEventListener('change', () => {
        const val = typeSel.value;
        if (val === 'deepseek') {
            urlInp.value = 'https://api.deepseek.com/v1';
            modelInp.value = 'deepseek-chat';
            keyGrp.style.display = 'flex';
        } else if (val === 'openai') {
            urlInp.value = 'https://api.openai.com/v1';
            modelInp.value = 'gpt-4o-mini';
            keyGrp.style.display = 'flex';
        } else if (val === 'gemini') {
            urlInp.value = 'https://generativelanguage.googleapis.com/v1beta/openai';
            modelInp.value = 'gemini-1.5-flash';
            keyGrp.style.display = 'flex';
        } else if (val === 'ollama') {
            urlInp.value = 'http://localhost:11434/v1';
            modelInp.value = 'qwen2.5-coder';
            keyGrp.style.display = 'none';
        }
    });

    if (currentCfg.type === 'ollama') {
        keyGrp.style.display = 'none';
    }

    document.getElementById('agy-side-test-btn').addEventListener('click', async () => {
        const testBtn = document.getElementById('agy-side-test-btn');
        testBtn.textContent = '⏳ 测试中...';
        testBtn.disabled = true;
        try {
            const testConfig = {
                type: typeSel.value,
                apiKey: keyInp.value.trim(),
                baseUrl: urlInp.value.trim(),
                model: modelInp.value.trim()
            };
            const res = await electron_1.ipcRenderer.invoke('agy:side-chat-query', {
                messages: [{ role: 'user', content: '测试连接，请回复pong' }],
                provider: testConfig,
                baselineContext: { title: '测试连接' }
            });
            if (res && res.success) {
                testBtn.textContent = '✅ 连接成功!';
                testBtn.style.color = '#4ade80';
            } else {
                testBtn.textContent = '❌ 连接失败';
                testBtn.style.color = '#f87171';
                alert('连接测试失败: ' + (res ? res.error : '未知错误'));
            }
        } catch (e) {
            testBtn.textContent = '❌ 出错';
            testBtn.style.color = '#f87171';
            alert('测试异常: ' + e.message);
        } finally {
            testBtn.disabled = false;
            setTimeout(() => {
                testBtn.textContent = '⚡ 测试连接';
                testBtn.style.color = '#93c5fd';
            }, 3000);
        }
    });

    document.getElementById('agy-side-cancel-btn').addEventListener('click', () => {
        modal.remove();
    });

    document.getElementById('agy-side-save-btn').addEventListener('click', () => {
        const cfg = {
            type: typeSel.value,
            apiKey: keyInp.value.trim(),
            baseUrl: urlInp.value.trim(),
            model: modelInp.value.trim()
        };
        saveSideChatProviderConfig(cfg);
        modal.remove();
        showBranchToast('💾 侧边模型配置已保存！');
    });
}


window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        openBranchModal();
    } else if (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        toggleSideChatPanel();
    }
});

/* --- [AGY UI 增强 2] 像素小宠物全功能系统 (状态机 + 顶边探头漫步 + 挂机瞌睡 + 助力推背 + 悬空挣扎落水软泥) --- */
let agyCurrentPet = localStorage.getItem('agy-pet-type') || 'octopus';
let agyCurrentAcc = localStorage.getItem('agy-pet-acc') || 'none';
let agyPatrolEnabled = localStorage.getItem('agy-pet-patrol') !== 'false';
let agySoundEnabled = localStorage.getItem('agy-pet-sound') === 'true'; // 默认静音
let agyPetOffset = parseInt(localStorage.getItem('agy-pet-offset') || '28', 10);

let agyPetTypingTimer = null;
let agyIsPetBouncing = false;
let agyIsTyping = false;
let agyBlinkTimer = null;
let agyAgentState = 'IDLE'; // 'IDLE' | 'THINKING' | 'CODING' | 'SUCCESS' | 'ERROR'
let agyLastDetectedActive = false;

// ✨ 4 个质感微交互核心状态
let agyIsSleeping = false;
let agyIdleTimer = null;
let agyIsPeeking = false;
let isDraggingPet = false;
let agyIsLanding = false; // ✨ 原地软泥着陆锁定状态：落地 Q 弹吸附彻底完成前锁定水平位移，防止提前起步漫步
let dragStartX = 0;
let dragStartY = 0;
let dragLastX = 0;
let dragLastY = 0;
let currentLiftY = -12;
let dragStartOffset = agyPetOffset;
let dragMovedDistance = 0;

// Web Audio 原生纯净微音效合成器 (0 外部音频文件)
let agyAudioCtx = null;
function getAgyAudioContext() {
    if (!agyAudioCtx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        agyAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (agyAudioCtx && agyAudioCtx.state === 'suspended') {
        agyAudioCtx.resume().catch(() => {});
    }
    return agyAudioCtx;
}

function playAgyPopSound() {
    if (!agySoundEnabled) return;
    try {
        const ctx = getAgyAudioContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1180, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
    } catch (_) {}
}

function playAgySuccessSound() {
    if (!agySoundEnabled) return;
    try {
        const ctx = getAgyAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);
            gain.gain.setValueAtTime(0.08, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.16);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.16);
        });
    } catch (_) {}
}

function playAgyDropSound() {
    if (!agySoundEnabled) return;
    try {
        const ctx = getAgyAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(680, now + 0.12);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
    } catch (_) {}
}

const AGY_PET_SVGS = {
  // 1. 小章鱼全状态与配饰图层
  octopus: `<svg class="agy-pixel-crisp" width="36" height="36" viewBox="0 0 18 18" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="3" width="10" height="8" fill="#d97757" rx="0.3"/>
      <rect x="5" y="2" width="8" height="1" fill="#d97757"/>
      <rect x="3" y="5" width="12" height="5" fill="#d97757"/>
      <rect x="2" y="6" width="1" height="3" fill="#d97757"/>
      <rect x="15" y="6" width="1" height="3" fill="#d97757"/>

      <!-- 正常双眼 -->
      <g id="agy-normal-eyes">
        <rect id="left-pupil" class="pupil-el" x="5.2" y="5.5" width="1.6" height="1.6" fill="#18181b" style="transition:transform 0.08s ease-out;"/>
        <rect id="left-blink" class="blink-el" x="4.8" y="6" width="2.4" height="0.8" fill="#18181b" style="display:none;"/>
        <rect id="right-pupil" class="pupil-el" x="11.2" y="5.5" width="1.6" height="1.6" fill="#18181b" style="transition:transform 0.08s ease-out;"/>
        <rect id="right-blink" class="blink-el" x="10.8" y="6" width="2.4" height="0.8" fill="#18181b" style="display:none;"/>
      </g>

      <!-- 完成时：元气弯弯笑眼 ^ ^ + 绯红腮红 -->
      <g id="agy-happy-eyes" style="display:none;">
        <path d="M4.6 6.8 C5.2 5.3 6.8 5.3 7.4 6.8" stroke="#18181b" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <path d="M10.6 6.8 C11.2 5.3 12.8 5.3 13.4 6.8" stroke="#18181b" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <ellipse cx="4.2" cy="8.1" rx="1.1" ry="0.6" fill="#f43f5e" opacity="0.65"/>
        <ellipse cx="13.8" cy="8.1" rx="1.1" ry="0.6" fill="#f43f5e" opacity="0.65"/>
      </g>

      <!-- 挂机打瞌睡眼 -->
      <g id="agy-sleep-eyes" style="display:none;">
        <path d="M4.6 6.8 C5.2 7.8 6.8 7.8 7.4 6.8" stroke="#18181b" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <path d="M10.6 6.8 C11.2 7.8 12.8 7.8 13.4 6.8" stroke="#18181b" stroke-width="1.1" stroke-linecap="round" fill="none"/>
      </g>

      <!-- 报错时：蚊香眼 -->
      <g id="agy-dizzy-eyes" style="display:none;">
        <circle cx="6" cy="6.3" r="1.3" stroke="#18181b" stroke-width="0.8" fill="none"/>
        <circle cx="12" cy="6.3" r="1.3" stroke="#18181b" stroke-width="0.8" fill="none"/>
      </g>

      <!-- 配饰：护目镜 -->
      <g id="agy-acc-goggles" style="display:none;">
        <rect x="3.8" y="4.6" width="10.4" height="3" fill="#0284c7" opacity="0.9" rx="0.8"/>
        <rect x="4.6" y="5.2" width="3.6" height="1.8" fill="#38bdf8" rx="0.4"/>
        <rect x="9.8" y="5.2" width="3.6" height="1.8" fill="#38bdf8" rx="0.4"/>
        <rect x="8.2" y="5.7" width="1.6" height="0.8" fill="#0369a1"/>
      </g>

      <!-- 配饰：小豆芽 -->
      <g id="agy-acc-sprout" style="display:none;">
        <path d="M9 2 C9 1 10.5 0.5 11.2 1 C10 1.5 9.5 2 9 2" fill="#4ade80"/>
        <path d="M9 2 C9 1 7.5 0.5 6.8 1 C8 1.5 8.5 2 9 2" fill="#22c55e"/>
        <rect x="8.7" y="1.8" width="0.6" height="1.2" fill="#15803d"/>
      </g>

      <!-- 配饰：咖啡杯 -->
      <g id="agy-acc-coffee" style="display:none;">
        <rect x="15" y="11" width="3" height="3.5" fill="#f8fafc" stroke="#64748b" stroke-width="0.5" rx="0.4"/>
        <path class="agy-steam" d="M15.5 10.5 C15.5 9.5 16 9.5 16 8.8" stroke="#cbd5e1" stroke-width="0.5" fill="none"/>
        <path class="agy-steam" d="M16.8 10.5 C16.8 9.5 17.3 9.5 17.3 8.8" stroke="#cbd5e1" stroke-width="0.5" fill="none" style="animation-delay:0.5s;"/>
      </g>

      <!-- 触手 -->
      <rect class="leg-el leg-odd" x="4" y="11" width="1.6" height="4" fill="#d97757"/>
      <rect class="leg-el leg-even" x="7" y="11" width="1.6" height="4" fill="#d97757"/>
      <rect class="leg-el leg-odd" x="9.5" y="11" width="1.6" height="4" fill="#d97757"/>
      <rect class="leg-el leg-even" x="12.5" y="11" width="1.6" height="4" fill="#d97757"/>

      <!-- 微型小键盘 -->
      <g id="mini-kb" style="display:none;">
        <rect x="4" y="13.2" width="10" height="2" fill="#1e293b" rx="0.4"/>
        <rect x="4.8" y="13.6" width="1.4" height="1.2" fill="#38bdf8"/>
        <rect x="6.8" y="13.6" width="1.4" height="1.2" fill="#a855f7"/>
        <rect x="8.8" y="13.6" width="1.4" height="1.2" fill="#38bdf8"/>
        <rect x="10.8" y="13.6" width="1.4" height="1.2" fill="#a855f7"/>
      </g>
    </svg>`,

  // 2. 线条小狗全状态与配饰图层
  puppy: `<svg class="agy-pixel-crisp" width="36" height="36" viewBox="0 0 18 18" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="10" height="7.5" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/>
      <rect class="puppy-ear" x="2.5" y="4" width="2" height="5.5" fill="#2d3748" rx="0.5" style="transform-origin:top center;"/>
      <rect class="puppy-ear" x="13.5" y="4" width="2" height="5.5" fill="#2d3748" rx="0.5" style="transform-origin:top center;"/>
      
      <g id="agy-normal-eyes">
        <circle id="left-pupil" class="pupil-el" cx="6.5" cy="7.2" r="0.9" fill="#2d3748" style="transition:transform 0.08s ease-out;"/>
        <rect id="left-blink" class="blink-el" x="5.5" y="7" width="2.2" height="0.8" fill="#2d3748" style="display:none;"/>
        <circle id="right-pupil" class="pupil-el" cx="11.5" cy="7.2" r="0.9" fill="#2d3748" style="transition:transform 0.08s ease-out;"/>
        <rect id="right-blink" class="blink-el" x="10.5" y="7" width="2.2" height="0.8" fill="#2d3748" style="display:none;"/>
      </g>

      <!-- 完成时：元气弯弯笑眼 ^ ^ + 绯红腮红 -->
      <g id="agy-happy-eyes" style="display:none;">
        <path d="M5.3 7.5 C5.9 6.2 7.1 6.2 7.7 7.5" stroke="#2d3748" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <path d="M10.3 7.5 C10.9 6.2 12.1 6.2 12.7 7.5" stroke="#2d3748" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <ellipse cx="4.8" cy="8.6" rx="1.1" ry="0.6" fill="#f43f5e" opacity="0.65"/>
        <ellipse cx="13.2" cy="8.6" rx="1.1" ry="0.6" fill="#f43f5e" opacity="0.65"/>
      </g>

      <!-- 挂机打瞌睡眼 -->
      <g id="agy-sleep-eyes" style="display:none;">
        <path d="M5.3 7.6 C5.9 8.6 7.1 8.6 7.7 7.6" stroke="#2d3748" stroke-width="1.1" stroke-linecap="round" fill="none"/>
        <path d="M10.3 7.6 C10.9 8.6 12.1 8.6 12.7 7.6" stroke="#2d3748" stroke-width="1.1" stroke-linecap="round" fill="none"/>
      </g>

      <g id="agy-dizzy-eyes" style="display:none;">
        <circle cx="6.5" cy="7.2" r="1.3" stroke="#2d3748" stroke-width="0.8" fill="none"/>
        <circle cx="11.5" cy="7.2" r="1.3" stroke="#2d3748" stroke-width="0.8" fill="none"/>
      </g>

      <g id="agy-acc-goggles" style="display:none;">
        <rect x="3.8" y="5.5" width="10.4" height="3" fill="#0284c7" opacity="0.9" rx="0.8"/>
        <rect x="4.8" y="6.1" width="3.6" height="1.8" fill="#38bdf8" rx="0.4"/>
        <rect x="9.6" y="6.1" width="3.6" height="1.8" fill="#38bdf8" rx="0.4"/>
      </g>

      <g id="agy-acc-sprout" style="display:none;">
        <path d="M9 2 C9 1 10.5 0.5 11.2 1 C10 1.5 9.5 2 9 2" fill="#4ade80"/>
        <path d="M9 2 C9 1 7.5 0.5 6.8 1 C8 1.5 8.5 2 9 2" fill="#22c55e"/>
        <rect x="8.7" y="1.8" width="0.6" height="1.2" fill="#15803d"/>
      </g>

      <g id="agy-acc-coffee" style="display:none;">
        <rect x="15" y="11" width="3" height="3.5" fill="#f8fafc" stroke="#64748b" stroke-width="0.5" rx="0.4"/>
      </g>

      <rect x="8.5" y="8.2" width="1" height="0.8" fill="#e53e3e" rx="0.3"/>
      <rect x="5" y="8.8" width="1.5" height="0.8" fill="#feb2b2" rx="0.4"/>
      <rect x="11.5" y="8.8" width="1.5" height="0.8" fill="#feb2b2" rx="0.4"/>
      <rect class="leg-el leg-odd" x="5" y="11.5" width="2.2" height="3.5" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/>
      <rect class="leg-el leg-even" x="10.8" y="11.5" width="2.2" height="3.5" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/>

      <g id="mini-kb" style="display:none;">
        <rect x="4" y="13.2" width="10" height="2" fill="#1e293b" rx="0.4"/>
        <rect x="5.2" y="13.6" width="1.8" height="1.2" fill="#f43f5e"/>
        <rect x="8" y="13.6" width="2" height="1.2" fill="#38bdf8"/>
        <rect x="11" y="13.6" width="1.8" height="1.2" fill="#f43f5e"/>
      </g>
    </svg>`
};

function ensureAgyPetStyles() {
    if (document.getElementById('agy-pet-styles')) return;
    const style = document.createElement('style');
    style.id = 'agy-pet-styles';
    style.textContent = `
      @keyframes agy-pet-idle-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
      @keyframes agy-pet-bounce-pro { 0%, 100% { transform: translateY(0) scale(1,1); } 25% { transform: translateY(-10px) scale(0.9,1.15); } 50% { transform: translateY(-2px) scale(1.08,0.92); } 75% { transform: translateY(-5px) scale(0.96,1.04); } }
      /* ✨ 元气二段跳雀跃动效 (Squash & Stretch) 彻底取代 360° 翻滚 */
      @keyframes agy-pet-joy-hop {
        0% { transform: translateY(0) scale(1, 1); }
        12% { transform: translateY(2px) scale(1.15, 0.85); }
        30% { transform: translateY(-15px) scale(0.9, 1.15) rotate(-3deg); }
        48% { transform: translateY(0) scale(1.12, 0.88) rotate(2deg); }
        65% { transform: translateY(-8px) scale(0.94, 1.08) rotate(3deg); }
        80% { transform: translateY(0) scale(1.05, 0.95) rotate(-1deg); }
        92% { transform: translateY(-2px) scale(1, 1) rotate(1deg); }
        100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
      }
      @keyframes agy-puppy-celebrate-ear { 0% { transform: rotate(-16deg); } 100% { transform: rotate(16deg); } }
      @keyframes agy-octopus-celebrate-leg { 0% { transform: translateY(0) scaleY(1); } 100% { transform: translateY(-3px) scaleY(0.7); } }
      @keyframes agy-heart-float-pro { 0% { opacity:0; transform:translateY(0) scale(0.6); } 25% { opacity:1; transform:translateY(-10px) scale(1.1); } 100% { opacity:0; transform:translateY(-26px) scale(1.3); } }
      @keyframes agy-thought-float-anim { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
      @keyframes agy-leg-type-odd { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.2px); } }
      @keyframes agy-leg-type-even { 0%, 100% { transform: translateY(-2.2px); } 50% { transform: translateY(0); } }
      @keyframes agy-puppy-ear-perk { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }
      @keyframes agy-spin-gear { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      @keyframes agy-steam-rise { 0% { opacity:0; transform:translateY(0); } 50% { opacity:0.8; } 100% { opacity:0; transform:translateY(-3px); } }

      /* 真实弧线彩带与花瓣雨飘落 */
      @keyframes agy-confetti-flutter {
        0% { opacity: 0; transform: translate(0, 0) scale(0) rotate(0deg); }
        15% { opacity: 1; transform: translate(var(--arc-x), var(--peak-y)) scale(1) rotate(var(--rot-1)); }
        50% { opacity: 1; transform: translate(calc(var(--arc-x) * 1.4 + var(--drift-x) * 0.4), calc(var(--peak-y) * 0.55)) scale(0.95) rotate(var(--rot-2)); }
        85% { opacity: 0.9; transform: translate(calc(var(--arc-x) * 1.7 + var(--drift-x)), calc(var(--peak-y) * 0.1)) scale(0.9) rotate(var(--rot-3)); }
        100% { opacity: 0; transform: translate(calc(var(--arc-x) * 1.9 + var(--drift-x) * 1.2), var(--fall-y)) scale(0.6) rotate(var(--rot-4)); }
      }
      @keyframes agy-badge-pop-in {
        0% { opacity: 0; transform: translateY(6px) scale(0.7); }
        25% { opacity: 1; transform: translateY(-4px) scale(1.08); }
        40% { transform: translateY(0) scale(1); }
        85% { opacity: 1; transform: translateY(0) scale(1); }
        100% { opacity: 0; transform: translateY(-6px) scale(0.9); }
      }

      /* ✨ 细节 1：漫步边缘驻足探头张望动效 */
      @keyframes agy-pet-peek-anim {
        0% { transform: translateY(0) rotate(0deg) scale(1, 1); }
        20% { transform: translateY(1px) rotate(-8deg) scale(1.04, 0.96); }
        40% { transform: translateY(-2px) rotate(-12deg) scale(0.96, 1.04); }
        65% { transform: translateY(-2px) rotate(-9deg) scale(0.98, 1.02); }
        85% { transform: translateY(0.5px) rotate(-3deg) scale(1.02, 0.98); }
        100% { transform: translateY(0) rotate(0deg) scale(1, 1); }
      }

      /* ✨ 细节 2：长时间挂机打瞌睡与深呼吸动效 */
      @keyframes agy-pet-sleep-breath {
        0%, 100% { transform: translateY(0) scale(1, 1); }
        50% { transform: translateY(1.5px) scale(1.05, 0.93); }
      }
      @keyframes agy-zzz-float-anim {
        0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
        30% { opacity: 0.9; transform: translate(4px, -8px) scale(0.85); }
        70% { opacity: 0.8; transform: translate(8px, -18px) scale(1.05); }
        100% { opacity: 0; transform: translate(14px, -28px) scale(1.25); }
      }
      @keyframes agy-wake-jolt-anim {
        0% { transform: scale(1, 1); }
        25% { transform: translateY(-8px) scale(1.15, 0.85) rotate(-5deg); }
        55% { transform: translateY(2px) scale(0.9, 1.1) rotate(4deg); }
        80% { transform: translateY(-2px) scale(1.03, 0.97); }
        100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
      }
      @keyframes agy-wake-pop {
        0% { opacity: 0; transform: scale(0.2) translateY(5px); }
        40% { opacity: 1; transform: scale(1.25) translateY(-4px); }
        80% { opacity: 1; transform: scale(1) translateY(-10px); }
        100% { opacity: 0; transform: scale(0.8) translateY(-18px); }
      }

      /* ✨ 细节 3：消息发送瞬间助力推背感 */
      @keyframes agy-pet-launch-push {
        0% { transform: translateY(0) scale(1, 1); }
        15% { transform: translateY(3.5px) scale(1.22, 0.78); }
        45% { transform: translateY(-16px) scale(0.84, 1.22) rotate(-5deg); }
        70% { transform: translateY(1px) scale(1.12, 0.9); }
        85% { transform: translateY(-2px) scale(0.98, 1.02); }
        100% { transform: translateY(0) scale(1, 1) rotate(0deg); }
      }

      /* ✨ 细节 4：拖拽悬空挣扎与松手落水软泥 Q 弹吸附 */
      @keyframes agy-drag-scramble-limbs {
        0% { transform: translateY(0) rotate(-14deg); }
        100% { transform: translateY(-3.5px) rotate(16deg); }
      }
      @keyframes agy-pudding-drop-squash {
        0% { transform: translateY(var(--drop-from-y, -12px)) scale(0.86, 1.18); }
        32% { transform: translateY(4px) scale(1.32, 0.68); }
        58% { transform: translateY(-6px) scale(0.9, 1.12); }
        78% { transform: translateY(1.5px) scale(1.06, 0.94); }
        90% { transform: translateY(-1px) scale(0.98, 1.02); }
        100% { transform: translateY(0) scale(1, 1); }
      }

      .agy-pet-idle-anim { animation: agy-pet-idle-subtle 2.8s ease-in-out infinite; }
      .agy-pet-bounce-anim { animation: agy-pet-bounce-pro 0.55s cubic-bezier(0.17, 0.89, 0.32, 1.28); }
      .agy-pet-celebrate-anim { animation: agy-pet-joy-hop 1.1s cubic-bezier(0.28, 0.84, 0.42, 1); }
      .agy-celebrating .puppy-ear { animation: agy-puppy-celebrate-ear 0.24s infinite alternate ease-in-out; }
      .agy-celebrating .leg-odd { animation: agy-octopus-celebrate-leg 0.2s infinite alternate ease-in-out; }
      .agy-celebrating .leg-even { animation: agy-octopus-celebrate-leg 0.2s infinite alternate-reverse ease-in-out; }
      .agy-celebrate-badge { animation: agy-badge-pop-in 2.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .agy-thought-float { animation: agy-thought-float-anim 2.2s ease-in-out infinite; }
      .agy-spin-gear { transform-origin: 6px 6px; animation: agy-spin-gear 1.8s linear infinite; }
      .agy-steam { animation: agy-steam-rise 1.4s ease-out infinite; }

      .agy-pet-peeking { animation: agy-pet-peek-anim 1.4s ease-in-out; }
      .agy-pet-sleeping { animation: agy-pet-sleep-breath 3.6s ease-in-out infinite; }
      .agy-pet-launching { animation: agy-pet-launch-push 0.65s cubic-bezier(0.18, 0.89, 0.32, 1.25); }
      .agy-pet-lifted { cursor: grabbing !important; }
      .agy-pet-lifted .leg-odd { animation: agy-drag-scramble-limbs 0.11s infinite alternate ease-in-out; }
      .agy-pet-lifted .leg-even { animation: agy-drag-scramble-limbs 0.11s infinite alternate-reverse ease-in-out; }
      .agy-pet-lifted .puppy-ear { animation: agy-puppy-celebrate-ear 0.12s infinite alternate ease-in-out; }
      .agy-pudding-landing { animation: agy-pudding-drop-squash 0.55s cubic-bezier(0.17, 0.89, 0.32, 1.28); }
      .agy-pet-waking { animation: agy-wake-jolt-anim 0.38s ease-out; }

      .agy-typing-mode .leg-odd, .agy-patrol-mode .leg-odd { animation: agy-leg-type-odd 0.14s infinite ease-in-out; }
      .agy-typing-mode .leg-even, .agy-patrol-mode .leg-even { animation: agy-leg-type-even 0.14s infinite ease-in-out; }
      .agy-typing-mode .puppy-ear { animation: agy-puppy-ear-perk 0.2s infinite alternate ease-in-out; }
      .agy-pixel-crisp { image-rendering: pixelated; shape-rendering: crispEdges; }
      .agy-msg-branch-btn:hover { background: rgba(255,255,255,0.12) !important; color: #4ade80 !important; }
      [data-agy-component="composer"], #antigravity\\.agentSidePanelInputBox { overflow: visible !important; }

      /* 🧪 方案 B：复古游戏风 · 魔力药水试管 / 温度计额度 HUD */
      @keyframes agy-mana-wave-sway {
        0%, 100% { transform: scaleY(1) translateY(0); }
        50% { transform: scaleY(1.4) translateY(-0.4px); }
      }
      @keyframes agy-mana-bubble-anim {
        0% { transform: translateY(0) scale(0.6); opacity: 0; }
        30% { opacity: 0.9; }
        80% { opacity: 0.7; }
        100% { transform: translateY(-18px) scale(1.1); opacity: 0; }
      }
      @keyframes agy-mana-vial-glow {
        0%, 100% { filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.4)); }
        50% { filter: drop-shadow(0 0 7px rgba(56, 189, 248, 0.85)); }
      }
      @keyframes agy-mana-vial-pop {
        0% { opacity: 0; transform: translateY(7px) scale(0.65); }
        70% { opacity: 1; transform: translateY(-2px) scale(1.06); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .agy-mana-bubble-1 { animation: agy-mana-bubble-anim 1.8s infinite ease-in; }
      .agy-mana-bubble-2 { animation: agy-mana-bubble-anim 2.2s 0.9s infinite ease-in; }
      .agy-mana-wave-surface { animation: agy-mana-wave-sway 2.4s infinite ease-in-out; }
      .agy-mana-vial-visible { animation: agy-mana-vial-pop 0.24s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards; }
    `;
    document.head.appendChild(style);
}

function triggerPetBlink() {
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const pupils = pet.querySelectorAll('.pupil-el');
    const blinks = pet.querySelectorAll('.blink-el');
    pupils.forEach(p => p.style.display = 'none');
    blinks.forEach(b => b.style.display = 'block');
    setTimeout(() => {
        pupils.forEach(p => p.style.display = '');
        blinks.forEach(b => b.style.display = 'none');
    }, 140);
}

function schedulePetBlink() {
    clearTimeout(agyBlinkTimer);
    const nextTime = Math.random() * 2500 + 2000;
    agyBlinkTimer = setTimeout(() => {
        triggerPetBlink();
        schedulePetBlink();
    }, nextTime);
}

function findAgyComposerContainer() {
    const sideInput = document.getElementById('antigravity.agentSidePanelInputBox');
    if (sideInput) {
        // 关键：在 sideInput 子元素中精准查找包含真实输入框（textarea 或 contenteditable）的容器！
        // 绝不能匹配到上方动态出现的「N 个文件已更改 / 审核」diff 卡片或辅助条
        const inputChild = Array.from(sideInput.children).find(c => {
            return c.querySelector('textarea, [contenteditable="true"]') !== null;
        });
        if (inputChild && inputChild.offsetParent !== null) return inputChild;

        // 排除包含审核按钮、diff、更改提示的子卡片
        const composerCandidates = Array.from(sideInput.children).filter(c => {
            const hasReviewBtn = c.querySelector('button[title*="审核"], button[aria-label*="审核"], [class*="diff"], [class*="change"]') !== null;
            if (hasReviewBtn && !c.querySelector('textarea, [contenteditable="true"]')) return false;
            return true;
        });

        const cardCandidate = composerCandidates.find(c => {
            return c.querySelector('[data-agy-control="send"], button[type="submit"]') ||
                   c.querySelector('[aria-label*="模型"], [aria-label*="Model"]') ||
                   String(c.className || '').includes('bg-card');
        });
        if (cardCandidate && cardCandidate.offsetParent !== null) return cardCandidate;

        // 兜底：取最后一个子元素 (真实输入栏永远位于整个区域底部)
        const lastChild = sideInput.lastElementChild;
        if (lastChild && lastChild.offsetParent !== null) return lastChild;
    }

    const textareas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 50 && rect.height > 15 && el.offsetParent !== null;
    });
    if (textareas.length > 0) {
        const ta = textareas[textareas.length - 1];
        let cur = ta.parentElement;
        let best = cur;
        for (let i = 0; i < 4 && cur && cur !== document.body; i++) {
            const cls = String(cur.className || '').toLowerCase();
            if (cls.includes('border') || cls.includes('rounded') || cls.includes('bg-card') || cur.tagName === 'FORM') {
                best = cur;
                break;
            }
            cur = cur.parentElement;
        }
        return best;
    }

    const agyComposer = document.querySelector('[data-agy-component="composer-inner"]') || document.querySelector('[data-agy-component="composer"]');
    if (agyComposer && agyComposer.offsetParent !== null && agyComposer.querySelector('textarea, [contenteditable="true"]')) return agyComposer;

    return null;
}

function applyAgyPetVisuals() {
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const sprite = pet.querySelector('#agy-pet-sprite');
    if (!sprite) return;

    const thinkingBubble = pet.querySelector('#agy-thinking-bubble');
    const miniKb = pet.querySelector('#mini-kb');
    const normalEyes = pet.querySelector('#agy-normal-eyes');
    const happyEyes = pet.querySelector('#agy-happy-eyes');
    const dizzyEyes = pet.querySelector('#agy-dizzy-eyes');
    const sleepEyes = pet.querySelector('#agy-sleep-eyes');
    const goggles = pet.querySelector('#agy-acc-goggles');
    const coffee = pet.querySelector('#agy-acc-coffee');
    const sprout = pet.querySelector('#agy-acc-sprout');
    const pupils = pet.querySelectorAll('.pupil-el');
    const celebrateBadge = pet.querySelector('#agy-celebrate-badge');

    if (thinkingBubble) {
        thinkingBubble.style.display = (agyAgentState === 'THINKING' && !agyIsSleeping) ? 'flex' : 'none';
    }

    if (celebrateBadge && agyAgentState !== 'SUCCESS') {
        celebrateBadge.style.display = 'none';
    }

    if (agyIsSleeping) {
        if (normalEyes) normalEyes.style.display = 'none';
        if (sleepEyes) sleepEyes.style.display = 'block';
        if (happyEyes) happyEyes.style.display = 'none';
        if (dizzyEyes) dizzyEyes.style.display = 'none';
    } else {
        if (sleepEyes) sleepEyes.style.display = 'none';
        if (normalEyes) normalEyes.style.display = (agyAgentState === 'SUCCESS' || agyAgentState === 'ERROR') ? 'none' : 'block';
        if (happyEyes) happyEyes.style.display = agyAgentState === 'SUCCESS' ? 'block' : 'none';
        if (dizzyEyes) dizzyEyes.style.display = agyAgentState === 'ERROR' ? 'block' : 'none';

        if (agyAgentState === 'THINKING') {
            pupils.forEach(p => p.style.transform = 'translate(0.3px, -0.9px)');
        } else if (agyAgentState !== 'CODING' && !agyIsTyping && !agyIsPeeking && !isDraggingPet) {
            pupils.forEach(p => p.style.transform = 'translate(0, 0)');
        }
    }

    if (miniKb) miniKb.style.display = (!agyIsSleeping && (agyIsTyping || agyAgentState === 'CODING')) ? 'block' : 'none';

    if (goggles) goggles.style.display = (agyCurrentAcc === 'goggles' || agyAgentState === 'CODING') ? 'block' : 'none';
    if (coffee) coffee.style.display = agyCurrentAcc === 'coffee' ? 'block' : 'none';
    if (sprout) sprout.style.display = agyCurrentAcc === 'sprout' ? 'block' : 'none';

    if (!agyIsSleeping && (agyAgentState === 'CODING' || agyIsTyping)) {
        sprite.classList.add('agy-typing-mode');
    } else {
        sprite.classList.remove('agy-typing-mode');
    }
}

function triggerPetCelebration() {
    if (agyIsSleeping) wakeAgyPetUp();
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const sprite = pet.querySelector('#agy-pet-sprite');
    if (!sprite) return;

    agyAgentState = 'SUCCESS';
    applyAgyPetVisuals();
    sprite.classList.add('agy-pet-celebrate-anim', 'agy-celebrating');
    playAgySuccessSound();

    // 浮现成就胶囊徽章
    const badge = pet.querySelector('#agy-celebrate-badge');
    if (badge) {
        badge.style.display = 'flex';
    }

    // 喷发真实抛物线彩带与花瓣雨
    const confettiContainer = pet.querySelector('#agy-confetti-container');
    if (confettiContainer) {
        confettiContainer.innerHTML = '';
        const colors = ['#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#a55eea', '#ff9ff3', '#feca57', '#00d2d3'];
        const shapes = ['ribbon', 'petal', 'star'];
        const count = 30;

        for (let i = 0; i < count; i++) {
            const piece = document.createElement('div');
            const color = colors[i % colors.length];
            const shape = shapes[i % shapes.length];

            const isLeft = i % 2 === 0;
            const arcDir = isLeft ? -1 : 1;
            const arcX = arcDir * (14 + Math.random() * 30);
            const peakY = -35 - Math.random() * 45;
            const driftX = (Math.random() - 0.5) * 45;
            const fallY = 12 + Math.random() * 32;

            const r1 = (Math.random() * 180 - 90) + 'deg';
            const r2 = (Math.random() * 360 - 180) + 'deg';
            const r3 = (Math.random() * 540 - 270) + 'deg';
            const r4 = (Math.random() * 720 - 360) + 'deg';

            const dur = (1.4 + Math.random() * 0.7).toFixed(2);
            const delay = (Math.random() * 0.16).toFixed(2);

            let shapeStyle = '';
            if (shape === 'ribbon') {
                shapeStyle = 'width:6px;height:3px;border-radius:1px;';
            } else if (shape === 'petal') {
                shapeStyle = 'width:5px;height:5px;border-radius:50%;';
            } else {
                shapeStyle = 'width:4px;height:4px;transform:rotate(45deg);border-radius:0.5px;';
            }

            piece.style.cssText = `position:absolute;left:50%;bottom:12px;${shapeStyle}background:${color};pointer-events:none;--arc-x:${arcX}px;--peak-y:${peakY}px;--drift-x:${driftX}px;--fall-y:${fallY}px;--rot-1:${r1};--rot-2:${r2};--rot-3:${r3};--rot-4:${r4};animation:agy-confetti-flutter ${dur}s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;box-shadow:0 1px 3px rgba(0,0,0,0.18);`;
            confettiContainer.appendChild(piece);
        }
        setTimeout(() => { confettiContainer.innerHTML = ''; }, 2500);
    }

    setTimeout(() => {
        sprite.classList.remove('agy-pet-celebrate-anim', 'agy-celebrating');
        if (badge) badge.style.display = 'none';
        agyAgentState = 'IDLE';
        applyAgyPetVisuals();
        resetAgyActivityTimer();
    }, 2500);
}

function showPetBubble(text) {
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const bubble = pet.querySelector('#agy-pet-bubble');
    if (bubble) {
        bubble.textContent = text;
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';
        setTimeout(() => {
            bubble.style.opacity = '0';
            bubble.style.transform = 'translateY(3px)';
        }, 1800);
    }
}

// 状态探测循环 (监听 Stop 按钮变换与工具调用)
setInterval(() => {
    const composer = findAgyComposerContainer();
    if (!composer) return;

    let isGenerating = false;
    const stopBtn = Array.from(composer.querySelectorAll('button')).find(btn => {
        const label = `${btn.getAttribute('aria-label') || ''} ${btn.getAttribute('title') || ''} ${(btn.textContent || '').trim()}`;
        return /停止|Stop|Cancel|取消/i.test(label) || btn.querySelector('svg [class*="stop"]');
    });
    if (stopBtn) isGenerating = true;

    if (isGenerating && !agyLastDetectedActive) {
        // 开始生成 / 推理
        if (agyIsSleeping) wakeAgyPetUp();
        if (agyIsPeeking) {
            clearTimeout(agyPeekTimer);
            agyIsPeeking = false;
            const pet = document.getElementById('agy-composer-pet');
            if (pet) {
                const sprite = pet.querySelector('#agy-pet-sprite');
                if (sprite) sprite.classList.remove('agy-pet-peeking');
            }
        }
        agyLastDetectedActive = true;
        const isTool = document.querySelector('[class*="terminal"], [class*="task-item"], [class*="tool-call"], [class*="executing"]') !== null;
        agyAgentState = isTool ? 'CODING' : 'THINKING';
        applyAgyPetVisuals();
        if (isTool) {
            showPetBubble('全力敲代码/运行工具 🥽!');
        }
    } else if (!isGenerating && agyLastDetectedActive) {
        // 生成结束 -> 触发完成撒花！
        agyLastDetectedActive = false;
        triggerPetCelebration();
    } else if (isGenerating) {
        if (agyIsSleeping) wakeAgyPetUp();
        const isTool = document.querySelector('[class*="terminal"], [class*="task-item"], [class*="tool-call"], [class*="executing"]') !== null;
        const targetState = isTool ? 'CODING' : 'THINKING';
        if (agyAgentState !== targetState && agyAgentState !== 'SUCCESS') {
            agyAgentState = targetState;
            applyAgyPetVisuals();
        }
    }
}, 400);

// ✨ 细节 1：漫步折返时的「探头驻足」微动作
let agyPatrolDir = 1;
let agyPeekTimer = null;
setInterval(() => {
    // ✨ 守卫自愈机制：若当前未处于拖拽与着陆反弹态，强制治愈任何卡住的悬空状态，防止空中漫步！
    const livePet = document.getElementById('agy-composer-pet');
    if (livePet && !isDraggingPet && !agyIsLanding) {
        const sprite = livePet.querySelector('#agy-pet-sprite');
        if (sprite && (sprite.classList.contains('agy-pet-lifted') || currentLiftY !== 0)) {
            currentLiftY = 0;
            sprite.classList.remove('agy-pet-lifted');
            sprite.style.transform = '';
            sprite.classList.add('agy-pet-idle-anim');
        }
    }

    if (!agyPatrolEnabled || agyIsTyping || agyAgentState !== 'IDLE' || agyIsSleeping || agyIsPeeking || isDraggingPet || agyIsLanding || currentLiftY !== 0) {
        const pet = document.getElementById('agy-composer-pet');
        if (pet) {
            const sprite = pet.querySelector('#agy-pet-sprite');
            if (sprite && !agyIsPeeking && !agyIsSleeping && !isDraggingPet && !agyIsLanding) sprite.classList.remove('agy-patrol-mode');
        }
        return;
    }

    const pet = document.getElementById('agy-composer-pet');
    const composer = findAgyComposerContainer();
    if (!pet || !composer) return;

    const maxOffset = Math.max(60, composer.clientWidth - 52);
    if (agyPetOffset > maxOffset) {
        agyPetOffset = maxOffset;
        pet.style.right = agyPetOffset + 'px';
    }
    if (agyPetOffset < 24) {
        agyPetOffset = 24;
        pet.style.right = agyPetOffset + 'px';
    }

    const isHitLeftEdge = (agyPetOffset >= maxOffset && agyPatrolDir === 1);
    const isHitRightEdge = (agyPetOffset <= 24 && agyPatrolDir === -1);

    if (isHitLeftEdge || isHitRightEdge) {
        agyIsPeeking = true;
        agyPetOffset = isHitLeftEdge ? maxOffset : 24;
        pet.style.right = agyPetOffset + 'px';
        const sprite = pet.querySelector('#agy-pet-sprite');
        if (sprite) {
            sprite.classList.remove('agy-patrol-mode');
            sprite.classList.add('agy-pet-peeking');
        }
        const pupils = pet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = 'translate(-0.4px, 0.9px)');

        clearTimeout(agyPeekTimer);
        agyPeekTimer = setTimeout(() => {
            // 变更方向并触发平滑转身
            agyPatrolDir = isHitLeftEdge ? -1 : 1;
            const flipper = pet.querySelector('#agy-pet-flipper');
            if (flipper) {
                flipper.style.transform = agyPatrolDir === 1 ? 'scaleX(1)' : 'scaleX(-1)';
            }
            if (sprite) {
                sprite.classList.remove('agy-pet-peeking');
                sprite.classList.add('agy-patrol-mode');
            }
            pupils.forEach(p => p.style.transform = 'translate(0, 0)');

            // 踏出安全距离，彻底避免下一 tick 再次卡入边缘判定死循环
            agyPetOffset = isHitLeftEdge ? (maxOffset - 4) : 28;
            pet.style.right = agyPetOffset + 'px';

            agyIsPeeking = false;
        }, 1400);
        return;
    }

    agyPetOffset += agyPatrolDir * 1.3;
    pet.style.right = agyPetOffset + 'px';
    const sprite = pet.querySelector('#agy-pet-sprite');
    if (sprite) sprite.classList.add('agy-patrol-mode');
}, 50);

// ✨ 细节 2：长时间挂机打瞌睡机制与唤醒
function triggerAgySleepMode() {
    if (agyAgentState !== 'IDLE' || agyIsTyping || isDraggingPet || agyIsSleeping || agyIsPeeking) return;
    agyIsSleeping = true;
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const sprite = pet.querySelector('#agy-pet-sprite');
    const zzz = pet.querySelector('#agy-sleep-zzz-container');
    if (sprite) {
        sprite.classList.remove('agy-pet-idle-anim', 'agy-patrol-mode');
        sprite.classList.add('agy-pet-sleeping');
    }
    if (zzz) zzz.style.display = 'block';
    applyAgyPetVisuals();
    showPetBubble('困意来袭... 准备小憩一会儿 💤');
}

function wakeAgyPetUp() {
    if (!agyIsSleeping) return;
    agyIsSleeping = false;
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const sprite = pet.querySelector('#agy-pet-sprite');
    const zzz = pet.querySelector('#agy-sleep-zzz-container');
    const wakeMark = pet.querySelector('#agy-wake-exclamation');

    if (zzz) zzz.style.display = 'none';
    if (wakeMark) {
        wakeMark.style.display = 'block';
        setTimeout(() => { if (wakeMark) wakeMark.style.display = 'none'; }, 600);
    }
    if (sprite) {
        sprite.classList.remove('agy-pet-sleeping');
        sprite.classList.add('agy-pet-waking');
        setTimeout(() => {
            if (sprite) {
                sprite.classList.remove('agy-pet-waking');
                sprite.classList.add('agy-pet-idle-anim');
            }
        }, 380);
    }
    applyAgyPetVisuals();
    playAgyPopSound();
    showPetBubble('唔！精神饱满，随时待命！⚡');
    resetAgyActivityTimer();
}

function resetAgyActivityTimer() {
    if (agyIsSleeping) {
        wakeAgyPetUp();
    }
    clearTimeout(agyIdleTimer);
    agyIdleTimer = setTimeout(() => {
        triggerAgySleepMode();
    }, 90000);
}

// ✨ 细节 3：消息发送瞬间的「助力推背感」
function triggerAgyLaunchPush() {
    if (agyIsSleeping) wakeAgyPetUp();
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const sprite = pet.querySelector('#agy-pet-sprite');
    if (!sprite || isDraggingPet) return;

    sprite.classList.remove('agy-pet-idle-anim', 'agy-patrol-mode', 'agy-pet-sleeping');
    sprite.classList.add('agy-pet-launching');
    playAgyPopSound();
    showPetBubble('给你的提示词加把劲！推~ 🚀');

    setTimeout(() => {
        if (sprite) sprite.classList.remove('agy-pet-launching');
    }, 650);
}

// 注入主逻辑
function injectComposerPet() {
    if (isDraggingPet || agyIsLanding) return; // 正在拖拽或落地反弹期间绝不重建或打断宠物！
    ensureAgyPetStyles();
    const composer = findAgyComposerContainer();
    if (!composer) return;

    let pet = document.getElementById('agy-composer-pet');
    if (pet && pet.parentElement === composer) return;
    if (pet) pet.remove();

    const cs = window.getComputedStyle(composer);
    if (cs.position === 'static') composer.style.position = 'relative';
    composer.style.overflow = 'visible';

    pet = document.createElement('div');
    pet.id = 'agy-composer-pet';
    pet.title = '小宠物：左键抚摸/拖拽工位，右键呼出控制胶囊~';
    pet.style.cssText = `position:absolute;bottom:100%;margin-bottom:-1px;right:${agyPetOffset}px;z-index:50;cursor:grab;user-select:none;display:flex;flex-direction:column;align-items:center;pointer-events:auto;`;

    pet.innerHTML = `
      <!-- ✨ 头顶悬浮思考云 (完全独立悬浮在头顶上方，绝不遮挡脸部与眼睛) -->
      <div id="agy-thinking-bubble" class="agy-thought-float" style="position:absolute;bottom:38px;right:-8px;z-index:55;pointer-events:none;display:none;flex-direction:column;align-items:flex-end;">
        <div style="background:rgba(15,23,42,0.92);border:1px solid rgba(56,189,248,0.5);border-radius:9999px;padding:2px 7px;box-shadow:0 4px 12px rgba(0,0,0,0.35);display:flex;align-items:center;gap:4px;backdrop-filter:blur(4px);">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" class="agy-spin-gear">
            <path d="M5 0.8 L6 0 L7 0 L8 0.8 L9.2 0.8 L9.6 1.8 L8.8 2.6 L9.2 3.8 L10.4 4.2 L10.4 5 L9.2 5.4 L8.8 6.6 L9.6 7.4 L9.2 8.4 L8 8.4 L7 9.2 L6 9.2 L5 8.4 L3.8 8.4 L3.4 7.4 L4.2 6.6 L3.8 5.4 L2.6 5 L2.6 4.2 L3.8 3.8 L4.2 2.6 L3.4 1.8 L3.8 0.8 L5 0.8 Z" fill="#38bdf8"/>
            <circle cx="6" cy="4.6" r="1.2" fill="#0f172a"/>
          </svg>
          <span style="font-size:10px;color:#7dd3fc;font-weight:600;letter-spacing:-0.2px;white-space:nowrap;">思考中...</span>
        </div>
        <div style="width:6px;height:6px;border-radius:50%;background:rgba(56,189,248,0.75);margin-top:2px;margin-right:12px;"></div>
        <div style="width:4px;height:4px;border-radius:50%;background:rgba(56,189,248,0.5);margin-top:2px;margin-right:18px;"></div>
      </div>
      <!-- 💤 漫画风 Zzz 飘浮气泡容器 -->
      <div id="agy-sleep-zzz-container" style="position:absolute;bottom:38px;right:-8px;pointer-events:none;display:none;z-index:56;">
        <span style="position:absolute;font-size:10px;font-weight:bold;color:#7dd3fc;font-family:sans-serif;animation:agy-zzz-float-anim 2.4s infinite ease-out;animation-delay:0s;">z</span>
        <span style="position:absolute;font-size:12px;font-weight:bold;color:#38bdf8;font-family:sans-serif;animation:agy-zzz-float-anim 2.4s infinite ease-out;animation-delay:0.8s;">Z</span>
        <span style="position:absolute;font-size:14px;font-weight:bold;color:#0284c7;font-family:sans-serif;animation:agy-zzz-float-anim 2.4s infinite ease-out;animation-delay:1.6s;">Z</span>
      </div>
      <!-- 惊醒感叹号 -->
      <div id="agy-wake-exclamation" style="position:absolute;bottom:42px;pointer-events:none;display:none;font-weight:900;color:#fbbf24;font-size:14px;z-index:60;text-shadow:0 0 6px rgba(251,191,36,0.6);animation:agy-wake-pop 0.5s forwards ease-out;">!</div>
      <div id="agy-pet-bubble" style="position:absolute;bottom:100%;margin-bottom:6px;padding:3px 9px;border-radius:6px;background:rgba(24,28,36,0.92);border:1px solid rgba(255,255,255,0.18);color:#f1f5f9;font-size:11px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;pointer-events:none;transition:all 0.2s ease;transform:translateY(3px);">戳我一下~</div>
      <div id="agy-heart-burst" style="position:absolute;bottom:100%;pointer-events:none;opacity:0;font-size:12px;">❤️</div>
      <div id="agy-confetti-container" style="position:absolute;bottom:12px;left:50%;transform:translateX(-50%);pointer-events:none;width:0;height:0;z-index:58;"></div>
      <div id="agy-celebrate-badge" class="agy-celebrate-badge" style="position:absolute;bottom:42px;white-space:nowrap;padding:3px 10px;border-radius:9999px;background:rgba(15,23,42,0.95);border:1px solid rgba(74,222,128,0.55);color:#4ade80;font-size:11px;font-weight:600;box-shadow:0 6px 18px rgba(0,0,0,0.4),0 0 12px rgba(74,222,128,0.25);pointer-events:none;z-index:60;display:none;align-items:center;gap:4px;"><span>✨ 任务圆满达成！🎉</span></div>

      <!-- 🧪 方案 B：复古游戏风 ·「魔力药水试管/温度计」额度 HUD (pointer-events: none) -->
      <div id="agy-pet-mana-hud" class="agy-pet-mana-hud" style="position:absolute;bottom:42px;right:-18px;pointer-events:none;display:none;align-items:flex-end;gap:7px;z-index:57;opacity:0;transition:all 0.22s cubic-bezier(0.18, 0.89, 0.32, 1.28);transform:translateY(4px) scale(0.95);">
        <!-- 像素魔力试管 (宽14px, 高32px) -->
        <div id="agy-mana-vial-box" style="display:flex;flex-direction:column;align-items:center;">
          <!-- 软木塞 -->
          <div style="width:10px;height:4px;background:#92400e;border-top-left-radius:2px;border-top-right-radius:2px;border:1px solid #78350f;box-shadow:0 1px 2px rgba(0,0,0,0.3);"></div>
          <!-- 试管外翻玻璃唇沿 -->
          <div style="width:14px;height:2px;background:rgba(203,213,225,0.7);border-radius:1px;box-shadow:0 1px 2px rgba(0,0,0,0.25);"></div>
          <!-- 玻璃试管身 -->
          <div style="position:relative;width:12px;height:30px;background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.6);border-top:none;border-bottom-left-radius:6px;border-bottom-right-radius:6px;overflow:hidden;backdrop-filter:blur(4px);display:flex;flex-direction:column;justify-content:flex-end;padding:2px;box-shadow:0 3px 10px rgba(0,0,0,0.45);">
            <!-- 微蚀刻度线 (25%, 50%, 75%) -->
            <div style="position:absolute;right:1px;bottom:25%;width:2.5px;height:1px;background:rgba(255,255,255,0.35);pointer-events:none;z-index:3;"></div>
            <div style="position:absolute;right:1px;bottom:50%;width:3.5px;height:1px;background:rgba(255,255,255,0.45);pointer-events:none;z-index:3;"></div>
            <div style="position:absolute;right:1px;bottom:75%;width:2.5px;height:1px;background:rgba(255,255,255,0.35);pointer-events:none;z-index:3;"></div>
            <!-- 内部药水液面 -->
            <div id="agy-mana-liquid-fill" style="width:100%;height:85%;background:linear-gradient(180deg, #38bdf8 0%, #0284c7 100%);border-bottom-left-radius:4px;border-bottom-right-radius:4px;transition:all 0.35s ease;position:relative;box-shadow:0 0 8px rgba(56,189,248,0.7);">
              <!-- 液面微波浪 -->
              <div id="agy-mana-wave-surface" class="agy-mana-wave-surface" style="position:absolute;top:-2px;left:0;right:0;height:4px;background:rgba(125,211,252,0.92);border-radius:9999px;"></div>
              <!-- 上浮微气泡 -->
              <div class="agy-mana-bubble-1" style="position:absolute;width:4px;height:4px;background:rgba(255,255,255,0.85);border-radius:50%;left:2px;bottom:4px;"></div>
              <div class="agy-mana-bubble-2" style="position:absolute;width:2.5px;height:2.5px;background:rgba(255,255,255,0.75);border-radius:50%;right:2px;bottom:9px;"></div>
            </div>
            <!-- 玻璃左侧高光条与管底反光 -->
            <div style="position:absolute;top:2px;left:2px;bottom:3px;width:2px;background:linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 100%);border-radius:9999px;pointer-events:none;z-index:2;"></div>
            <div style="position:absolute;bottom:1.5px;left:3px;right:3px;height:1.5px;background:rgba(255,255,255,0.3);border-radius:9999px;pointer-events:none;z-index:2;"></div>
          </div>
        </div>

        <!-- 伴随像素信息卡片 -->
        <div id="agy-mana-info-card" style="background:rgba(15,23,42,0.96);border:1px solid rgba(56,189,248,0.45);border-radius:8px;padding:4px 9px;box-shadow:0 8px 24px rgba(0,0,0,0.5),0 0 12px rgba(56,189,248,0.2);backdrop-filter:blur(8px);display:flex;flex-direction:column;gap:3px;white-space:nowrap;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;">
            <span id="agy-mana-pct-text" style="font-size:10.5px;color:#38bdf8;font-weight:700;letter-spacing:-0.2px;">✨ Gemini 85%</span>
            <span id="agy-mana-badge-label" style="font-size:9px;padding:0.5px 5px;border-radius:4px;background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);font-family:monospace;font-weight:600;">5h</span>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:9px;color:rgba(203,213,225,0.85);font-family:monospace;">
            <span id="agy-mana-reset-text">⏳ 2h 15m 后回满</span>
            <span id="agy-mana-weekly-text" style="color:rgba(148,163,184,0.9);display:none;">周 90%</span>
          </div>
        </div>
      </div>

      <div id="agy-pet-flipper" style="transform-origin:bottom center;transition:transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);transform:${agyPatrolDir === 1 ? 'scaleX(1)' : 'scaleX(-1)'};">
        <div id="agy-pet-sprite" class="agy-pet-idle-anim" style="transform-origin:bottom center;">
          ${AGY_PET_SVGS[agyCurrentPet] || AGY_PET_SVGS.octopus}
        </div>
      </div>
    `;

    // 🧪 方案 B：复古游戏风 · 魔力药水试管 / 温度计额度 HUD 控制器
    let agyManaHoverTimer = null;
    let agyIsManaHudShown = false;
    let agyCachedQuota = null;
    let agyQuotaCacheTime = 0;
    let agyIsFetchingQuota = false;
    let agyDragCooldownUntil = 0;

    async function fetchAgyCurrentQuota() {
        const now = Date.now();
        if (agyCachedQuota && (now - agyQuotaCacheTime < 60000)) {
            return agyCachedQuota;
        }
        if (agyIsFetchingQuota) return agyCachedQuota;
        agyIsFetchingQuota = true;
        try {
            if (typeof electron_1 !== 'undefined' && electron_1.ipcRenderer) {
                const accRes = await electron_1.ipcRenderer.invoke('accounts:list');
                const currentId = accRes ? accRes.currentAccountId : null;
                if (currentId) {
                    const qRes = await electron_1.ipcRenderer.invoke('fetch-account-quota', currentId);
                    if (qRes && qRes.success && qRes.quota) {
                        agyCachedQuota = qRes.quota;
                        agyQuotaCacheTime = Date.now();
                        try {
                            localStorage.setItem('agy-last-known-quota', JSON.stringify(agyCachedQuota));
                        } catch (_) {}
                        return agyCachedQuota;
                    }
                }
            }
        } catch (_) {} finally {
            agyIsFetchingQuota = false;
        }
        if (!agyCachedQuota) {
            try {
                const saved = localStorage.getItem('agy-last-known-quota');
                if (saved) agyCachedQuota = JSON.parse(saved);
            } catch (_) {}
        }
        return agyCachedQuota;
    }

    function formatAgyResetCountdown(isoStr) {
        if (!isoStr) return '';
        try {
            const target = new Date(isoStr);
            const now = new Date();
            const diffMs = target - now;
            if (diffMs <= 0) return '';
            const diffMins = Math.round(diffMs / 60000);
            if (diffMins < 60) return `${diffMins}m`;
            const diffHours = Math.floor(diffMins / 60);
            const remMins = diffMins % 60;
            if (diffHours < 24) return `${diffHours}h ${remMins}m`;
            const diffDays = Math.floor(diffHours / 24);
            const remHours = diffHours % 24;
            return `${diffDays}d ${remHours}h`;
        } catch (_) { return ''; }
    }

    function updateAgyManaHudVisuals(quotaData) {
        const fill = pet.querySelector('#agy-mana-liquid-fill');
        const wave = pet.querySelector('#agy-mana-wave-surface');
        const pctText = pet.querySelector('#agy-mana-pct-text');
        const resetText = pet.querySelector('#agy-mana-reset-text');
        const weeklyText = pet.querySelector('#agy-mana-weekly-text');
        const badge = pet.querySelector('#agy-mana-badge-label');
        const infoCard = pet.querySelector('#agy-mana-info-card');
        if (!fill || !pctText) return;

        let pct = 85;
        let resetCountdown = '';
        if (quotaData && quotaData.gemini5h) {
            const num = parseInt(quotaData.gemini5h, 10);
            if (!isNaN(num)) pct = num;
            if (quotaData.gemini5hReset) {
                resetCountdown = formatAgyResetCountdown(quotaData.gemini5hReset);
            }
        }

        fill.style.height = `${pct}%`;
        if (pct >= 50) {
            fill.style.background = 'linear-gradient(180deg, #38bdf8 0%, #0284c7 100%)';
            fill.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.7)';
            if (wave) wave.style.background = 'rgba(125, 211, 252, 0.95)';
            if (pctText) { pctText.style.color = '#38bdf8'; pctText.textContent = `✨ Gemini ${pct}%`; }
            if (badge) { badge.style.color = '#38bdf8'; badge.style.background = 'rgba(56, 189, 248, 0.2)'; badge.textContent = '5h'; }
            if (infoCard) infoCard.style.borderColor = 'rgba(56, 189, 248, 0.45)';
        } else if (pct >= 20) {
            fill.style.background = 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)';
            fill.style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.7)';
            if (wave) wave.style.background = 'rgba(253, 230, 138, 0.95)';
            if (pctText) { pctText.style.color = '#fbbf24'; pctText.textContent = `⚡ Gemini ${pct}%`; }
            if (badge) { badge.style.color = '#fbbf24'; badge.style.background = 'rgba(251, 191, 36, 0.2)'; badge.textContent = '5h 适中'; }
            if (infoCard) infoCard.style.borderColor = 'rgba(251, 191, 36, 0.45)';
        } else {
            fill.style.background = 'linear-gradient(180deg, #f43f5e 0%, #be123c 100%)';
            fill.style.boxShadow = '0 0 8px rgba(244, 63, 94, 0.7)';
            if (wave) wave.style.background = 'rgba(253, 164, 175, 0.95)';
            if (pctText) { pctText.style.color = '#f43f5e'; pctText.textContent = `⚠️ Gemini ${pct}%`; }
            if (badge) { badge.style.color = '#f43f5e'; badge.style.background = 'rgba(244, 63, 94, 0.2)'; badge.textContent = '告急'; }
            if (infoCard) infoCard.style.borderColor = 'rgba(244, 63, 94, 0.45)';
        }

        if (resetText) {
            if (pct === 100) resetText.textContent = '✨ 魔力充盈待命中';
            else if (resetCountdown) resetText.textContent = `⏳ ${resetCountdown} 后回满`;
            else resetText.textContent = '⚡ 实时额度在线';
        }

        if (weeklyText) {
            if (quotaData && quotaData.geminiWeekly) {
                const wPct = parseInt(quotaData.geminiWeekly, 10);
                if (!isNaN(wPct)) {
                    weeklyText.style.display = 'inline';
                    weeklyText.textContent = `周余量 ${wPct}%`;
                }
            } else {
                weeklyText.style.display = 'none';
            }
        }
    }

    function showAgyManaHud() {
        if (isDraggingPet || agyIsSleeping || agyIsPeeking || agyAgentState === 'THINKING' || agyAgentState === 'SUCCESS') return;
        const hud = pet.querySelector('#agy-pet-mana-hud');
        if (!hud) return;
        agyIsManaHudShown = true;
        hud.style.display = 'flex';
        hud.style.opacity = '1';
        hud.style.transform = 'translateY(0) scale(1)';
        hud.classList.add('agy-mana-vial-visible');

        // 方向感知眼神追踪：在翻转层 scaleX(-1) 时自动取反补偿，保证瞳孔始终精准仰视魔力管！
        const pupilX = (agyPatrolDir === 1) ? 0.6 : -0.6;
        const pupils = pet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = `translate(${pupilX}px, -0.7px)`);

        fetchAgyCurrentQuota().then(data => updateAgyManaHudVisuals(data));
    }

    function hideAgyManaHud(instant = false) {
        clearTimeout(agyManaHoverTimer);
        const hud = pet.querySelector('#agy-pet-mana-hud');
        if (!hud) return;
        agyIsManaHudShown = false;
        hud.classList.remove('agy-mana-vial-visible');
        hud.style.opacity = '0';
        hud.style.transform = 'translateY(4px) scale(0.95)';
        if (instant) {
            hud.style.display = 'none';
        } else {
            setTimeout(() => {
                if (!agyIsManaHudShown && hud) hud.style.display = 'none';
            }, 220);
        }

        if (!isDraggingPet && !agyIsTyping && !agyIsSleeping) {
            const pupils = pet.querySelectorAll('.pupil-el');
            pupils.forEach(p => p.style.transform = 'translate(0, 0)');
        }
    }

    pet.addEventListener('mouseenter', () => {
        if (isDraggingPet || agyIsSleeping || agyIsPeeking || agyAgentState === 'THINKING' || agyAgentState === 'SUCCESS') return;
        if (Date.now() < agyDragCooldownUntil) return; // 拖拽落地回弹保护期防误触
        clearTimeout(agyManaHoverTimer);
        agyManaHoverTimer = setTimeout(showAgyManaHud, 280); // 280ms 意图防抖
    });

    pet.addEventListener('mouseleave', () => {
        clearTimeout(agyManaHoverTimer);
        hideAgyManaHud(false);
    });

    // ✨ 细节 4：拖拽工位「悬空挣扎与软泥落水感」(五重安全防护架构)
    let agyActivePointerId = null;

    function createAgyDragShield() {
        if (document.getElementById('agy-drag-shield')) return;
        const shield = document.createElement('div');
        shield.id = 'agy-drag-shield';
        // 全局全屏透明防护罩，层级置顶，隔离底层所有 Monaco / iframes / webviews / diff 审查条的事件拦截与吞噬
        shield.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483640;cursor:grabbing;background:transparent;user-select:none;-webkit-user-select:none;pointer-events:auto !important;';
        document.body.appendChild(shield);

        shield.addEventListener('pointermove', onPetDragMove, { capture: true });
        shield.addEventListener('mousemove', onPetDragMove, { capture: true });
        shield.addEventListener('pointerup', handlePetDragEnd, { capture: true });
        shield.addEventListener('mouseup', handlePetDragEnd, { capture: true });
        shield.addEventListener('pointercancel', handlePetDragEnd, { capture: true });
    }

    function removeAgyDragShield() {
        const shield = document.getElementById('agy-drag-shield');
        if (shield) shield.remove();
    }

    pet.addEventListener('dragstart', (e) => e.preventDefault());

    function getLiveAgyPet() {
        return document.getElementById('agy-composer-pet');
    }

    function onPetDragStart(e) {
        if (e.button !== 0) return; // 仅响应左键
        e.preventDefault();
        e.stopPropagation();

        const curPet = getLiveAgyPet() || pet;

        // 异常自愈：若前次处于拖拽遗留态，再次点击直接触发平稳就地吸附
        if (isDraggingPet) {
            handlePetDragEnd(e);
            return;
        }

        if (agyIsLanding) return; // 落地 Q 弹缓冲中忽略重复抓取
        clearTimeout(agyManaHoverTimer);
        hideAgyManaHud(true); // 0ms 瞬间销毁/隐藏魔力试管，拖拽期间绝对不显示

        if (agyIsSleeping) wakeAgyPetUp();
        if (agyIsPeeking) {
            clearTimeout(agyPeekTimer);
            agyIsPeeking = false;
            const sprite = curPet.querySelector('#agy-pet-sprite');
            if (sprite) sprite.classList.remove('agy-pet-peeking');
        }

        isDraggingPet = true;
        agyActivePointerId = (e.pointerId !== undefined && e.pointerId !== null) ? e.pointerId : null;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragLastX = e.clientX;
        dragLastY = e.clientY;
        dragStartOffset = agyPetOffset;
        dragMovedDistance = 0;
        currentLiftY = -12;
        curPet.style.cursor = 'grabbing';

        // Layer 1: 指针原生捕获
        if (agyActivePointerId !== null && typeof curPet.setPointerCapture === 'function') {
            try {
                curPet.setPointerCapture(agyActivePointerId);
            } catch (_) {}
        }

        // Layer 2: 挂载全屏防吞噬透明防护罩
        createAgyDragShield();

        // 动态绑定全局拖拽事件（单例绑定，避免多次 inject 导致闭包堆叠）
        window.addEventListener('pointermove', onPetDragMove, { capture: true, passive: true });
        window.addEventListener('mousemove', onPetDragMove, { capture: true, passive: true });
        window.addEventListener('pointerup', handlePetDragEnd, { capture: true });
        window.addEventListener('mouseup', handlePetDragEnd, { capture: true });
        window.addEventListener('pointercancel', handlePetDragEnd, { capture: true });
        window.addEventListener('blur', handlePetDragEnd, { capture: true });
        document.addEventListener('mouseleave', handlePetDragEnd, { capture: true });

        const sprite = curPet.querySelector('#agy-pet-sprite');
        if (sprite) {
            sprite.classList.remove('agy-pudding-landing', 'agy-pet-idle-anim', 'agy-patrol-mode');
            sprite.classList.add('agy-pet-lifted');
            sprite.style.transform = 'translateY(-12px) scale(0.86, 1.18)';
        }
        const pupils = curPet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = 'translate(0, 0.8px)');
    }

    function onPetDragMove(e) {
        if (!isDraggingPet) return;

        // Layer 5: 移动位掩码守卫 (检测到左键早已松开但事件被任何层吃掉，立即自愈落地)
        if (e.buttons !== undefined && (e.buttons & 1) === 0) {
            handlePetDragEnd(e);
            return;
        }

        const curPet = getLiveAgyPet();
        if (!curPet) {
            handlePetDragEnd(e);
            return;
        }

        const deltaX = dragStartX - e.clientX;
        const moveStep = Math.hypot(e.clientX - dragLastX, e.clientY - dragLastY);
        dragMovedDistance += moveStep;

        const comp = findAgyComposerContainer();
        const maxOffset = Math.max(60, (comp ? comp.clientWidth : 300) - 52);
        agyPetOffset = Math.max(24, Math.min(maxOffset, dragStartOffset + deltaX));
        curPet.style.right = agyPetOffset + 'px';

        // 真实果冻弹性拔高 (前 40px 等比，随后阻尼衰减，软上限 75px，绝不飘出工作区)
        const pullUp = Math.max(0, dragStartY - e.clientY);
        let liftY = 0;
        if (pullUp > 0) {
            if (pullUp <= 40) {
                liftY = -pullUp;
            } else {
                liftY = -(40 + Math.sqrt(pullUp - 40) * 4.2);
            }
            liftY = Math.max(-75, liftY);
        }
        currentLiftY = liftY;

        // 水平移动速度倾角
        const speedX = e.clientX - dragLastX;
        dragLastX = e.clientX;
        dragLastY = e.clientY;
        const tilt = Math.max(-14, Math.min(14, speedX * 1.5));

        const sprite = curPet.querySelector('#agy-pet-sprite');
        if (sprite) {
            sprite.style.transform = `translateY(${liftY}px) scale(0.86, 1.18) rotate(${tilt}deg)`;
        }
    }

    function handlePetDragEnd(e) {
        if (!isDraggingPet) return;
        isDraggingPet = false;

        // 卸载全局监听，防止多次注入内存泄漏与事件冲突
        window.removeEventListener('pointermove', onPetDragMove, { capture: true });
        window.removeEventListener('mousemove', onPetDragMove, { capture: true });
        window.removeEventListener('pointerup', handlePetDragEnd, { capture: true });
        window.removeEventListener('mouseup', handlePetDragEnd, { capture: true });
        window.removeEventListener('pointercancel', handlePetDragEnd, { capture: true });
        window.removeEventListener('blur', handlePetDragEnd, { capture: true });
        document.removeEventListener('mouseleave', handlePetDragEnd, { capture: true });

        removeAgyDragShield();

        const curPet = getLiveAgyPet() || pet;
        if (curPet) {
            curPet.style.cursor = 'grab';
            if (agyActivePointerId !== null && typeof curPet.releasePointerCapture === 'function') {
                try {
                    curPet.releasePointerCapture(agyActivePointerId);
                } catch (_) {}
            }
        }
        agyActivePointerId = null;

        localStorage.setItem('agy-pet-offset', String(Math.round(agyPetOffset)));

        if (!curPet) {
            currentLiftY = 0;
            return;
        }

        const pupils = curPet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = 'translate(0, 0)');

        if (dragMovedDistance < 5) {
            // 点击抚摸
            agyIsLanding = false;
            currentLiftY = 0;
            const sprite = curPet.querySelector('#agy-pet-sprite');
            if (sprite) {
                sprite.classList.remove('agy-pet-lifted', 'agy-pudding-landing');
                sprite.style.transform = '';
            }
            handlePetClick();
        } else {
            // 真实释放：就地落水软泥吸附！
            agyIsLanding = true; // 锁定原地着陆状态，落地完成前彻底禁止漫步位移
            agyDragCooldownUntil = Date.now() + 650; // 落地反弹期间锁定禁用 hover

            const sprite = curPet.querySelector('#agy-pet-sprite');
            if (sprite) {
                const dropFrom = currentLiftY < -4 ? currentLiftY : -14;
                currentLiftY = 0; // 落地触发时立即清零 liftY
                sprite.style.setProperty('--drop-from-y', `${dropFrom}px`);
                sprite.style.transform = '';
                sprite.classList.remove('agy-pet-lifted', 'agy-patrol-mode');
                sprite.classList.add('agy-pudding-landing');
                setTimeout(() => {
                    const live = getLiveAgyPet();
                    if (live) {
                        const s = live.querySelector('#agy-pet-sprite');
                        if (s) {
                            s.classList.remove('agy-pudding-landing');
                            s.classList.add('agy-pet-idle-anim');
                            s.style.transform = '';
                        }
                    }
                    agyIsLanding = false; // 着陆 Q 弹吸附彻底完成后，才解除锁定，恢复正常巡逻
                }, 550);
            } else {
                currentLiftY = 0;
                agyIsLanding = false;
            }

            playAgyDropSound();
            showPetBubble('呼~ 软泥吸附好啦 🛋️');
        }
    }

    pet.addEventListener('pointerdown', onPetDragStart);
    pet.addEventListener('mousedown', onPetDragStart);
    pet.addEventListener('lostpointercapture', handlePetDragEnd);

    function handlePetClick() {
        if (agyIsPetBouncing) return;
        agyIsPetBouncing = true;
        const sprite = pet.querySelector('#agy-pet-sprite');
        const heart = pet.querySelector('#agy-heart-burst');

        sprite.className = 'agy-pet-bounce-anim';
        triggerPetBlink();
        playAgyPopSound();
        if (heart) {
            heart.style.animation = 'none';
            heart.offsetHeight;
            heart.style.animation = 'agy-heart-float-pro 0.8s forwards ease-out';
        }
        const phrases = ['今天写代码超顺！', '灵感爆发啦~', '摸摸头，零Bug！', '代码写得超棒！', '专注冲刺中！'];
        showPetBubble(phrases[Math.floor(Math.random() * phrases.length)]);

        setTimeout(() => {
            sprite.className = 'agy-pet-idle-anim';
            agyIsPetBouncing = false;
        }, 550);
    }

    // 右键打开胶囊微菜单
    pet.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPetContextMenu(e.clientX, e.clientY);
    });

    composer.appendChild(pet);
    schedulePetBlink();
    applyAgyPetVisuals();
    resetAgyActivityTimer();
}

/* --- 右键胶囊菜单实现 --- */
function ensurePetContextMenu() {
    if (document.getElementById('agy-pet-context-menu')) return;
    const menu = document.createElement('div');
    menu.id = 'agy-pet-context-menu';
    menu.style.cssText = 'position:fixed;background:rgba(20,24,33,0.96);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-radius:12px;padding:10px 12px;box-shadow:0 16px 40px rgba(0,0,0,0.55);font-size:12px;color:#f1f5f9;z-index:2147483647;display:none;flex-direction:column;gap:8px;width:196px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
    
    menu.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:between;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;font-size:11px;font-weight:600;color:#94a3b8;">
        <span>🐾 宠物控制胶囊</span>
        <span style="color:#4ade80;font-size:10px;margin-left:auto;">PRO</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:10px;color:#94a3b8;">形态选择：</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <button id="menu-btn-oct" style="padding:4px 6px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:11px;">🐙 小章鱼</button>
          <button id="menu-btn-pup" style="padding:4px 6px;border-radius:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#fff;cursor:pointer;font-size:11px;">🐶 线条狗</button>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
        <label style="font-size:10px;color:#94a3b8;">配饰切换：</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
          <button id="menu-acc-none" style="padding:3px 5px;border-radius:6px;background:rgba(255,255,255,0.05);border:none;color:#cbd5e1;cursor:pointer;font-size:10px;">🚫 无</button>
          <button id="menu-acc-gog" style="padding:3px 5px;border-radius:6px;background:rgba(255,255,255,0.05);border:none;color:#cbd5e1;cursor:pointer;font-size:10px;">🥽 护目镜</button>
          <button id="menu-acc-cof" style="padding:3px 5px;border-radius:6px;background:rgba(255,255,255,0.05);border:none;color:#cbd5e1;cursor:pointer;font-size:10px;">☕ 咖啡杯</button>
          <button id="menu-acc-spr" style="padding:3px 5px;border-radius:6px;background:rgba(255,255,255,0.05);border:none;color:#cbd5e1;cursor:pointer;font-size:10px;">🌱 小豆芽</button>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
        <span style="font-size:11px;color:#cbd5e1;">🚶 顶边漫步</span>
        <button id="menu-patrol-btn" style="padding:2px 8px;border-radius:6px;border:none;background:rgba(74,222,128,0.2);color:#4ade80;cursor:pointer;font-size:10px;font-weight:600;">${agyPatrolEnabled ? '开启中' : '已停用'}</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
        <span style="font-size:11px;color:#cbd5e1;">🔊 治愈音效</span>
        <button id="menu-sound-btn" style="padding:2px 8px;border-radius:6px;border:none;background:rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;font-size:10px;font-weight:600;">${agySoundEnabled ? '已开启' : '已静音'}</button>
      </div>
    `;

    document.body.appendChild(menu);

    menu.querySelector('#menu-btn-oct').onclick = () => { changePetShape('octopus'); closePetContextMenu(); };
    menu.querySelector('#menu-btn-pup').onclick = () => { changePetShape('puppy'); closePetContextMenu(); };
    menu.querySelector('#menu-acc-none').onclick = () => { changePetAcc('none'); closePetContextMenu(); };
    menu.querySelector('#menu-acc-gog').onclick = () => { changePetAcc('goggles'); closePetContextMenu(); };
    menu.querySelector('#menu-acc-cof').onclick = () => { changePetAcc('coffee'); closePetContextMenu(); };
    menu.querySelector('#menu-acc-spr').onclick = () => { changePetAcc('sprout'); closePetContextMenu(); };

    const patrolBtn = menu.querySelector('#menu-patrol-btn');
    patrolBtn.onclick = () => {
        agyPatrolEnabled = !agyPatrolEnabled;
        localStorage.setItem('agy-pet-patrol', String(agyPatrolEnabled));
        patrolBtn.textContent = agyPatrolEnabled ? '开启中' : '已停用';
        patrolBtn.style.color = agyPatrolEnabled ? '#4ade80' : '#94a3b8';
        patrolBtn.style.background = agyPatrolEnabled ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)';
        showPetBubble(agyPatrolEnabled ? '已开启顶边巡逻漫步~' : '已停用漫步，原地休息~');
        closePetContextMenu();
    };

    const soundBtn = menu.querySelector('#menu-sound-btn');
    soundBtn.onclick = () => {
        agySoundEnabled = !agySoundEnabled;
        localStorage.setItem('agy-pet-sound', String(agySoundEnabled));
        soundBtn.textContent = agySoundEnabled ? '已开启' : '已静音';
        soundBtn.style.color = agySoundEnabled ? '#4ade80' : '#94a3b8';
        soundBtn.style.background = agySoundEnabled ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)';
        if (agySoundEnabled) playAgyPopSound();
        showPetBubble(agySoundEnabled ? '治愈微音效已开启 🔊' : '音效已静音 🔇');
        closePetContextMenu();
    };
}

function openPetContextMenu(x, y) {
    ensurePetContextMenu();
    const menu = document.getElementById('agy-pet-context-menu');
    if (!menu) return;
    menu.style.left = Math.min(window.innerWidth - 210, Math.max(10, x - 10)) + 'px';
    menu.style.top = Math.max(10, y - 220) + 'px';
    menu.style.display = 'flex';
}

function closePetContextMenu() {
    const menu = document.getElementById('agy-pet-context-menu');
    if (menu) menu.style.display = 'none';
}

window.addEventListener('click', (e) => {
    if (!e.target.closest('#agy-pet-context-menu')) closePetContextMenu();
});

function changePetShape(type) {
    agyCurrentPet = type;
    localStorage.setItem('agy-pet-type', type);
    const pet = document.getElementById('agy-composer-pet');
    if (pet) {
        const sprite = pet.querySelector('#agy-pet-sprite');
        if (sprite) sprite.innerHTML = AGY_PET_SVGS[type] || AGY_PET_SVGS.octopus;
        applyAgyPetVisuals();
        playAgyPopSound();
        showPetBubble('形态变身：' + (type === 'octopus' ? '小章鱼 🐙' : '线条小狗 🐶'));
    }
}

function changePetAcc(acc) {
    agyCurrentAcc = acc;
    localStorage.setItem('agy-pet-acc', acc);
    applyAgyPetVisuals();
    playAgyPopSound();
    showPetBubble('配饰更换：' + (acc === 'none' ? '原汁原味' : acc));
}

/* --- 视线随鼠标光标动态追踪 --- */
window.addEventListener('mousemove', (e) => {
    resetAgyActivityTimer();
    if (agyIsTyping || agyAgentState === 'THINKING' || agyIsSleeping || agyIsPeeking || isDraggingPet) return;
    const pet = document.getElementById('agy-composer-pet');
    if (!pet) return;
    const rect = pet.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    const offsetX = Math.max(-0.8, Math.min(0.8, (dx / dist) * 0.8));
    const offsetY = Math.max(-0.7, Math.min(0.7, (dy / dist) * 0.7));

    const pupils = pet.querySelectorAll('.pupil-el');
    pupils.forEach(p => {
        p.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
    });
});

/* --- 打字状态：触手敲键盘 + 低头看输入框 --- */
window.addEventListener('input', (e) => {
    resetAgyActivityTimer();
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable)) {
        const pet = document.getElementById('agy-composer-pet');
        if (!pet) return;
        const sprite = pet.querySelector('#agy-pet-sprite');
        const miniKb = pet.querySelector('#mini-kb');
        if (!sprite || agyIsPetBouncing || isDraggingPet || agyIsSleeping) return;

        if (agyIsPeeking) {
            clearTimeout(agyPeekTimer);
            agyIsPeeking = false;
            sprite.classList.remove('agy-pet-peeking');
        }

        agyIsTyping = true;
        sprite.classList.add('agy-typing-mode');
        if (miniKb) miniKb.style.display = 'block';

        const pupils = pet.querySelectorAll('.pupil-el');
        pupils.forEach(p => {
            p.style.transform = 'translate(0px, 0.8px)';
        });

        clearTimeout(agyPetTypingTimer);
        agyPetTypingTimer = setTimeout(() => {
            agyIsTyping = false;
            if (!agyIsPetBouncing && sprite && !isDraggingPet) {
                sprite.classList.remove('agy-typing-mode');
                if (miniKb) miniKb.style.display = 'none';
            }
        }, 700);
    }
}, true);

/* --- 消息发送事件监听：回车或发送按钮点击触发助力推背感 --- */
window.addEventListener('keydown', (e) => {
    resetAgyActivityTimer();
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable)) {
            triggerAgyLaunchPush();
        }
    }
}, true);

document.addEventListener('click', (e) => {
    resetAgyActivityTimer();
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.classList.contains('agy-msg-branch-btn') || btn.id === 'agy-branch-btn' || btn.closest('#agy-composer-pet') || btn.closest('#agy-pet-context-menu')) return;
    const composer = findAgyComposerContainer();
    if (composer && composer.contains(btn)) {
        const title = ((btn.getAttribute('title') || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).toLowerCase();
        if (/发送|send|submit/i.test(title) || btn.type === 'submit' || btn.querySelector('svg path[d*="M2.01"]')) {
            triggerAgyLaunchPush();
        }
    }
}, true);
