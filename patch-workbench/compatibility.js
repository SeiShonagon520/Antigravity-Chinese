const fs = require('fs');
const path = require('path');
const vm = require('vm');

function normalizeVersion(value) {
  const match = String(value || '').trim().match(/^(\d+)\.(\d+)\.(\d+)/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : 'unknown';
}

function countHits(source, needle) {
  if (!needle) return 0;
  return source.split(needle).length - 1;
}

function requireSingleAnchor(source, anchor, label) {
  const hits = countHits(source, anchor);
  if (hits !== 1) {
    throw new Error(`${label} anchor expected exactly once but found ${hits}: ${anchor.slice(0, 120)}`);
  }
}

function insertAfter(source, anchor, payload, label) {
  requireSingleAnchor(source, anchor, label);
  const index = source.indexOf(anchor) + anchor.length;
  return `${source.slice(0, index)}\n${payload.trim()}\n${source.slice(index)}`;
}

function insertBefore(source, anchor, payload, label) {
  requireSingleAnchor(source, anchor, label);
  const index = source.indexOf(anchor);
  return `${source.slice(0, index)}${payload.trim()}\n${source.slice(index)}`;
}

function extractBetween(source, startAnchor, endAnchor, label, options = {}) {
  requireSingleAnchor(source, startAnchor, `${label} start`);
  requireSingleAnchor(source, endAnchor, `${label} end`);
  const start = source.indexOf(startAnchor) + (options.includeStart === false ? startAnchor.length : 0);
  const end = source.indexOf(endAnchor, start);
  if (end <= start) throw new Error(`${label} anchors are out of order`);
  return source.slice(start, end).trim();
}

function replaceBetween(source, startAnchor, endAnchor, payload, label) {
  requireSingleAnchor(source, startAnchor, `${label} start`);
  requireSingleAnchor(source, endAnchor, `${label} end`);
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start);
  if (end <= start) throw new Error(`${label} anchors are out of order`);
  return `${source.slice(0, start)}${payload.trim()}\n${source.slice(end)}`;
}

function applyLiteralRules(source, rules, relativePath) {
  const applied = [];
  let output = source;
  for (const [index, rule] of rules.entries()) {
    if (!rule || rule.enabled === false) continue;
    if (String(rule.file || '').replace(/\\/g, '/') !== relativePath) continue;
    const find = String(rule.find || '');
    const replace = String(rule.replace || '');
    const hits = countHits(output, find);
    if (hits === 0) {
      const replacementHits = replace ? countHits(output, replace) : 0;
      if (replacementHits > 0) {
        applied.push({ index: index + 1, file: relativePath, description: rule.description || '', hits: 0, alreadyApplied: true });
        continue;
      }
      throw new Error(`Runtime rule ${index + 1} did not match ${relativePath}`);
    }
    if (Number.isInteger(rule.expectedHits) && hits !== rule.expectedHits) {
      throw new Error(`Runtime rule ${index + 1} expected ${rule.expectedHits} matches but found ${hits} in ${relativePath}`);
    }
    output = output.split(find).join(replace);
    applied.push({ index: index + 1, file: relativePath, description: rule.description || '', hits });
  }
  return { source: output, applied };
}

function buildPreload(official, legacy) {
  const payload = legacy.slice(legacy.indexOf("electron_1.contextBridge.exposeInMainWorld('mcpLogger'"));
  if (!payload || payload === legacy) throw new Error('Legacy preload payload marker is missing');
  const anchor = "electron_1.contextBridge.exposeInMainWorld('ide', ideAPI);";
  const output = insertAfter(official, anchor, payload, 'preload extension point');
  return output;
}

function buildMain(official, legacy) {
  const rawHeader = extractBetween(legacy, 'const agyThemePath = require("path");', 'const gotTheLock = electron_1.app.requestSingleInstanceLock();', 'main AGY header');
  const branchIpcHandler = `
electron_1.ipcMain.handle('agy:get-conversation-turns', async (event, args = {}) => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    try {
        let sourceId = (args && args.sourceId) || '';
        const geminiDir = path.join(os.homedir(), '.gemini', 'antigravity');
        if (!sourceId) {
            const brainDir = path.join(geminiDir, 'brain');
            if (fs.existsSync(brainDir)) {
                const dirs = fs.readdirSync(brainDir);
                let latestTime = 0;
                for (const dir of dirs) {
                    const transcript = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
                    if (fs.existsSync(transcript)) {
                        const stat = fs.statSync(transcript);
                        if (stat.mtimeMs > latestTime) {
                            latestTime = stat.mtimeMs;
                            sourceId = dir;
                        }
                    }
                }
            }
        }
        if (!sourceId) {
            return { success: false, error: '未找到活跃的会话 ID', turns: [] };
        }
        const logPath = path.join(geminiDir, 'brain', sourceId, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(logPath)) {
            return { success: true, sourceId, turns: [] };
        }
        const turns = [];
        let currentTurn = null;
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\\n');
        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const item = JSON.parse(line);
                const stepIdx = item.step_index ?? 0;
                const t = item.type;
                const itemContent = item.content || '';
                const createdAt = item.created_at || '';
                if (t === 'USER_INPUT') {
                    if (currentTurn) turns.push(currentTurn);
                    let clean = itemContent.replace(/<USER_REQUEST>/g, '').replace(/<\\/USER_REQUEST>/g, '');
                    if (clean.includes('<ADDITIONAL_METADATA>')) {
                        clean = clean.split('<ADDITIONAL_METADATA>')[0];
                    }
                    clean = clean.trim();
                    currentTurn = {
                        turnIndex: turns.length,
                        userStep: stepIdx,
                        lastStep: stepIdx,
                        userText: clean.slice(0, 100),
                        assistantSnippet: '',
                        createdAt: createdAt
                    };
                } else if (currentTurn) {
                    if (stepIdx > currentTurn.lastStep) {
                        currentTurn.lastStep = stepIdx;
                    }
                    if (t === 'PLANNER_RESPONSE' && itemContent && !currentTurn.assistantSnippet) {
                        let aClean = itemContent.replace(/\\s+/g, ' ').trim();
                        currentTurn.assistantSnippet = aClean.slice(0, 120);
                    }
                }
            } catch (_) {}
        }
        if (currentTurn) turns.push(currentTurn);
        return { success: true, sourceId, turns };
    } catch (err) {
        return { success: false, error: err.message, turns: [] };
    }
});

electron_1.ipcMain.handle('agy:branch-conversation', async (event, args = {}) => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const childProcess = require('child_process');
    const appDataScriptsDir = path.join(process.env.APPDATA || '', 'Antigravity', 'scripts');
    const appDataScript = path.join(appDataScriptsDir, 'branch_conversation.py');
    const altScript1 = path.join(os.homedir(), '.gemini', 'antigravity', 'scripts', 'branch_conversation.py');
    const altScript2 = path.join(__dirname, 'scripts', 'branch_conversation.py');
    let pythonScript = appDataScript;
    if (!fs.existsSync(pythonScript)) {
        if (fs.existsSync(altScript1)) pythonScript = altScript1;
        else if (fs.existsSync(altScript2)) pythonScript = altScript2;
    }
    const pythonCandidates = [
        path.join(os.homedir(), 'anaconda3', 'python.exe'),
        path.join(os.homedir(), 'miniconda3', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python310', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python39', 'python.exe')
    ];
    let pythonExe = 'python';
    for (const cand of pythonCandidates) {
        if (fs.existsSync(cand)) {
            pythonExe = cand;
            break;
        }
    }
    return new Promise((resolve) => {
        const child = childProcess.spawn(pythonExe, [pythonScript], {
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
            stdio: ['pipe', 'pipe', 'pipe']
        });
        let stdout = '';
        let stderr = '';
        child.stdout.setEncoding('utf8');
        child.stderr.setEncoding('utf8');
        child.stdout.on('data', data => { stdout += data; });
        child.stderr.on('data', data => { stderr += data; });
        child.on('error', err => {
            resolve({ success: false, error: err.message });
        });
        child.on('close', code => {
            if (code !== 0 && !stdout.trim()) {
                return resolve({ success: false, error: stderr || ('Process exited with code ' + code) });
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                resolve({ success: false, error: stdout || stderr || e.message });
            }
        });
        try {
            child.stdin.write(JSON.stringify(args || {}));
            child.stdin.end();
        } catch (err) {
            resolve({ success: false, error: 'Failed to write to stdin: ' + err.message });
        }
    });
});

electron_1.ipcMain.handle('agy:get-side-chat-context', async (event, args = {}) => {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    try {
        let sourceId = (args && args.sourceId) || '';
        const geminiDir = path.join(os.homedir(), '.gemini', 'antigravity');
        const brainDir = path.join(geminiDir, 'brain');
        if (!sourceId && fs.existsSync(brainDir)) {
            const dirs = fs.readdirSync(brainDir);
            let latestTime = 0;
            for (const dir of dirs) {
                const transcript = path.join(brainDir, dir, '.system_generated', 'logs', 'transcript.jsonl');
                if (fs.existsSync(transcript)) {
                    const stat = fs.statSync(transcript);
                    if (stat.mtimeMs > latestTime) {
                        latestTime = stat.mtimeMs;
                        sourceId = dir;
                    }
                }
            }
        }
        if (!sourceId) {
            return { success: false, error: '未找到活跃的会话 ID' };
        }
        const logPath = path.join(geminiDir, 'brain', sourceId, '.system_generated', 'logs', 'transcript.jsonl');
        if (!fs.existsSync(logPath)) {
            return {
                success: true,
                context: {
                    conversationId: sourceId,
                    title: '当前对话',
                    latestUserPrompt: '',
                    latestAssistantResponse: '',
                    recentFiles: [],
                    recentErrors: '',
                    totalSteps: 0
                }
            };
        }
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\\n');
        let title = '';
        let latestUserPrompt = '';
        let latestAssistantResponse = '';
        const touchedFiles = new Set();
        let recentErrors = '';
        let stepCount = 0;

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const item = JSON.parse(line);
                stepCount++;
                const t = item.type;
                const itemContent = item.content || '';
                if (t === 'USER_INPUT') {
                    let clean = itemContent.replace(/<USER_REQUEST>/g, '').replace(/<\\/USER_REQUEST>/g, '');
                    if (clean.includes('<ADDITIONAL_METADATA>')) clean = clean.split('<ADDITIONAL_METADATA>')[0];
                    clean = clean.trim();
                    if (!title) title = clean.slice(0, 60);
                    latestUserPrompt = clean;
                } else if (t === 'PLANNER_RESPONSE') {
                    if (itemContent) {
                        latestAssistantResponse = itemContent.slice(0, 800);
                    }
                    if (item.tool_calls && Array.isArray(item.tool_calls)) {
                        for (const tc of item.tool_calls) {
                            const a = tc.args || {};
                            if (a.AbsolutePath) touchedFiles.add(path.basename(a.AbsolutePath));
                            if (a.TargetFile) touchedFiles.add(path.basename(a.TargetFile));
                        }
                    }
                } else if (item.status === 'ERROR' || (itemContent && (itemContent.includes('Error:') || itemContent.includes('Exception:') || itemContent.includes('Traceback')))) {
                    recentErrors = itemContent.slice(0, 400);
                }
            } catch (_) {}
        }

        return {
            success: true,
            context: {
                conversationId: sourceId,
                title: title || '当前对话',
                latestUserPrompt: latestUserPrompt.slice(0, 500),
                latestAssistantResponse: latestAssistantResponse.slice(0, 800),
                recentFiles: Array.from(touchedFiles).slice(-8),
                recentErrors: recentErrors,
                totalSteps: stepCount
            }
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

electron_1.ipcMain.handle('agy:side-chat-query', async (event, args = {}) => {
    const https = require('https');
    const http = require('http');
    const { messages = [], provider = {}, baselineContext = {} } = args;

    const apiKey = (provider.apiKey || '').trim();
    let baseUrl = (provider.baseUrl || '').trim();
    let model = (provider.model || '').trim();
    const pType = provider.type || 'deepseek';

    if (!baseUrl) {
        if (pType === 'deepseek') {
            baseUrl = 'https://api.deepseek.com/v1';
            if (!model) model = 'deepseek-chat';
        } else if (pType === 'openai') {
            baseUrl = 'https://api.openai.com/v1';
            if (!model) model = 'gpt-4o-mini';
        } else if (pType === 'gemini') {
            baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai';
            if (!model) model = 'gemini-1.5-flash';
        } else if (pType === 'ollama') {
            baseUrl = 'http://localhost:11434/v1';
            if (!model) model = 'qwen2.5-coder';
        }
    }

    const baseSummary = [
        '[Antigravity 主任务基准上下文 (Codex 侧边辅助)]',
        baselineContext.title ? ('- 主任务目标: ' + baselineContext.title) : null,
        baselineContext.latestUserPrompt ? ('- 最近用户指令: ' + baselineContext.latestUserPrompt.slice(0, 250)) : null,
        baselineContext.recentFiles && baselineContext.recentFiles.length ? ('- 涉及相关文件: ' + baselineContext.recentFiles.join(', ')) : null,
        baselineContext.recentErrors ? ('- 主会话最近报错: ' + baselineContext.recentErrors.slice(0, 250)) : null,
        '请针对用户的侧边提问做出精简、专业、切题的解答。如果涉及代码，请用 Markdown 代码块展示。'
    ].filter(Boolean).join('\\n');

    // If no API key and not Ollama, run smart offline analysis
    if (!apiKey && pType !== 'ollama') {
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        const userQuery = lastUserMsg ? lastUserMsg.content.trim() : '';
        
        let offlineAnswer = '';
        if (/总结|进度|状态|做什么|干什么/.test(userQuery)) {
            offlineAnswer = '### 📋 主任务当前进展快照\\n\\n' +
                '- **目标**: ' + (baselineContext.title || '当前工作区任务') + '\\n' +
                '- **最近指令**: ' + (baselineContext.latestUserPrompt || '暂无详细输入') + '\\n' +
                '- **最近处理文件**: ' + (baselineContext.recentFiles && baselineContext.recentFiles.length ? baselineContext.recentFiles.join(', ') : '暂无文件变更') + '\\n' +
                '- **步骤总数**: ' + (baselineContext.totalSteps || 0) + ' 步\\n\\n' +
                '> 💡 **提示**：如需与云端大模型进行深度自由问答，请点击右上角 **⚙️ 设置** 配置 API Key（支持 DeepSeek / OpenAI / Gemini / 本地 Ollama）。';
        } else if (/报错|错误|error|fail|bug/i.test(userQuery)) {
            if (baselineContext.recentErrors) {
                const fence = String.fromCharCode(96, 96, 96);
                offlineAnswer = '### 🔍 主任务最近捕获的异常信息\\n\\n' +
                    fence + '\\n' + baselineContext.recentErrors + '\\n' + fence + '\\n\\n' +
                    '**排查建议**：\\n' +
                    '1. 请检查涉及的相关文件语法或环境依赖。\\n' +
                    '2. 点击下方「📌 引用到主输入框」可一键将报错分析发送给主智能体进行自动修复。';
            } else {
                offlineAnswer = '### ✅ 未检测到明显的执行报错\\n主任务当前运行状态正常，未在最近的执行日志中发现异常中断。如需分析特定错误，请将错误信息直接发在对话中或在右上角 **⚙️ 设置** 中接入大模型。';
            }
        } else if (/文件|代码|修改/.test(userQuery)) {
            const tick = String.fromCharCode(96);
            offlineAnswer = '### 📂 当前任务相关文件列表\\n\\n' +
                (baselineContext.recentFiles && baselineContext.recentFiles.length ? baselineContext.recentFiles.map(f => '- ' + tick + f + tick).join('\\n') : '目前尚未记录到文件写入操作。') +
                '\\n\\n你可以点击下方按钮将需要修改的具体指示填入主对话。';
        } else {
            offlineAnswer = '### 💬 侧边对话智能就绪\\n\\n' +
                '当前正在针对主任务 **「' + (baselineContext.title || '当前对话') + '」** 进行侧向探讨。\\n\\n' +
                '**当前基准上下文：**\\n' +
                '- 涉及文件：' + (baselineContext.recentFiles && baselineContext.recentFiles.length ? baselineContext.recentFiles.join(', ') : '暂无') + '\\n' +
                '- 最近动作：' + (baselineContext.latestAssistantResponse ? baselineContext.latestAssistantResponse.slice(0, 100) + '...' : '等待中') + '\\n\\n' +
                '⚙️ **开启完整大模型对话能力**：\\n' +
                '点击侧边栏右上角 **⚙️ 设置**，即可无缝配置 **DeepSeek (推荐)**、**OpenAI**、**Gemini** 或 **本地 Ollama**，享受无限制的并行头脑风暴！';
        }
        return { success: true, text: offlineAnswer, isOffline: true };
    }

    try {
        const fullMessages = [
            { role: 'system', content: baseSummary },
            ...messages.map(m => ({ role: m.role, content: m.content }))
        ];

        const targetUrl = new URL(baseUrl.replace(/\\/+$/, '') + '/chat/completions');
        const isHttps = targetUrl.protocol === 'https:';
        const client = isHttps ? https : http;

        const postData = JSON.stringify({
            model: model || 'deepseek-chat',
            messages: fullMessages,
            temperature: 0.7,
            max_tokens: 2048
        });

        const headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        };
        if (apiKey) {
            headers['Authorization'] = 'Bearer ' + apiKey;
        }

        const responseText = await new Promise((resolve, reject) => {
            const req = client.request(targetUrl, {
                method: 'POST',
                headers,
                timeout: 30000
            }, (res) => {
                let data = '';
                res.on('data', chunk => { data += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error('API 响应错误 HTTP ' + res.statusCode + ': ' + data.slice(0, 300)));
                    }
                });
            });
            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时 (30s)'));
            });
            req.write(postData);
            req.end();
        });

        const parsed = JSON.parse(responseText);
        const reply = parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content
            ? parsed.choices[0].message.content
            : (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0] ? parsed.candidates[0].content.parts[0].text : '');
        return { success: true, text: reply };
    } catch (err) {
        return { success: false, error: err.message };
    }
});
`;
  const header = `${rawHeader}\n${branchIpcHandler}\n`;
  const autoProxy = extractBetween(
    legacy,
    '    // Auto-Proxy Injection for Electron Main Session (Codex / Webview)',
    '    // Initialize electron-log and override console',
    'main auto proxy'
  );
  let output = insertBefore(official, 'const gotTheLock = electron_1.app.requestSingleInstanceLock();', header, 'main imports');
  output = insertBefore(output, '    // Initialize electron-log and override console', autoProxy, 'main whenReady');
  output = insertAfter(
    output,
    "electron_1.app.on('before-quit', async (event) => {",
    '    global.isQuitting = true;',
    'main graceful background quit state'
  );
  return output;
}

function buildTray(official, legacy) {
  const functionEnd = '\n}\n/**\n * Updates the active agents count in the tray menu.';
  const desiredSetup = extractBetween(
    legacy,
    '    const translatedActions = actions.map',
    functionEnd,
    'tray translated menu and activation handlers'
  );
  // Replace only the menu setup. New official helpers (2.17's WSL insertion,
  // for example) and all subsequent functions must remain in the module.
  const setup = '    contextMenu = electron_1.Menu.buildFromTemplate(actions);\n    tray.setContextMenu(contextMenu);';
  requireSingleAnchor(official, setup, 'official tray menu setup');
  let output = official.replace(setup, `    ${desiredSetup}`);
  const officialLabel = "countItem.label =\n                (count > 0 ? `${count}` : 'No') +\n                    ' agent' +\n                    (count === 1 ? '' : 's') +\n                    ' running';";
  requireSingleAnchor(output, officialLabel, 'official tray agent label');
  output = output.replace(officialLabel, "countItem.label = count > 0 ? `${count} 个智能体运行中` : '没有智能体在运行';");
  assertTrayModuleLoads(output, official);
  return output;
}

// Syntax checks cannot detect exports pointing at deleted declarations. Load
// only this small module against inert dependencies, never the real Electron.
function assertTrayModuleLoads(source, officialSource = source) {
  function load(code) {
    const exports = {};
    const dependencies = {
      electron: {},
      path,
      './utils': {},
      './languageServer': {}
    };
    new vm.Script(code, { filename: 'dist/tray.js' }).runInNewContext({
      exports,
      module: { exports },
      __dirname: '/validation/dist',
      require(name) {
        if (!Object.hasOwn(dependencies, name)) throw new Error(`Unexpected tray dependency: ${name}`);
        return dependencies[name];
      }
    }, { timeout: 1000 });
    return exports;
  }
  const expected = load(officialSource);
  const actual = load(source);
  for (const name of ['createTray', 'updateTrayAgentCount']) {
    if (typeof actual[name] !== 'function') throw new Error(`Missing tray function: ${name}`);
  }
  for (const key of new Set(['createTray', 'updateTrayAgentCount', ...Object.keys(expected)])) {
    if (!Object.hasOwn(actual, key) || typeof actual[key] !== typeof expected[key]) {
      throw new Error(`Tray patch removed or changed official export: ${key}`);
    }
  }
  return Object.keys(actual);
}

function buildUtils(official, legacy) {
  const backgroundLifecycle = extractBetween(
    legacy,
    "    win.on('close', (event) => {",
    '    void win.loadURL(url);',
    'window background lifecycle'
  );
  const backgroundPreference = extractBetween(
    legacy,
    'function shouldRunInBackground() {',
    '/**\n * Focuses a window if it exists, or creates a new one.',
    'window background preference'
  );
  let output = insertBefore(
    official,
    '    void win.loadURL(url);',
    backgroundLifecycle,
    'window close-to-tray extension point'
  );
  output = insertBefore(
    output,
    '/**\n * Focuses a window if it exists, or creates a new one.',
    backgroundPreference,
    'window background preference extension point'
  );
  return output;
}

function buildIpcHandlers(official, legacy) {
  const top = extractBetween(legacy, 'const accountVault_1 = require("./accountVault");', 'const electron_updater_1 = require("electron-updater");', 'ipc helper block');
  const prefix = extractBetween(legacy, "    const GOOGLE_OAUTH_CLIENT_ID = '", '    // Dialog', 'ipc account prefix');
  const suffixStart = '    // Custom telemetry logger for Antigravity Quota';
  const suffixIndex = legacy.indexOf(suffixStart);
  const finalBrace = legacy.lastIndexOf('\n}');
  if (suffixIndex < 0 || finalBrace <= suffixIndex) throw new Error('Legacy ipc suffix markers are missing');
  const suffix = legacy.slice(suffixIndex, finalBrace).trim();
  let output = insertAfter(official, 'const electron_1 = require("electron");', top, 'ipc imports');
  output = insertAfter(output, 'function registerIpcHandlers(storageManager) {', prefix, 'ipc register prefix');
  const outputFinalBrace = output.lastIndexOf('\n}');
  if (outputFinalBrace < 0) throw new Error('Official ipcHandlers final brace is missing');
  output = `${output.slice(0, outputFinalBrace)}\n${suffix}\n${output.slice(outputFinalBrace)}`;
  return output;
}

function buildLanguageServerStartOverlay(officialStart) {
  let output = officialStart;
  requireSingleAnchor(output, 'function startLanguageServer(', 'official languageServer start function');

  const apiEndpoint = "            'https://generativelanguage.googleapis.com',";
  const cloudEndpoint = "            'https://daily-cloudcode-pa.googleapis.com',";
  requireSingleAnchor(output, apiEndpoint, 'languageServer API endpoint');
  requireSingleAnchor(output, cloudEndpoint, 'languageServer Cloud Code endpoint');
  output = output.replace(apiEndpoint, '            apiServerUrl,');
  output = output.replace(cloudEndpoint, '            cloudCodeEndpoint,');

  output = output.replace('function startLanguageServer(', 'async function startLanguageServer(');
  const signatureEnd = output.indexOf('\n');
  if (signatureEnd < 0) throw new Error('Official languageServer start function signature is incomplete');
  const signature = output.slice(0, signatureEnd);
  output = insertAfter(output, signature, [
    '    let proxyString = null;',
    '    let tokenMonitorAvailable = false;',
    '    try {',
    '        [proxyString, tokenMonitorAvailable] = await Promise.all([',
    "            electron_1.session.defaultSession.resolveProxy('https://generativelanguage.googleapis.com').catch(() => null),",
    '            isTokenMonitorAvailable(),',
    '        ]);',
    '    } catch (err) {',
    "        console.error('[Proxy Auto-Detect] Failed to resolve system proxy, proceeding with direct connection. Error:', err);",
    '    }',
    '    const apiServerUrl = tokenMonitorAvailable',
    '        ? `http://${TOKEN_MONITOR_HOST}:${TOKEN_MONITOR_API_PORT}`',
    "        : 'https://generativelanguage.googleapis.com';",
    '    const cloudCodeEndpoint = tokenMonitorAvailable',
    '        ? `http://${TOKEN_MONITOR_HOST}:${TOKEN_MONITOR_CLOUD_PORT}`',
    "        : 'https://daily-cloudcode-pa.googleapis.com';",
    '    console.log(tokenMonitorAvailable',
    '        ? `[Token Monitor] Routing model traffic through ${TOKEN_MONITOR_HOST}:${TOKEN_MONITOR_API_PORT}/${TOKEN_MONITOR_CLOUD_PORT}`',
    "        : '[Token Monitor] AGY Hub is unavailable; using official endpoints directly.');"
  ].join('\n'), 'languageServer routing overlay');

  const envAnchor = '        const env = { ...process.env, ...(0, shell_env_1.shellEnvSync)() };';
  output = insertAfter(output, envAnchor, [
    "        if (proxyString && typeof proxyString === 'string') {",
    "            const proxyPart = proxyString.split(';').find(part => part.trim().startsWith('PROXY'));",
    '            if (proxyPart) {',
    "                const addr = proxyPart.replace('PROXY', '').trim();",
    '                if (addr) {',
    "                    env['HTTP_PROXY'] = `http://${addr}`;",
    "                    env['HTTPS_PROXY'] = `http://${addr}`;",
    "                    console.log(`[Proxy Auto-Detect] Set HTTP_PROXY/HTTPS_PROXY = http://${addr}`);",
    '                }',
    '            }',
    '        }'
  ].join('\n'), 'languageServer proxy environment overlay');
  return output;
}

function buildLanguageServer(official, legacy) {
  let output = insertAfter(official, 'exports.getLsPort = getLsPort;', 'exports.getLsCsrf = getLsCsrf;', 'languageServer export');
  output = insertAfter(output, 'const stream_1 = require("stream");', 'const net_1 = __importDefault(require("net"));', 'languageServer net import');
  output = insertAfter(output, 'const MAX_STDERR_BUFFER = 100000;', [
    "const TOKEN_MONITOR_HOST = '127.0.0.1';",
    'const TOKEN_MONITOR_API_PORT = 31000;',
    'const TOKEN_MONITOR_CLOUD_PORT = 31001;'
  ].join('\n'), 'languageServer monitor constants');
  output = insertAfter(output, 'let _lsPort = 0;', "let _lsCsrf = '';", 'languageServer csrf state');
  const getter = extractBetween(legacy, 'function getLsCsrf() {', '/** Clears the language server process reference', 'languageServer csrf getter');
  output = insertBefore(output, '/** Clears the language server process reference', getter, 'languageServer csrf getter target');
  const monitorHelpers = extractBetween(legacy, 'function isLocalPortAvailable(', '/**\n * Spawn the language server', 'languageServer monitor helpers');
  output = insertBefore(output, '/**\n * Spawn the language server', monitorHelpers, 'languageServer helper target');
  const officialStart = extractBetween(output, 'function startLanguageServer(', '/** Sets whether the termination was intentional', 'official startLanguageServer');
  const overlaidStart = buildLanguageServerStartOverlay(officialStart);
  output = replaceBetween(output, 'function startLanguageServer(', '/** Sets whether the termination was intentional', overlaidStart, 'official startLanguageServer');
  output = insertAfter(output, '    setIntentionalTermination(false); // Reset', '    _lsCsrf = csrf;', 'languageServer csrf assignment');
  return output;
}

function syntaxCheck(relativePath, source) {
  new vm.Script(source, { filename: relativePath });
}

function assertUniqueIpcHandlers(relativePath, source) {
  const channels = new Map();
  const pattern = /ipcMain\.handle\(\s*(['"])([^'"]+)\1/g;
  for (const match of source.matchAll(pattern)) {
    channels.set(match[2], (channels.get(match[2]) || 0) + 1);
  }
  const duplicates = [...channels.entries()].filter(([, count]) => count > 1);
  if (duplicates.length) {
    throw new Error(`${relativePath} registers duplicate ipcMain handlers: ${duplicates.map(([name, count]) => `${name} (${count})`).join(', ')}`);
  }
}

function buildCompatibleTree(options) {
  const { officialDir, legacyDir, runtimeRules = [] } = options;
  const files = {
    'dist/preload.js': buildPreload,
    'dist/main.js': buildMain,
    'dist/tray.js': buildTray,
    'dist/utils.js': buildUtils,
    'dist/ipcHandlers.js': buildIpcHandlers,
    'dist/languageServer.js': buildLanguageServer
  };
  const report = { files: [], appliedRuntimeRules: [] };
  for (const [relativePath, builder] of Object.entries(files)) {
    const officialPath = path.join(officialDir, ...relativePath.split('/'));
    const legacyPath = path.join(legacyDir, ...relativePath.split('/'));
    if (!fs.existsSync(officialPath)) throw new Error(`Official client is missing required capability: ${relativePath}`);
    if (!fs.existsSync(legacyPath)) throw new Error(`Legacy payload is missing: ${relativePath}`);
    const official = fs.readFileSync(officialPath, 'utf8');
    const legacy = fs.readFileSync(legacyPath, 'utf8');
    let rebuilt = builder(official, legacy);
    const ruled = applyLiteralRules(rebuilt, runtimeRules, relativePath);
    rebuilt = ruled.source;
    syntaxCheck(relativePath, rebuilt);
    if (relativePath === 'dist/tray.js') assertTrayModuleLoads(rebuilt, official);
    assertUniqueIpcHandlers(relativePath, rebuilt);
    fs.writeFileSync(officialPath, rebuilt, 'utf8');
    report.appliedRuntimeRules.push(...ruled.applied);
    report.files.push({ file: relativePath, officialBytes: Buffer.byteLength(official), rebuiltBytes: Buffer.byteLength(rebuilt) });
  }
  const legacyVault = path.join(legacyDir, 'dist', 'accountVault.js');
  if (fs.existsSync(legacyVault)) {
    const targetVault = path.join(officialDir, 'dist', 'accountVault.js');
    fs.copyFileSync(legacyVault, targetVault);
    syntaxCheck('dist/accountVault.js', fs.readFileSync(targetVault, 'utf8'));
    report.files.push({ file: 'dist/accountVault.js', addedByPatch: true, rebuiltBytes: fs.statSync(targetVault).size });
  }
  const menuPath = path.join(officialDir, 'dist', 'menu.js');
  if (fs.existsSync(menuPath)) {
    let menuSource = fs.readFileSync(menuPath, 'utf8');
    menuSource = menuSource.replace("label: 'New Window',", "label: '新建窗口',");
    menuSource = menuSource.replace("label: 'Docs',", "label: '文档',");
    menuSource = menuSource.replace("return { label: 'Connect to WSL', submenu };", "return { label: '连接到 WSL', submenu };");
    menuSource = menuSource.replace("return { label: 'Reopen Locally', click:", "return { label: '在本地重新打开', click:");
    syntaxCheck('dist/menu.js', menuSource);
    fs.writeFileSync(menuPath, menuSource, 'utf8');
    report.files.push({ file: 'dist/menu.js', rebuiltBytes: fs.statSync(menuPath).size });
  }
  return report;
}

module.exports = {
  normalizeVersion,
  countHits,
  applyLiteralRules,
  buildCompatibleTree,
  buildPreload,
  buildMain,
  buildTray,
  assertTrayModuleLoads,
  buildUtils,
  buildIpcHandlers,
  buildLanguageServer,
  buildLanguageServerStartOverlay,
  assertUniqueIpcHandlers
};
