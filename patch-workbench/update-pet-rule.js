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

    /* --- [AGY UI 增强 2] 像素小宠物全功能系统 (方案一 + 方案二 + 方案三 + 方案四) --- */
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

    const AGY_PET_SVGS = {
      // 1. 小章鱼全状态与配饰图层
      octopus: \`<svg class="agy-pixel-crisp" width="36" height="36" viewBox="0 0 18 18" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg">
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

          <!-- 完成时：星星眼 -->
          <g id="agy-star-eyes" style="display:none;">
            <polygon points="6,4.5 6.5,5.8 7.8,5.8 6.8,6.6 7.2,7.8 6,7 4.8,7.8 5.2,6.6 4.2,5.8 5.5,5.8" fill="#fbbf24"/>
            <polygon points="12,4.5 12.5,5.8 13.8,5.8 12.8,6.6 13.2,7.8 12,7 10.8,7.8 11.2,6.6 10.2,5.8 11.5,5.8" fill="#fbbf24"/>
          </g>

          <!-- 报错时：蚊香眼 -->
          <g id="agy-dizzy-eyes" style="display:none;">
            <circle cx="6" cy="6.3" r="1.3" stroke="#18181b" stroke-width="0.8" fill="none"/>
            <circle cx="12" cy="6.3" r="1.3" stroke="#18181b" stroke-width="0.8" fill="none"/>
          </g>

          <!-- 思考中：发光旋转齿轮 -->
          <g id="agy-gear" style="display:none;">
            <g class="agy-spin-gear">
              <path d="M7 1.2 L8 0 L10 0 L11 1.2 L12.5 1.2 L13 2.5 L12 3.5 L12 5.5 L13 6.5 L12.5 7.8 L11 7.8 L10 9 L8 9 L7 7.8 L5.5 7.8 L5 6.5 L6 5.5 L6 3.5 L5 2.5 L5.5 1.2 Z" fill="#38bdf8"/>
              <circle cx="9" cy="4.5" r="1.3" fill="#0f172a"/>
            </g>
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
        </svg>\`,

      // 2. 线条小狗全状态与配饰图层
      puppy: \`<svg class="agy-pixel-crisp" width="36" height="36" viewBox="0 0 18 18" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg">
          <rect x="4" y="4" width="10" height="7.5" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/>
          <rect class="puppy-ear" x="2.5" y="4" width="2" height="5.5" fill="#2d3748" rx="0.5" style="transform-origin:top center;"/>
          <rect class="puppy-ear" x="13.5" y="4" width="2" height="5.5" fill="#2d3748" rx="0.5" style="transform-origin:top center;"/>
          
          <g id="agy-normal-eyes">
            <circle id="left-pupil" class="pupil-el" cx="6.5" cy="7.2" r="0.9" fill="#2d3748" style="transition:transform 0.08s ease-out;"/>
            <rect id="left-blink" class="blink-el" x="5.5" y="7" width="2.2" height="0.8" fill="#2d3748" style="display:none;"/>
            <circle id="right-pupil" class="pupil-el" cx="11.5" cy="7.2" r="0.9" fill="#2d3748" style="transition:transform 0.08s ease-out;"/>
            <rect id="right-blink" class="blink-el" x="10.5" y="7" width="2.2" height="0.8" fill="#2d3748" style="display:none;"/>
          </g>

          <g id="agy-star-eyes" style="display:none;">
            <polygon points="6.5,5.8 7,7.1 8.3,7.1 7.3,7.9 7.7,9.1 6.5,8.3 5.3,9.1 5.7,7.9 4.7,7.1 6,7.1" fill="#fbbf24"/>
            <polygon points="11.5,5.8 12,7.1 13.3,7.1 12.3,7.9 12.7,9.1 11.5,8.3 10.3,9.1 10.7,7.9 9.7,7.1 11,7.1" fill="#fbbf24"/>
          </g>

          <g id="agy-dizzy-eyes" style="display:none;">
            <circle cx="6.5" cy="7.2" r="1.3" stroke="#2d3748" stroke-width="0.8" fill="none"/>
            <circle cx="11.5" cy="7.2" r="1.3" stroke="#2d3748" stroke-width="0.8" fill="none"/>
          </g>

          <g id="agy-gear" style="display:none;">
            <g class="agy-spin-gear">
              <path d="M7 1.5 L8 0.3 L10 0.3 L11 1.5 L12.5 1.5 L13 2.8 L12 3.8 L12 5.8 L13 6.8 L12.5 8.1 L11 8.1 L10 9.3 L8 9.3 L7 8.1 L5.5 8.1 L5 6.8 L6 5.8 L6 3.8 L5 2.8 L5.5 1.5 Z" fill="#38bdf8"/>
              <circle cx="9" cy="4.8" r="1.3" fill="#0f172a"/>
            </g>
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
        </svg>\`
    };

    function ensureAgyPetStyles() {
        if (document.getElementById('agy-pet-styles')) return;
        const style = document.createElement('style');
        style.id = 'agy-pet-styles';
        style.textContent = \`
          @keyframes agy-pet-idle-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
          @keyframes agy-pet-bounce-pro { 0%, 100% { transform: translateY(0) scale(1,1); } 25% { transform: translateY(-10px) scale(0.9,1.15); } 50% { transform: translateY(-2px) scale(1.08,0.92); } 75% { transform: translateY(-5px) scale(0.96,1.04); } }
          @keyframes agy-pet-flip-celebrate { 0% { transform: translateY(0) rotate(0deg) scale(1); } 40% { transform: translateY(-18px) rotate(-180deg) scale(1.15); } 80% { transform: translateY(-4px) rotate(-360deg) scale(1.05); } 100% { transform: translateY(0) rotate(-360deg) scale(1); } }
          @keyframes agy-heart-float-pro { 0% { opacity:0; transform:translateY(0) scale(0.6); } 25% { opacity:1; transform:translateY(-10px) scale(1.1); } 100% { opacity:0; transform:translateY(-26px) scale(1.3); } }
          @keyframes agy-leg-type-odd { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2.2px); } }
          @keyframes agy-leg-type-even { 0%, 100% { transform: translateY(-2.2px); } 50% { transform: translateY(0); } }
          @keyframes agy-puppy-ear-perk { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-8deg); } }
          @keyframes agy-spin-gear { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @keyframes agy-steam-rise { 0% { opacity:0; transform:translateY(0); } 50% { opacity:0.8; } 100% { opacity:0; transform:translateY(-3px); } }
          @keyframes agy-confetti-burst { 0% { opacity:1; transform:translate(0,0) scale(1); } 100% { opacity:0; transform:translate(var(--tx),var(--ty)) scale(0.5); } }

          .agy-pet-idle-anim { animation: agy-pet-idle-subtle 2.8s ease-in-out infinite; }
          .agy-pet-bounce-anim { animation: agy-pet-bounce-pro 0.55s cubic-bezier(0.17, 0.89, 0.32, 1.28); }
          .agy-pet-celebrate-anim { animation: agy-pet-flip-celebrate 0.85s cubic-bezier(0.2, 0.8, 0.25, 1); }
          .agy-spin-gear { transform-origin: 9px 4.5px; animation: agy-spin-gear 1.6s linear infinite; }
          .agy-steam { animation: agy-steam-rise 1.4s ease-out infinite; }
          .agy-typing-mode .leg-odd, .agy-patrol-mode .leg-odd { animation: agy-leg-type-odd 0.14s infinite ease-in-out; }
          .agy-typing-mode .leg-even, .agy-patrol-mode .leg-even { animation: agy-leg-type-even 0.14s infinite ease-in-out; }
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

    function applyAgyPetVisuals() {
        const pet = document.getElementById('agy-composer-pet');
        if (!pet) return;
        const sprite = pet.querySelector('#agy-pet-sprite');
        if (!sprite) return;

        const gear = pet.querySelector('#agy-gear');
        const miniKb = pet.querySelector('#mini-kb');
        const normalEyes = pet.querySelector('#agy-normal-eyes');
        const starEyes = pet.querySelector('#agy-star-eyes');
        const dizzyEyes = pet.querySelector('#agy-dizzy-eyes');
        const goggles = pet.querySelector('#agy-acc-goggles');
        const coffee = pet.querySelector('#agy-acc-coffee');
        const sprout = pet.querySelector('#agy-acc-sprout');

        if (gear) gear.style.display = agyAgentState === 'THINKING' ? 'block' : 'none';
        if (miniKb) miniKb.style.display = (agyIsTyping || agyAgentState === 'CODING') ? 'block' : 'none';
        if (normalEyes) normalEyes.style.display = (agyAgentState === 'SUCCESS' || agyAgentState === 'ERROR') ? 'none' : 'block';
        if (starEyes) starEyes.style.display = agyAgentState === 'SUCCESS' ? 'block' : 'none';
        if (dizzyEyes) dizzyEyes.style.display = agyAgentState === 'ERROR' ? 'block' : 'none';

        if (goggles) goggles.style.display = (agyCurrentAcc === 'goggles' || agyAgentState === 'CODING') ? 'block' : 'none';
        if (coffee) coffee.style.display = agyCurrentAcc === 'coffee' ? 'block' : 'none';
        if (sprout) sprout.style.display = agyCurrentAcc === 'sprout' ? 'block' : 'none';

        if (agyAgentState === 'CODING' || agyIsTyping) {
            sprite.classList.add('agy-typing-mode');
        } else {
            sprite.classList.remove('agy-typing-mode');
        }
    }

    function triggerPetCelebration() {
        const pet = document.getElementById('agy-composer-pet');
        if (!pet) return;
        const sprite = pet.querySelector('#agy-pet-sprite');
        if (!sprite) return;

        agyAgentState = 'SUCCESS';
        applyAgyPetVisuals();
        sprite.classList.add('agy-pet-celebrate-anim');
        playAgySuccessSound();

        // 喷发彩纸粒子
        const confettiContainer = pet.querySelector('#agy-confetti-container');
        if (confettiContainer) {
            confettiContainer.innerHTML = '';
            const colors = ['#f43f5e', '#38bdf8', '#fbbf24', '#4ade80', '#a855f7'];
            for (let i = 0; i < 16; i++) {
                const c = document.createElement('div');
                const color = colors[i % colors.length];
                const tx = (Math.random() - 0.5) * 55;
                const ty = -14 - Math.random() * 26;
                c.style.cssText = \`position:absolute;width:4px;height:4px;background:\${color};border-radius:1px;--tx:\${tx}px;--ty:\${ty}px;animation:agy-confetti-burst 0.85s forwards ease-out;\`;
                confettiContainer.appendChild(c);
            }
            setTimeout(() => { confettiContainer.innerHTML = ''; }, 900);
        }

        showPetBubble('任务圆满完成！🎉');

        setTimeout(() => {
            sprite.classList.remove('agy-pet-celebrate-anim');
            agyAgentState = 'IDLE';
            applyAgyPetVisuals();
        }, 3200);
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
            const label = \`\${btn.getAttribute('aria-label') || ''} \${btn.getAttribute('title') || ''} \${(btn.textContent || '').trim()}\`;
            return /停止|Stop|Cancel|取消/i.test(label) || btn.querySelector('svg [class*="stop"]');
        });
        if (stopBtn) isGenerating = true;

        if (isGenerating && !agyLastDetectedActive) {
            // 开始生成 / 推理
            agyLastDetectedActive = true;
            const isTool = document.querySelector('[class*="terminal"], [class*="task-item"], [class*="tool-call"], [class*="executing"]') !== null;
            agyAgentState = isTool ? 'CODING' : 'THINKING';
            applyAgyPetVisuals();
            showPetBubble(isTool ? '全力敲代码/运行工具 🥽!' : '深入思考推理中 ⚙️...');
        } else if (!isGenerating && agyLastDetectedActive) {
            // 生成结束 -> 触发完成撒花！
            agyLastDetectedActive = false;
            triggerPetCelebration();
        } else if (isGenerating) {
            const isTool = document.querySelector('[class*="terminal"], [class*="task-item"], [class*="tool-call"], [class*="executing"]') !== null;
            const targetState = isTool ? 'CODING' : 'THINKING';
            if (agyAgentState !== targetState && agyAgentState !== 'SUCCESS') {
                agyAgentState = targetState;
                applyAgyPetVisuals();
            }
        }
    }, 400);

    // 顶边踱步巡逻循环
    let agyPatrolDir = 1;
    setInterval(() => {
        if (!agyPatrolEnabled || agyIsTyping || agyAgentState !== 'IDLE') {
            const pet = document.getElementById('agy-composer-pet');
            if (pet) {
                const sprite = pet.querySelector('#agy-pet-sprite');
                if (sprite) sprite.classList.remove('agy-patrol-mode');
            }
            return;
        }

        const pet = document.getElementById('agy-composer-pet');
        const composer = findAgyComposerContainer();
        if (!pet || !composer) return;

        const maxOffset = composer.clientWidth - 52;
        agyPetOffset += agyPatrolDir * 1.3;

        const sprite = pet.querySelector('#agy-pet-sprite');
        if (agyPetOffset >= maxOffset) {
            agyPetOffset = maxOffset;
            agyPatrolDir = -1;
            if (sprite) sprite.style.transform = 'scaleX(-1)';
        } else if (agyPetOffset <= 24) {
            agyPetOffset = 24;
            agyPatrolDir = 1;
            if (sprite) sprite.style.transform = 'scaleX(1)';
        }

        pet.style.right = agyPetOffset + 'px';
        if (sprite) sprite.classList.add('agy-patrol-mode');
    }, 50);

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
        pet.style.cssText = \`position:absolute;bottom:100%;margin-bottom:-1px;right:\${agyPetOffset}px;z-index:50;cursor:grab;user-select:none;display:flex;flex-direction:column;align-items:center;pointer-events:auto;\`;

        pet.innerHTML = \`
          <div id="agy-pet-bubble" style="position:absolute;bottom:100%;margin-bottom:6px;padding:3px 9px;border-radius:6px;background:rgba(24,28,36,0.92);border:1px solid rgba(255,255,255,0.18);color:#f1f5f9;font-size:11px;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,0.3);opacity:0;pointer-events:none;transition:all 0.2s ease;transform:translateY(3px);">戳我一下~</div>
          <div id="agy-heart-burst" style="position:absolute;bottom:100%;pointer-events:none;opacity:0;font-size:12px;">❤️</div>
          <div id="agy-confetti-container" style="position:absolute;bottom:100%;pointer-events:none;"></div>
          <div id="agy-pet-sprite" class="agy-pet-idle-anim" style="transform-origin:bottom center;">
            \${AGY_PET_SVGS[agyCurrentPet] || AGY_PET_SVGS.octopus}
          </div>
        \`;

        // 拖拽逻辑与点击区分
        let isDraggingPet = false;
        let dragStartX = 0;
        let dragStartOffset = agyPetOffset;
        let dragMovedDistance = 0;

        pet.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 仅左键拖拽
            isDraggingPet = true;
            dragStartX = e.clientX;
            dragStartOffset = agyPetOffset;
            dragMovedDistance = 0;
            pet.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingPet) return;
            const delta = dragStartX - e.clientX;
            dragMovedDistance += Math.abs(delta);
            const comp = findAgyComposerContainer();
            const maxOffset = comp ? comp.clientWidth - 50 : 300;
            agyPetOffset = Math.max(16, Math.min(maxOffset, dragStartOffset + delta));
            pet.style.right = agyPetOffset + 'px';
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingPet) {
                isDraggingPet = false;
                pet.style.cursor = 'grab';
                localStorage.setItem('agy-pet-offset', String(Math.round(agyPetOffset)));
                if (dragMovedDistance < 5) {
                    // 点击抚摸
                    handlePetClick();
                } else {
                    showPetBubble('新工位吸附好啦~');
                    playAgyPopSound();
                }
            }
        });

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
    }

    /* --- 右键胶囊菜单实现 --- */
    function ensurePetContextMenu() {
        if (document.getElementById('agy-pet-context-menu')) return;
        const menu = document.createElement('div');
        menu.id = 'agy-pet-context-menu';
        menu.style.cssText = 'position:fixed;background:rgba(20,24,33,0.96);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.16);border-radius:12px;padding:10px 12px;box-shadow:0 16px 40px rgba(0,0,0,0.55);font-size:12px;color:#f1f5f9;z-index:2147483647;display:none;flex-direction:column;gap:8px;width:196px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
        
        menu.innerHTML = \`
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
            <button id="menu-patrol-btn" style="padding:2px 8px;border-radius:6px;border:none;background:rgba(74,222,128,0.2);color:#4ade80;cursor:pointer;font-size:10px;font-weight:600;">\${agyPatrolEnabled ? '开启中' : '已停用'}</button>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,0.08);padding-top:6px;">
            <span style="font-size:11px;color:#cbd5e1;">🔊 治愈音效</span>
            <button id="menu-sound-btn" style="padding:2px 8px;border-radius:6px;border:none;background:rgba(255,255,255,0.1);color:#94a3b8;cursor:pointer;font-size:10px;font-weight:600;">\${agySoundEnabled ? '已开启' : '已静音'}</button>
          </div>
        \`;

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

    /* --- 打字状态：触手敲键盘 + 低头看输入框 --- */
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
rules[rules.length - 1].description = 'Inject in-UI branch conversation buttons, modal, shortcut, and full-featured pet (Phases 1-4: states, patrol, drag, accessories, sound, context menu) into preload';
rules[rules.length - 1].replace = replacementCode;

fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + '\n', 'utf8');
console.log('Successfully updated runtime-rules.json with full-featured Phases 1-4 pet system!');
