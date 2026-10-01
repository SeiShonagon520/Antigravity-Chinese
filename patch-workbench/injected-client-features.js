function scheduleSemanticUpdate() {
    clearTimeout(semanticTimer);
    semanticTimer = setTimeout(() => {
        annotateSemanticDom();
        injectBranchButton();
        injectComposerPet();
        injectMessageBranchButtons();
    }, 70);
}

function getCurrentConversationId() {
    const match = (location.hash || location.pathname || '').match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    return match ? match[1] : '';
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
    for (let i = 0; i < 5 && cur && cur !== document.body; i++) {
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
    text = text.replace(/(Copy|复制|分支|Branch|🌿|重试|Retry|赞|踩)/g, '').trim();
    const snippet = text.slice(0, 100);

    let turnIndex = 0;
    if (turnContainer && turnContainer.parentElement) {
        const siblings = Array.from(turnContainer.parentElement.children).filter(el => {
            return el.querySelector('.agy-msg-branch-btn') || el === turnContainer;
        });
        turnIndex = siblings.indexOf(turnContainer);
    }

    return { snippet, turnIndex };
}

function openBranchModal(options = {}) {
    if (document.getElementById('agy-branch-modal')) return;

    let currentTitle = '当前对话';
    const titleEl = document.querySelector('header h1, header h2, [class*="header"] h1, [class*="header"] h2, [class*="title-bar"] h1, [class*="title-bar"] h2, header div, main h1, main h2');
    if (titleEl && titleEl.textContent) {
        const txt = titleEl.textContent.trim();
        if (txt && txt.length < 80 && !txt.includes('Open IDE')) currentTitle = txt;
    }

    const currentId = options.sourceId || getCurrentConversationId();
    const snippet = options.snippet || '';
    const turnIndex = options.turnIndex !== undefined && options.turnIndex !== null ? options.turnIndex : null;

    let defaultBranchTitle = `${currentTitle} (分支)`;
    if (turnIndex !== null && turnIndex >= 0) {
        defaultBranchTitle = `${currentTitle} (第 ${turnIndex + 1} 轮分支)`;
    }

    const modal = document.createElement('div');
    modal.id = 'agy-branch-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
    
    const previewHtml = snippet ? `
      <div style="display:flex;flex-direction:column;gap:4px;">
        <label style="font-size:11px;font-weight:500;color:#94a3b8;">分叉历史截断点：</label>
        <div style="font-size:11px;color:#cbd5e1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:7px 10px;border-radius:8px;max-height:54px;overflow:hidden;line-height:1.4;">"${snippet.replace(/"/g, '&quot;')}"</div>
      </div>
    ` : '';

    modal.innerHTML = `
      <div style="background:rgba(24,28,36,0.96);color:#f1f5f9;border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:22px 24px;width:400px;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:8px;background:rgba(34,197,94,0.15);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:16px;">🌿</div>
          <div>
            <h3 style="margin:0;font-size:15px;font-weight:600;color:#f8fafc;">新建对话分支</h3>
            <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">${snippet ? '从此条消息分叉，开启独立探索分支' : '克隆当前上下文并创建平行独立的新会话'}</p>
          </div>
        </div>
        ${previewHtml}
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:2px;">
          <label style="font-size:12px;font-weight:500;color:#cbd5e1;">分支会话标题：</label>
          <input id="agy-branch-title-input" type="text" value="${defaultBranchTitle.replace(/"/g, '&quot;')}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none;" />
        </div>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
          <button id="agy-branch-cancel" type="button" style="padding:7px 15px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;">取消</button>
          <button id="agy-branch-submit" type="button" style="padding:7px 18px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;font-size:12px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">确认创建</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = document.getElementById('agy-branch-title-input');
    const btnCancel = document.getElementById('agy-branch-cancel');
    const btnSubmit = document.getElementById('agy-branch-submit');

    input.focus();
    input.select();

    const closeModal = () => modal.remove();
    btnCancel.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    btnSubmit.addEventListener('click', async () => {
      const branchTitle = input.value.trim() || defaultBranchTitle;
      btnSubmit.disabled = true;
      btnSubmit.textContent = '正在克隆...';
      btnSubmit.style.opacity = '0.7';

      try {
        const res = await electron_1.ipcRenderer.invoke('agy:branch-conversation', {
          sourceId: currentId,
          title: branchTitle,
          turnIndex: turnIndex,
          snippet: snippet
        });
        closeModal();
        if (res && res.success) {
          showBranchToast('🌿 分支「' + branchTitle + '」创建成功！已自动置顶在左侧会话列表中');
        } else {
          alert('创建分支失败: ' + (res && res.error ? res.error : '未知错误'));
        }
      } catch (err) {
        closeModal();
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

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        openBranchModal();
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
      @keyframes agy-mana-bubble-anim {
        0% { transform: translateY(0) scale(0.6); opacity: 0; }
        40% { opacity: 0.85; }
        100% { transform: translateY(-16px) scale(1.1); opacity: 0; }
      }
      @keyframes agy-mana-vial-glow {
        0%, 100% { filter: drop-shadow(0 0 2px rgba(56, 189, 248, 0.4)); }
        50% { filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.8)); }
      }
      @keyframes agy-mana-vial-pop {
        0% { opacity: 0; transform: translateY(6px) scale(0.7); }
        70% { opacity: 1; transform: translateY(-2px) scale(1.05); }
        100% { opacity: 1; transform: translateY(0) scale(1); }
      }
      .agy-mana-bubble-1 { animation: agy-mana-bubble-anim 1.8s infinite ease-in; }
      .agy-mana-bubble-2 { animation: agy-mana-bubble-anim 2.2s 0.9s infinite ease-in; }
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
        const inner = Array.from(sideInput.children).find(c => String(c.className || '').includes('bg-card')) || sideInput.firstElementChild || sideInput;
        if (inner && inner.offsetParent !== null) return inner;
    }
    const agyComposer = document.querySelector('[data-agy-component="composer-inner"]') || document.querySelector('[data-agy-component="composer"]');
    if (agyComposer && agyComposer.offsetParent !== null) return agyComposer;

    const textareas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]')).filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 50 && rect.height > 15;
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
    if (!agyPatrolEnabled || agyIsTyping || agyAgentState !== 'IDLE' || agyIsSleeping || agyIsPeeking || isDraggingPet) {
        const pet = document.getElementById('agy-composer-pet');
        if (pet) {
            const sprite = pet.querySelector('#agy-pet-sprite');
            if (sprite && !agyIsPeeking && !agyIsSleeping) sprite.classList.remove('agy-patrol-mode');
        }
        return;
    }

    const pet = document.getElementById('agy-composer-pet');
    const composer = findAgyComposerContainer();
    if (!pet || !composer) return;

    const maxOffset = Math.max(60, composer.clientWidth - 52);

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
      <div id="agy-pet-mana-hud" class="agy-pet-mana-hud" style="position:absolute;bottom:42px;right:-18px;pointer-events:none;display:none;align-items:flex-end;gap:6px;z-index:57;opacity:0;transition:all 0.2s ease;transform:translateY(4px) scale(0.95);">
        <!-- 像素魔力试管 (宽12px, 高28px) -->
        <div id="agy-mana-vial-box" style="display:flex;flex-direction:column;align-items:center;">
          <!-- 软木塞 -->
          <div style="width:10px;height:4px;background:#b45309;border-top-left-radius:2px;border-top-right-radius:2px;border:1px solid #78350f;box-shadow:0 1px 2px rgba(0,0,0,0.3);"></div>
          <!-- 玻璃试管身 -->
          <div style="position:relative;width:12px;height:28px;background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.6);border-bottom-left-radius:6px;border-bottom-right-radius:6px;overflow:hidden;backdrop-filter:blur(4px);display:flex;flex-direction:column;justify-content:flex-end;padding:2px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">
            <!-- 内部药水液面 -->
            <div id="agy-mana-liquid-fill" style="width:100%;height:85%;background:#38bdf8;border-bottom-left-radius:4px;border-bottom-right-radius:4px;transition:all 0.3s ease;position:relative;box-shadow:0 0 8px rgba(56,189,248,0.7);">
              <!-- 液面微波浪 -->
              <div id="agy-mana-wave-surface" style="position:absolute;top:-2px;left:0;right:0;height:4px;background:rgba(125,211,252,0.9);border-radius:9999px;"></div>
              <!-- 上浮微气泡 -->
              <div class="agy-mana-bubble-1" style="position:absolute;width:4px;height:4px;background:rgba(255,255,255,0.8);border-radius:50%;left:2px;bottom:4px;"></div>
              <div class="agy-mana-bubble-2" style="position:absolute;width:3px;height:3px;background:rgba(255,255,255,0.7);border-radius:50%;right:2px;bottom:8px;"></div>
            </div>
            <!-- 玻璃左侧高光条 -->
            <div style="position:absolute;top:2px;left:2px;bottom:2px;width:2px;background:rgba(255,255,255,0.3);border-radius:9999px;pointer-events:none;"></div>
          </div>
        </div>

        <!-- 伴随像素信息卡片 -->
        <div id="agy-mana-info-card" style="background:rgba(15,23,42,0.95);border:1px solid rgba(56,189,248,0.45);border-radius:8px;padding:3px 8px;box-shadow:0 6px 18px rgba(0,0,0,0.45);backdrop-filter:blur(6px);display:flex;flex-direction:column;gap:2px;white-space:nowrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span id="agy-mana-pct-text" style="font-size:10px;color:#38bdf8;font-weight:700;letter-spacing:-0.2px;">✨ Gemini 85%</span>
            <span id="agy-mana-badge-label" style="font-size:9px;padding:1px 4px;border-radius:4px;background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);font-family:monospace;">5h</span>
          </div>
          <div id="agy-mana-reset-text" style="font-size:9px;color:rgba(203,213,225,0.85);font-family:monospace;">⏳ 2h 15m 后回满</div>
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
            fill.style.background = '#38bdf8';
            fill.style.boxShadow = '0 0 8px rgba(56, 189, 248, 0.7)';
            if (wave) wave.style.background = 'rgba(125, 211, 252, 0.9)';
            if (pctText) { pctText.style.color = '#38bdf8'; pctText.textContent = `✨ Gemini ${pct}%`; }
            if (badge) { badge.style.color = '#38bdf8'; badge.style.background = 'rgba(56, 189, 248, 0.2)'; badge.textContent = '5h'; }
            if (infoCard) infoCard.style.borderColor = 'rgba(56, 189, 248, 0.4)';
        } else if (pct >= 20) {
            fill.style.background = '#fbbf24';
            fill.style.boxShadow = '0 0 8px rgba(251, 191, 36, 0.7)';
            if (wave) wave.style.background = 'rgba(253, 230, 138, 0.9)';
            if (pctText) { pctText.style.color = '#fbbf24'; pctText.textContent = `⚡ Gemini ${pct}%`; }
            if (badge) { badge.style.color = '#fbbf24'; badge.style.background = 'rgba(251, 191, 36, 0.2)'; badge.textContent = '5h 适中'; }
            if (infoCard) infoCard.style.borderColor = 'rgba(251, 191, 36, 0.4)';
        } else {
            fill.style.background = '#f43f5e';
            fill.style.boxShadow = '0 0 8px rgba(244, 63, 94, 0.7)';
            if (wave) wave.style.background = 'rgba(253, 164, 175, 0.9)';
            if (pctText) { pctText.style.color = '#f43f5e'; pctText.textContent = `⚠️ Gemini ${pct}%`; }
            if (badge) { badge.style.color = '#f43f5e'; badge.style.background = 'rgba(244, 63, 94, 0.2)'; badge.textContent = '告急'; }
            if (infoCard) infoCard.style.borderColor = 'rgba(244, 63, 94, 0.4)';
        }

        if (resetText) {
            if (pct === 100) resetText.textContent = '✨ 魔力充盈待命中';
            else if (resetCountdown) resetText.textContent = `⏳ ${resetCountdown} 后回满`;
            else resetText.textContent = '⚡ 实时额度在线';
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

        const pupils = pet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = 'translate(0.5px, -0.7px)');

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
        clearTimeout(agyManaHoverTimer);
        agyManaHoverTimer = setTimeout(showAgyManaHud, 280); // 280ms 意图防抖
    });

    pet.addEventListener('mouseleave', () => {
        clearTimeout(agyManaHoverTimer);
        hideAgyManaHud(false);
    });

    // ✨ 细节 4：拖拽工位「悬空挣扎与软泥落水感」
    pet.addEventListener('dragstart', (e) => e.preventDefault());

    pet.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // 仅左键拖拽
        e.preventDefault(); // 关键！阻断浏览器默认 HTML5 拖拽与文本选区，彻底避免 mouseup 丢失
        clearTimeout(agyManaHoverTimer);
        hideAgyManaHud(true); // 0ms 瞬间销毁/隐藏魔力试管，拖拽期间绝对不显示
        if (agyIsSleeping) wakeAgyPetUp();
        if (agyIsPeeking) {
            clearTimeout(agyPeekTimer);
            agyIsPeeking = false;
            const sprite = pet.querySelector('#agy-pet-sprite');
            if (sprite) sprite.classList.remove('agy-pet-peeking');
        }
        isDraggingPet = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        dragLastX = e.clientX;
        dragLastY = e.clientY;
        dragStartOffset = agyPetOffset;
        dragMovedDistance = 0;
        currentLiftY = -12;
        pet.style.cursor = 'grabbing';

        const sprite = pet.querySelector('#agy-pet-sprite');
        if (sprite) {
            sprite.classList.remove('agy-pudding-landing', 'agy-pet-idle-anim', 'agy-patrol-mode');
            sprite.classList.add('agy-pet-lifted');
            sprite.style.transform = 'translateY(-12px) scale(0.86, 1.18)';
        }
        const pupils = pet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = 'translate(0, 0.8px)');
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingPet) return;
        const deltaX = dragStartX - e.clientX;
        const moveStep = Math.hypot(e.clientX - dragLastX, e.clientY - dragLastY);
        dragMovedDistance += moveStep;

        const comp = findAgyComposerContainer();
        const maxOffset = Math.max(60, (comp ? comp.clientWidth : 300) - 52);
        agyPetOffset = Math.max(24, Math.min(maxOffset, dragStartOffset + deltaX));
        pet.style.right = agyPetOffset + 'px';

        // 垂直高度实时跟随鼠标上拉 (真实悬空拔高体感)
        const pullY = e.clientY - dragStartY;
        const liftY = Math.min(-6, Math.max(-60, pullY < 0 ? pullY : -8));
        currentLiftY = liftY;

        // 水平移动速度倾角
        const speedX = e.clientX - dragLastX;
        dragLastX = e.clientX;
        dragLastY = e.clientY;
        const tilt = Math.max(-14, Math.min(14, speedX * 1.5));

        const sprite = pet.querySelector('#agy-pet-sprite');
        if (sprite) {
            sprite.style.transform = `translateY(${liftY}px) scale(0.86, 1.18) rotate(${tilt}deg)`;
        }
    });

    function handlePetDragEnd() {
        if (!isDraggingPet) return;
        isDraggingPet = false;
        pet.style.cursor = 'grab';
        localStorage.setItem('agy-pet-offset', String(Math.round(agyPetOffset)));

        const sprite = pet.querySelector('#agy-pet-sprite');
        if (sprite) {
            sprite.style.setProperty('--drop-from-y', `${currentLiftY}px`);
            sprite.style.transform = '';
            sprite.classList.remove('agy-pet-lifted');
            sprite.classList.add('agy-pudding-landing');
            setTimeout(() => {
                if (sprite) {
                    sprite.classList.remove('agy-pudding-landing');
                    sprite.classList.add('agy-pet-idle-anim');
                }
            }, 550);
        }
        const pupils = pet.querySelectorAll('.pupil-el');
        pupils.forEach(p => p.style.transform = 'translate(0, 0)');

        if (dragMovedDistance < 5) {
            // 点击抚摸
            handlePetClick();
        } else {
            playAgyDropSound();
            showPetBubble('呼~ 软泥吸附好啦 🛋️');
        }
    }

    window.addEventListener('mouseup', handlePetDragEnd);
    window.addEventListener('pointerup', handlePetDragEnd);
    window.addEventListener('blur', handlePetDragEnd);

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
