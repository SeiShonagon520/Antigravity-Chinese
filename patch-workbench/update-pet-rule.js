const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, 'runtime-rules.json');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

const replacementCode = `function scheduleSemanticUpdate() {
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
            if (btn.closest('#antigravity\\\\.agentSidePanelInputBox') || btn.closest('[data-agy-component="composer"]')) return;
            if (btn.closest('#agy-branch-modal') || btn.closest('#agy-composer-pet')) return;
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

        let defaultBranchTitle = \`\${currentTitle} (分支)\`;
        if (turnIndex !== null && turnIndex >= 0) {
            defaultBranchTitle = \`\${currentTitle} (第 \${turnIndex + 1} 轮分支)\`;
        }

        const modal = document.createElement('div');
        modal.id = 'agy-branch-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,\\"Segoe UI\\",Roboto,sans-serif;';
        
        const previewHtml = snippet ? \`
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:11px;font-weight:500;color:#94a3b8;">分叉历史截断点：</label>
            <div style="font-size:11px;color:#cbd5e1;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:7px 10px;border-radius:8px;max-height:54px;overflow:hidden;line-height:1.4;">"\${snippet.replace(/"/g, '&quot;')}"</div>
          </div>
        \` : '';

        modal.innerHTML = \`
          <div style="background:rgba(24,28,36,0.96);color:#f1f5f9;border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:22px 24px;width:400px;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:34px;height:34px;border-radius:8px;background:rgba(34,197,94,0.15);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:16px;">🌿</div>
              <div>
                <h3 style="margin:0;font-size:15px;font-weight:600;color:#f8fafc;">新建对话分支</h3>
                <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">\${snippet ? '从此条消息分叉，开启独立探索分支' : '克隆当前上下文并创建平行独立的新会话'}</p>
              </div>
            </div>
            \${previewHtml}
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:2px;">
              <label style="font-size:12px;font-weight:500;color:#cbd5e1;">分支会话标题：</label>
              <input id="agy-branch-title-input" type="text" value="\${defaultBranchTitle.replace(/"/g, '&quot;')}" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none;" />
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
              <button id="agy-branch-cancel" type="button" style="padding:7px 15px;border:1px solid rgba(255,255,255,0.15);border-radius:8px;background:transparent;color:#94a3b8;cursor:pointer;font-size:12px;">取消</button>
              <button id="agy-branch-submit" type="button" style="padding:7px 18px;border:none;border-radius:8px;background:#10b981;color:#fff;font-weight:600;cursor:pointer;font-size:12px;box-shadow:0 4px 12px rgba(16,185,129,0.3);">确认创建</button>
            </div>
          </div>
        \`;

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

    /* --- [AGY UI 增强 2] 对话框顶部站立小宠物 (高精第一阶段：逐帧呼吸、自然眨眼、视线追踪、急速键盘) --- */
    let agyCurrentPet = localStorage.getItem('agy-pet-type') || 'octopus';
    let agyPetTypingTimer = null;
    let agyIsPetBouncing = false;
    let agyIsTyping = false;
    let agyBlinkTimer = null;

    const AGY_PET_SVGS = {
      // 1. 原图珊瑚橙小章鱼 (含独立瞳孔、眨眼横缝与微型像素键盘)
      octopus: \`<svg class="agy-pixel-crisp" width="36" height="36" viewBox="0 0 18 18" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="3" width="10" height="8" fill="#d97757" rx="0.3"/>
          <rect x="5" y="2" width="8" height="1" fill="#d97757"/>
          <rect x="3" y="5" width="12" height="5" fill="#d97757"/>
          <rect x="2" y="6" width="1" height="3" fill="#d97757"/>
          <rect x="15" y="6" width="1" height="3" fill="#d97757"/>
          <g id="left-eye-group">
            <rect id="left-pupil" class="pupil-el" x="5.2" y="5.5" width="1.6" height="1.6" fill="#18181b" style="transition:transform 0.08s ease-out;"/>
            <rect id="left-blink" class="blink-el" x="4.8" y="6" width="2.4" height="0.8" fill="#18181b" style="display:none;"/>
          </g>
          <g id="right-eye-group">
            <rect id="right-pupil" class="pupil-el" x="11.2" y="5.5" width="1.6" height="1.6" fill="#18181b" style="transition:transform 0.08s ease-out;"/>
            <rect id="right-blink" class="blink-el" x="10.8" y="6" width="2.4" height="0.8" fill="#18181b" style="display:none;"/>
          </g>
          <rect class="leg-el leg-odd" x="4" y="11" width="1.6" height="4" fill="#d97757"/>
          <rect class="leg-el leg-even" x="7" y="11" width="1.6" height="4" fill="#d97757"/>
          <rect class="leg-el leg-odd" x="9.5" y="11" width="1.6" height="4" fill="#d97757"/>
          <rect class="leg-el leg-even" x="12.5" y="11" width="1.6" height="4" fill="#d97757"/>
          <g id="mini-kb" style="display:none;">
            <rect x="4" y="13.2" width="10" height="2" fill="#1e293b" rx="0.4"/>
            <rect x="4.8" y="13.6" width="1.4" height="1.2" fill="#38bdf8"/>
            <rect x="6.8" y="13.6" width="1.4" height="1.2" fill="#a855f7"/>
            <rect x="8.8" y="13.6" width="1.4" height="1.2" fill="#38bdf8"/>
            <rect x="10.8" y="13.6" width="1.4" height="1.2" fill="#a855f7"/>
          </g>
        </svg>\`,

      // 2. 线条小狗 (垂耳微动、独立瞳孔、爪子起伏)
      puppy: \`<svg class="agy-pixel-crisp" width="36" height="36" viewBox="0 0 18 18" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="10" height="7.5" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/>
          <rect class="puppy-ear" x="2.5" y="4" width="2" height="5.5" fill="#2d3748" rx="0.5" style="transform-origin:top center;"/>
          <rect class="puppy-ear" x="13.5" y="4" width="2" height="5.5" fill="#2d3748" rx="0.5" style="transform-origin:top center;"/>
          <g id="left-eye-group">
            <circle id="left-pupil" class="pupil-el" cx="6.5" cy="7.2" r="0.9" fill="#2d3748" style="transition:transform 0.08s ease-out;"/>
            <rect id="left-blink" class="blink-el" x="5.5" y="7" width="2.2" height="0.8" fill="#2d3748" style="display:none;"/>
          </g>
          <g id="right-eye-group">
            <circle id="right-pupil" class="pupil-el" cx="11.5" cy="7.2" r="0.9" fill="#2d3748" style="transition:transform 0.08s ease-out;"/>
            <rect id="right-blink" class="blink-el" x="10.5" y="7" width="2.2" height="0.8" fill="#2d3748" style="display:none;"/>
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
        </svg>\`
    };

    function ensureAgyPetStyles() {
        if (document.getElementById('agy-pet-styles')) return;
        const style = document.createElement('style');
        style.id = 'agy-pet-styles';
        style.textContent = \`
          @keyframes agy-pet-idle-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
          @keyframes agy-pet-bounce-pro { 0%, 100% { transform: translateY(0) scale(1,1); } 25% { transform: translateY(-10px) scale(0.9,1.15); } 50% { transform: translateY(-2px) scale(1.08,0.92); } 75% { transform: translateY(-5px) scale(0.96,1.04); } }
          @keyframes agy-heart-float-pro { 0% { opacity:0; transform:translateY(0) scale(0.6); } 25% { opacity:1; transform:translateY(-10px) scale(1.1); } 100% { opacity:0; transform:translateY(-26px) scale(1.3); } }
          @keyframes agy-leg-type-odd { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.2px); } }
          @keyframes agy-leg-type-even { 0%, 100% { transform: translateY(-2.2px); } 50% { transform: translateY(0); } }
          @keyframes agy-puppy-ear-perk { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }

          .agy-pet-idle-anim { animation: agy-pet-idle-subtle 2.8s ease-in-out infinite; }
          .agy-pet-bounce-anim { animation: agy-pet-bounce-pro 0.55s cubic-bezier(0.17, 0.89, 0.32, 1.28); }
          .agy-typing-mode .leg-odd { animation: agy-leg-type-odd 0.14s infinite ease-in-out; }
          .agy-typing-mode .leg-even { animation: agy-leg-type-even 0.14s infinite ease-in-out; }
          .agy-typing-mode .puppy-ear { animation: agy-puppy-ear-perk 0.2s infinite alternate ease-in-out; }
          .agy-pixel-crisp { image-rendering: pixelated; shape-rendering: crispEdges; }
          .agy-msg-branch-btn:hover { background: rgba(255,255,255,0.12) !important; color: #4ade80 !important; }
          [data-agy-component="composer"], #antigravity\\\\.agentSidePanelInputBox { overflow: visible !important; }
        \`;
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
        pet.title = agyCurrentPet === 'octopus' ? '小章鱼：戳我抚摸，双击换线条小狗~' : '线条小狗：戳我抚摸，双击换小章鱼~';
        pet.style.cssText = 'position:absolute;bottom:100%;margin-bottom:-1px;right:24px;z-index:50;cursor:pointer;user-select:none;display:flex;flex-direction:column;align-items:center;pointer-events:auto;';

        pet.innerHTML = \`
          <div id="agy-pet-bubble" style="position:absolute;bottom:100%;margin-bottom:6px;padding:3px 9px;border-radius:6px;background:rgba(24,28,36,0.92);border:1px solid rgba(255,255,255,0.18);color:#f1f5f9;font-size:11px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;pointer-events:none;transition:all 0.2s ease;transform:translateY(3px);">戳我一下~</div>
          <div id="agy-heart-burst" style="position:absolute;bottom:100%;pointer-events:none;opacity:0;font-size:12px;">❤️</div>
          <div id="agy-pet-sprite" class="agy-pet-idle-anim" style="transform-origin:bottom center;">
            \${AGY_PET_SVGS[agyCurrentPet] || AGY_PET_SVGS.octopus}
          </div>
        \`;

        pet.addEventListener('mouseenter', () => {
            const bubble = pet.querySelector('#agy-pet-bubble');
            if (bubble && !agyIsPetBouncing) {
                bubble.style.opacity = '1';
                bubble.style.transform = 'translateY(0)';
            }
        });
        pet.addEventListener('mouseleave', () => {
            const bubble = pet.querySelector('#agy-pet-bubble');
            if (bubble && !agyIsPetBouncing) {
                bubble.style.opacity = '0';
                bubble.style.transform = 'translateY(3px)';
            }
        });

        pet.addEventListener('click', (e) => {
            e.stopPropagation();
            if (agyIsPetBouncing) return;
            agyIsPetBouncing = true;
            const sprite = pet.querySelector('#agy-pet-sprite');
            const heart = pet.querySelector('#agy-heart-burst');
            const bubble = pet.querySelector('#agy-pet-bubble');

            sprite.className = 'agy-pet-bounce-anim';
            triggerPetBlink();
            if (heart) {
                heart.style.animation = 'none';
                heart.offsetHeight;
                heart.style.animation = 'agy-heart-float-pro 0.8s forwards ease-out';
            }
            if (bubble) {
                const phrases = ['今天写代码超顺！', '灵感爆发啦~', '摸摸头，零Bug！', '代码写得超棒！', '哔哔~ 专注中！'];
                bubble.textContent = phrases[Math.floor(Math.random() * phrases.length)];
                bubble.style.opacity = '1';
                bubble.style.transform = 'translateY(0)';
            }

            setTimeout(() => {
                sprite.className = 'agy-pet-idle-anim';
                agyIsPetBouncing = false;
                setTimeout(() => {
                    if (bubble) bubble.style.opacity = '0';
                }, 1000);
            }, 550);
        });

        pet.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            agyCurrentPet = agyCurrentPet === 'octopus' ? 'puppy' : 'octopus';
            localStorage.setItem('agy-pet-type', agyCurrentPet);
            const sprite = pet.querySelector('#agy-pet-sprite');
            if (sprite) sprite.innerHTML = AGY_PET_SVGS[agyCurrentPet] || AGY_PET_SVGS.octopus;
            pet.title = agyCurrentPet === 'octopus' ? '小章鱼：戳我抚摸，双击换线条小狗~' : '线条小狗：戳我抚摸，双击换小章鱼~';
            const bubble = pet.querySelector('#agy-pet-bubble');
            if (bubble) {
                bubble.textContent = agyCurrentPet === 'octopus' ? '变回小章鱼啦！' : '变身线条小狗啦！';
                bubble.style.opacity = '1';
                bubble.style.transform = 'translateY(0)';
                setTimeout(() => { bubble.style.opacity = '0'; }, 1500);
            }
        });

        composer.appendChild(pet);
        schedulePetBlink();
    }

    /* --- 视线随鼠标光标动态追踪 --- */
    window.addEventListener('mousemove', (e) => {
        if (agyIsTyping) return;
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
            p.style.transform = \`translate(\${offsetX.toFixed(2)}px, \${offsetY.toFixed(2)}px)\`;
        });
    });

    /* --- 打字状态：触手狂飙敲击微型键盘 + 低头看输入框 --- */
    window.addEventListener('input', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable)) {
            const pet = document.getElementById('agy-composer-pet');
            if (!pet) return;
            const sprite = pet.querySelector('#agy-pet-sprite');
            const miniKb = pet.querySelector('#mini-kb');
            if (!sprite || agyIsPetBouncing) return;

            agyIsTyping = true;
            sprite.classList.add('agy-typing-mode');
            if (miniKb) miniKb.style.display = 'block';

            // 视线专注看输入框
            const pupils = pet.querySelectorAll('.pupil-el');
            pupils.forEach(p => {
                p.style.transform = 'translate(0px, 0.8px)';
            });

            clearTimeout(agyPetTypingTimer);
            agyPetTypingTimer = setTimeout(() => {
                agyIsTyping = false;
                if (!agyIsPetBouncing && sprite) {
                    sprite.classList.remove('agy-typing-mode');
                    if (miniKb) miniKb.style.display = 'none';
                }
            }, 700);
        }
    }, true);`;

// Rule 9 is the last rule
rules[rules.length - 1].description = 'Inject in-UI branch conversation buttons, modal, shortcut, and high-fidelity Phase 1 pet (blink, eye-tracking, keyboard typing) into preload';
rules[rules.length - 1].replace = replacementCode;

fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + '\n', 'utf8');
console.log('Successfully updated runtime-rules.json with Phase 1 pet details!');
