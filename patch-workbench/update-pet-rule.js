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
        }, 70);
    }

    /* --- [AGY UI 增强 1] 新建对话分支 (Branch Conversation) --- */
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

    function openBranchModal() {
        if (document.getElementById('agy-branch-modal')) return;

        let currentTitle = '当前对话';
        const titleEl = document.querySelector('header h1, header h2, [class*="header"] h1, [class*="header"] h2, [class*="title-bar"] h1, [class*="title-bar"] h2, header div, main h1, main h2');
        if (titleEl && titleEl.textContent) {
            const txt = titleEl.textContent.trim();
            if (txt && txt.length < 80 && !txt.includes('Open IDE')) currentTitle = txt;
        }

        let currentId = '';
        const match = (location.hash || location.pathname || '').match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (match) currentId = match[1];

        const modal = document.createElement('div');
        modal.id = 'agy-branch-modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,\\"Segoe UI\\",Roboto,sans-serif;';
        
        modal.innerHTML = \`
          <div style="background:rgba(24,28,36,0.96);color:#f1f5f9;border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:22px 24px;width:380px;box-shadow:0 20px 50px rgba(0,0,0,0.5);display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;align-items:center;gap:10px;">
              <div style="width:32px;height:32px;border-radius:8px;background:rgba(34,197,94,0.15);color:#4ade80;display:flex;align-items:center;justify-content:center;font-size:16px;">🌿</div>
              <div>
                <h3 style="margin:0;font-size:15px;font-weight:600;color:#f8fafc;">新建对话分支</h3>
                <p style="margin:2px 0 0 0;font-size:11px;color:#94a3b8;">克隆当前上下文并创建平行独立的新会话</p>
              </div>
            </div>
            <div style="display:flex;flex-direction:column;gap:6px;margin-top:4px;">
              <label style="font-size:12px;font-weight:500;color:#cbd5e1;">分支会话标题：</label>
              <input id="agy-branch-title-input" type="text" value="\${currentTitle.replace(/"/g, '&quot;')} (分支)" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.18);border-radius:8px;padding:9px 12px;color:#fff;font-size:13px;outline:none;" />
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
          const branchTitle = input.value.trim() || \`\${currentTitle} (分支)\`;
          btnSubmit.disabled = true;
          btnSubmit.textContent = '正在克隆...';
          btnSubmit.style.opacity = '0.7';

          try {
            const res = await electron_1.ipcRenderer.invoke('agy:branch-conversation', {
              sourceId: currentId,
              title: branchTitle
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

    /* --- [AGY UI 增强 2] 对话框顶部站立小宠物 (Composer Standing Pet) --- */
    let agyCurrentPet = localStorage.getItem('agy-pet-type') || 'octopus';
    let agyPetTypingTimer = null;
    let agyIsPetBouncing = false;

    const AGY_PET_SVGS = {
      // 1. 原图珊瑚橙小章鱼 (100% 还原用户截图)
      octopus: '<svg class="agy-pixel-crisp" width="34" height="34" viewBox="0 0 16 16" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="10" height="7" fill="#d97757"/><rect x="4" y="2" width="8" height="1" fill="#d97757"/><rect x="2" y="5" width="12" height="4" fill="#d97757"/><rect x="1" y="6" width="1" height="2" fill="#d97757"/><rect x="14" y="6" width="1" height="2" fill="#d97757"/><rect x="4" y="5" width="1.5" height="1.5" fill="#1e1e1e"/><rect x="10.5" y="5" width="1.5" height="1.5" fill="#1e1e1e"/><rect x="3" y="10" width="1.5" height="4" fill="#d97757"/><rect x="6" y="10" width="1.5" height="4" fill="#d97757"/><rect x="8.5" y="10" width="1.5" height="4" fill="#d97757"/><rect x="11.5" y="10" width="1.5" height="4" fill="#d97757"/></svg>',
      // 2. 线条小狗 (与用户当前的线条小狗主题完美呼应)
      puppy: '<svg class="agy-pixel-crisp" width="34" height="34" viewBox="0 0 16 16" fill="none" style="shape-rendering:crispEdges;image-rendering:pixelated;" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="4" width="10" height="7" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/><rect x="1.5" y="4" width="2" height="5" fill="#2d3748" rx="0.5"/><rect x="12.5" y="4" width="2" height="5" fill="#2d3748" rx="0.5"/><circle cx="5.5" cy="7" r="0.75" fill="#2d3748"/><circle cx="10.5" cy="7" r="0.75" fill="#2d3748"/><rect x="7.5" y="8" width="1" height="0.8" fill="#e53e3e" rx="0.3"/><rect x="4" y="8.5" width="1.5" height="0.8" fill="#feb2b2" rx="0.4"/><rect x="10.5" y="8.5" width="1.5" height="0.8" fill="#feb2b2" rx="0.4"/><rect x="4" y="11" width="2" height="3" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/><rect x="10" y="11" width="2" height="3" fill="#fdfbf7" stroke="#333" stroke-width="0.8"/><rect x="13.5" y="8" width="1.5" height="1.5" fill="#2d3748"/></svg>'
    };

    function ensureAgyPetStyles() {
        if (document.getElementById('agy-pet-styles')) return;
        const style = document.createElement('style');
        style.id = 'agy-pet-styles';
        style.textContent = \`
          @keyframes agy-pet-idle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
          @keyframes agy-pet-bounce { 0%, 100% { transform: translateY(0) scale(1,1); } 30% { transform: translateY(-9px) scale(0.9,1.1); } 60% { transform: translateY(0) scale(1.1,0.9); } }
          @keyframes agy-pet-dance { 0%, 100% { transform: translateY(0) rotate(0deg); } 25% { transform: translateY(-3px) rotate(-6deg); } 75% { transform: translateY(-3px) rotate(6deg); } }
          @keyframes agy-heart-float { 0% { opacity:0; transform:translateY(0) scale(0.6); } 30% { opacity:1; transform:translateY(-10px) scale(1); } 100% { opacity:0; transform:translateY(-24px) scale(1.2); } }
          .agy-pet-idle { animation: agy-pet-idle 2.4s ease-in-out infinite; }
          .agy-pet-typing { animation: agy-pet-dance 0.35s ease-in-out infinite; }
          .agy-pet-bouncing { animation: agy-pet-bounce 0.45s cubic-bezier(0.17, 0.89, 0.32, 1.28); }
          .agy-pixel-crisp { image-rendering: pixelated; shape-rendering: crispEdges; }
          [data-agy-component="composer"], #antigravity\\\\.agentSidePanelInputBox { overflow: visible !important; }
        \`;
        document.head.appendChild(style);
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
          <div id="agy-pet-sprite" class="agy-pet-idle" style="transform-origin:bottom center;">
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

            sprite.className = 'agy-pet-bouncing';
            if (heart) {
                heart.style.animation = 'none';
                heart.offsetHeight;
                heart.style.animation = 'agy-heart-float 0.8s forwards ease-out';
            }
            if (bubble) {
                const phrases = ['今天也要加油！', '代码写得超棒！', '摸摸头~', '我在陪着你哦~', '哔哔！灵感迸发~'];
                bubble.textContent = phrases[Math.floor(Math.random() * phrases.length)];
                bubble.style.opacity = '1';
                bubble.style.transform = 'translateY(0)';
            }

            setTimeout(() => {
                sprite.className = 'agy-pet-idle';
                agyIsPetBouncing = false;
                setTimeout(() => {
                    if (bubble) bubble.style.opacity = '0';
                }, 1000);
            }, 500);
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
    }

    window.addEventListener('input', (e) => {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'TEXTAREA' || tag === 'INPUT' || (e.target && e.target.isContentEditable)) {
            const pet = document.getElementById('agy-composer-pet');
            if (!pet) return;
            const sprite = pet.querySelector('#agy-pet-sprite');
            if (!sprite || agyIsPetBouncing) return;
            sprite.className = 'agy-pet-typing';
            clearTimeout(agyPetTypingTimer);
            agyPetTypingTimer = setTimeout(() => {
                if (!agyIsPetBouncing && sprite) sprite.className = 'agy-pet-idle';
            }, 600);
        }
    }, true);`;

// Rule 9 is the last rule
rules[rules.length - 1].description = 'Inject in-UI branch conversation button, modal, shortcut Ctrl+Shift+B, and standing composer pet into preload';
rules[rules.length - 1].replace = replacementCode;

fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + '\n', 'utf8');
console.log('Successfully updated runtime-rules.json with branch button and composer pet logic!');
