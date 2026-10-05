const fs = require('fs');
const path = require('path');
const os = require('os');
const vm = require('vm');
const asar = require('@electron/asar');

const workbenchDir = path.resolve(__dirname, '..', 'patch-workbench');
const legacyPayloadAsar = path.join(workbenchDir, 'legacy-payload.asar');

if (!fs.existsSync(legacyPayloadAsar)) {
  console.error('legacy-payload.asar not found:', legacyPayloadAsar);
  process.exit(1);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-trans-update-'));
console.log('Extracting legacy-payload.asar to:', tempDir);
asar.extractAll(legacyPayloadAsar, tempDir);

const preloadPath = path.join(tempDir, 'dist', 'preload.js');
let preload = fs.readFileSync(preloadPath, 'utf8');

// 1. New dictionary entries to merge
const newDictionaryEntries = {
  // UI Navigation, Tabs & Views
  "More options": "更多选项",
  "More actions": "更多操作",
  "Project options": "项目选项",
  "Undo to this point": "撤销至此处",
  "Scroll to Bottom": "滚动到底部",
  "Scroll to top": "滚动到顶部",
  "Conversation Log": "对话日志",
  "Task Log": "任务日志",
  "File Viewer": "文件查看器",
  "File Viewer header": "文件查看器标头",
  "Terminal tab": "终端标签页",
  "Review tab": "审查标签页",
  "Overview tab": "概览标签页",
  "File path breadcrumbs": "文件路径导航",
  "Drag to select a region to comment": "拖动以框选评论区域",
  "Maximize Pane": "最大化窗格",
  "Restore Pane": "还原窗格",
  "Minimize Pane": "最小化窗格",
  "Open IDE": "打开 IDE",
  "Background Task Output": "后台任务输出",
  "Background Task Output header": "后台任务输出标头",
  "Send message": "发送消息",
  "Send message Enter": "发送消息 (Enter)",
  "Submit (Enter)": "提交 (Enter)",
  "Send Now": "立即发送",
  "No answer provided": "未提供回答",
  "Cancel All Tasks": "取消全部任务",
  "Cancel questionnaire": "取消问卷",
  "Killed task": "已终止任务",
  "Checked task": "已检查任务",
  "Checking task": "正在检查任务",
  "Checking task status": "正在检查任务状态",
  "Checking status": "正在检查状态",
  "Queued message sent": "排队消息已发送",
  "Collapse queued messages": "折叠排队消息",
  "Expand queued messages": "展开排队消息",
  "Sends after agent finishes working": "智能体完成工作后发送",
  "User cancelled agent execution": "用户已取消智能体执行",
  "User cancelled agent execution.": "用户已取消智能体执行。",
  "Agent execution failed": "智能体执行失败",
  "Agent execution failed.": "智能体执行失败。",
  "Revert file changes": "还原文件更改",
  "Task not found": "未找到任务",
  "Select Environment": "选择环境",
  "Select Agent": "选择智能体",
  "Main Agent": "主智能体",
  "Sub Agent": "子智能体",
  "Subagent": "子智能体",
  "Subagents": "子智能体",
  "Dismiss notification": "忽略通知",
  "Failed to load image": "加载图像失败",
  "Mark Unread": "标记为未读",
  "Mark as read": "标记为已读",
  "Inspect Options": "检查选项",
  "Yes, and always allow in this conversation": "是，在此对话中总是允许",
  "Allow reading this URL?": "允许读取此 URL 吗？",
  "Allow running this command?": "允许运行此命令吗？",
  "Allow write access to this path?": "允许写入此路径吗？",
  "Select project": "选择项目",
  "Select model": "选择模型",
  "No Project": "无项目",
  "All Projects": "所有项目",
  "Recent Projects": "最近项目",
  "Recent Conversations": "最近对话",
  "Pinned Conversations": "置顶对话",
  "Archived Conversations": "已归档对话",
  "Search conversations": "搜索对话",
  "New conversation": "新建对话",
  "Clear conversation": "清空对话",
  "Delete conversation": "删除对话",
  "Rename conversation": "重命名对话",
  "Export conversation": "导出对话",
  "Branch conversation": "创建对话分支",
  "Fork conversation": "分叉对话",
  "Share conversation": "分享对话",
  "Copy conversation": "复制对话",
  "Copy code": "复制代码",
  "Copy message": "复制消息",
  "Copied!": "已复制！",
  "Diff view": "差异对比视图",
  "Inline diff": "内联差异",
  "Side-by-side diff": "并排差异",
  "Accept change": "接受更改",
  "Reject change": "拒绝更改",
  "Accept all changes": "接受所有更改",
  "Reject all changes": "拒绝所有更改",
  "Apply changes": "应用更改",
  "Discard changes": "放弃更改",
  "Review changes": "审查更改",
  "Keep changes": "保留更改",
  "Undo changes": "撤销更改",
  "View diff": "查看差异",
  "Open file": "打开文件",
  "Open folder": "打开文件夹",
  "Reveal in File Explorer": "在文件资源管理器中显示",
  "Reveal in Finder": "在 Finder 中显示",
  "Show in folder": "在文件夹中显示",
  "Show in Explorer": "在资源管理器中显示",
  "Toggle terminal": "切换终端",
  "Clear terminal": "清空终端",
  "Kill terminal": "终止终端",
  "Terminal output": "终端输出",
  "Command output": "命令输出",
  "Exit code": "退出代码",
  "Running command": "正在运行命令",
  "Command completed": "命令已完成",
  "Command failed": "命令失败",
  "Task completed": "任务已完成",
  "Task failed": "任务失败",
  "Task cancelled": "任务已取消",
  "Task running": "任务运行中",
  "All tasks completed": "所有任务已完成",
  "No running tasks": "没有运行中的任务",
  "Active tasks": "活跃任务",
  "Pending tasks": "待处理任务",
  "Completed tasks": "已完成任务",

  // Slash Commands & Descriptions
  "Plan carefully before executing a task.": "在执行任务前进行仔细规划。",
  "Interview me to align on a plan.": "通过交互式访谈对齐设计方案与计划。",
  "Invoke a browser agent for web tasks.": "调用浏览器智能体执行网页相关任务。",
  "Ask a quick question without interrupting the main conversation.": "在不中断主对话的情况下快速提问。",
  "Invoke the Boost multi-agent orchestrator for complex tasks.": "为复杂任务调用 Boost 多智能体编排器。",
  "Reflect on recent successes or corrections to capture reusable skills or rules.": "反思近期成功经验或纠正，提炼可复用的技能或规则。",
  "Run an instruction on a recurring schedule or as a one-time timer.": "按周期调度或单次定时器执行指令。",
  "Run until the specified goal is completely finished.": "自主持续运行，直至指定目标完全达成。",
  "Preview teamwork and multi-agent collaboration.": "预览团队协作与多智能体配合流程。",
  "Automatically migrate legacy workflows to modern skills across global and workspace configurations.": "在全局和工作区配置中，将旧版工作流自动迁移到现代技能。",
  "Use when the user wants to set or change their Obsidian vault path, or says \"vault\", \"set vault\", or \"change vault\".": "用于设置或更改 Obsidian 知识库路径。",
  "Use when the user wants to find notes by keyword or filename, or says \"search\", \"find notes\", or \"look for\".": "用于按关键词或文件名搜索知识库笔记。",
  "Use when the user wants to explore connections between notes, see what links to or from a note, or says \"links\", \"backlinks\", \"connections\", or \"graph\".": "用于探索笔记间的双向链接与关联图谱。",
  "Use when the user wants to index their vault for semantic search, rebuild the RAG index, or says \"index\", \"reindex\", or \"rebuild index\".": "用于为知识库构建语义搜索索引或重建 RAG 索引。",
  "Use when the user asks a question about their vault, wants to explore a topic across notes, or says \"research\", \"find out\", \"what do I know about\", or \"summarize my notes on\".": "用于对知识库笔记进行深度研究、主题探索与摘要汇总。",
  "Use when the user wants to work with their daily note — view today's entry, add a log, do a daily review, or capture quick thoughts.": "用于日常日志记录、每日回顾与灵感速记。",
  "Use when the user wants to audit vault link health, find broken wikilinks, orphaned notes, or semantic clusters.": "用于审计链接健康度、查找失效双链或孤立笔记。",
  "Use when the user wants to find and insert missing wikilinks across vault notes.": "用于在笔记间发现并插入缺失的双向链接。",
  "Use when the user wants to promote cross-project knowledge to the global Engineering/ folder.": "用于将跨项目通用知识提炼归纳至全局工程目录。",
  "Use after creating a new Engineering/ note to suggest which Maps of Content (MOCs) it belongs in.": "在创建工程笔记后，推荐其所属的知识导图 (MOC)。",
  "Use when the user wants a health audit of the vault — stale content, provenance drift, frontmatter compliance, or MOC coverage gaps.": "用于对知识库进行全面健康检查，发现陈旧内容与元数据缺失。",
  "Use when the user wants to ingest external sources into the vault — PDFs, markdown files, transcripts, Readwise exports, or any document.": "用于导入外部文档、PDF、摘录或转录内容至知识库。",

  // Settings & Configuration
  "General Settings": "常规设置",
  "Account Settings": "账户设置",
  "Model Settings": "模型设置",
  "Agent Settings": "智能体设置",
  "Appearance Settings": "外观设置",
  "Theme Settings": "主题设置",
  "Keybinding Settings": "快捷键设置",
  "Telemetry Settings": "遥测设置",
  "Developer Settings": "开发者设置",
  "Experimental Features": "实验性功能",
  "Custom Prompts": "自定义提示词",
  "System Prompt": "系统提示词",
  "User Prompt": "用户提示词",
  "Temperature": "温度 (Temperature)",
  "Top P": "采样阈值 (Top P)",
  "Max Output Tokens": "最大输出标记数",
  "Context Window": "上下文窗口",
  "Rate Limit": "速率限制",
  "Quota Limit": "配额限制",
  "AI Credits": "AI 点数",
  "Remaining Quota": "剩余配额",
  "Reset Time": "重置时间",
  "Next Reset": "下次重置",

  // Skills & Plugins & MCP
  "Enabled Skills": "已启用的技能",
  "Disabled Skills": "已禁用的技能",
  "Add Skill": "添加技能",
  "Remove Skill": "移除技能",
  "Reload Skills": "重新加载技能",
  "Installed MCP Servers": "已安装的 MCP 服务端",
  "Add MCP Server": "添加 MCP 服务端",
  "Configure MCP Server": "配置 MCP 服务端",
  "Restart MCP Server": "重启 MCP 服务端",
  "MCP Server Status": "MCP 服务端状态",
  "Connected": "已连接",
  "Disconnected": "已断开",
  "Connecting...": "正在连接...",
  "Error connecting": "连接出错",

  // Menu items
  "New Window": "新建窗口",
  "Docs": "文档",
  "Connect to WSL": "连接到 WSL",
  "Reopen Locally": "在本地重新打开"
};

// Insert new dictionary entries
const dictInsertAnchor = '  const dictionary = {';
const dictInsertIndex = preload.indexOf(dictInsertAnchor);
if (dictInsertIndex === -1) throw new Error('Cannot find dictionary start in preload.js');

const dictLines = Object.entries(newDictionaryEntries)
  .map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)},`)
  .join('\n');

preload = preload.slice(0, dictInsertIndex + dictInsertAnchor.length) + '\n' + dictLines + preload.slice(dictInsertIndex + dictInsertAnchor.length);
console.log('Inserted', Object.keys(newDictionaryEntries).length, 'new dictionary entries.');

// 2. Fix substringReplacements (REMOVE { search: "of", replace: "共" } and { search: "Download", replace: "下载" })
const subStart = preload.indexOf('  const substringReplacements = [');
const subEnd = preload.indexOf('  function translateString(text) {', subStart);
if (subStart === -1 || subEnd === -1) throw new Error('Cannot find substringReplacements in preload.js');

const cleanSubstringReplacements = `  const substringReplacements = [
    { search: " tokens", replace: " 标记" },
    { search: "Load older messages, showing", replace: "加载历史消息，当前显示" },
    { search: "See all", replace: "查看全部" },
    { search: "Worked for", replace: "已工作 " },
    { search: "Thinking for", replace: "已思考 " },
    { search: 'Plugins are packaged collections of skills and MCPs to help the Agent in Antigravity work with Google developer products. You can always change your choices in Settings.', replace: '插件是包含技能和 MCP 服务封装的资源包，旨在协助 Antigravity 智能体调用 Google 开发者产品。您随时可以在设置中更改选择。' },
    { search: 'Plugins are packaged collections of skills and MCPs to help the Agent', replace: '插件是包含技能和 MCP 服务封装的资源包，旨在协助智能体' },
    { search: 'in Antigravity', replace: '在 Antigravity 中' },
    { search: 'work with Google', replace: '调用 Google' },
    { search: 'developer products.', replace: '开发者产品。' },
    { search: 'Developer products.', replace: '开发者产品。' },
    { search: 'You can always change your choices in Settings.', replace: '您随时可以在设置中更改选择。' },
    { search: 'Reliable automation, in-depth debugging, and performance analysis in Chrome using Chrome DevTools and Puppeteer', replace: '在 Chrome 浏览器中利用 DevTools 调试协议与 Puppeteer 实现高可靠性自动化、深度调试及性能剖析' },
    { search: 'Dart and Flutter', replace: 'Dart & Flutter' },
    { search: 'Skills providing tailored instructions for happy path Dart & Flutter development workflows.', replace: '针对 Dart & Flutter 基础及常用开发工作流提供定制化的智能体指令集支持。' },
    { search: 'Configure the browser subagent. Running this feature requires Google Chrome to be installed. The browser subagent can be invoked by typing /browser in the conversation input box.', replace: '配置浏览器子智能体。运行此功能需要安装 Google Chrome 浏览器。可以通过在对话输入框中输入 /browser 来调用浏览器子智能体。' },
    { search: 'Configure the browser subagent. Running this feature requires', replace: '配置浏览器子智能体。运行此功能需要安装' },
    { search: 'to be installed', replace: '即可' },
    { search: 'The browser subagent can be invoked by typing', replace: '可以通过在对话输入框中输入' },
    { search: 'in the conversation input box.', replace: '来调用浏览器智能体。' },
    { search: 'Browser Actuation Permissions', replace: '浏览器动作执行权限' },
    { search: 'Allow/deny agent browser actuation access to specific URLs.', replace: '允许或阻止智能体在浏览器中操作访问特定的 URL 地址列表。' },
    { search: 'Search MCP servers by name', replace: '按名称搜索 MCP 服务端' },
    { search: 'Interact with the Dux platform using natural language. This MCP server enables agentic capabilities for account clients.', replace: '使用自然语言与 Dux 平台进行交互。该 MCP 服务端为账户客户端启用了智能体功能。' },
    { search: 'Connect your AI assistant to Firebase. Exposes tools for database, auth, and analytics to build and deploy app projects.', replace: '将您的 AI 助手连接到 Firebase。提供用于数据库、身份验证和分析的工具，以构建和部署应用项目。' },
    { search: 'The go-pls (Go Language Server) MCP server provides tools for semantic code navigation, refactoring, and code completion in your Go projects.', replace: 'go-pls (Go 语言服务器) MCP 服务端提供用于 Go 项目中语义代码导航、重构和代码补全的工具。' },
    { search: 'Interact with BigQuery data using natural language. This MCP server lists datasets, runs queries, and inspects database schemas.', replace: '使用自然语言与 BigQuery 数据进行交互。该 MCP 服务端可以列出数据集、运行查询并检查数据库 Schema。' },
    { search: 'The AlloyDB for PostgreSQL server MCP exposes a schema and a set of tools to manage AlloyDB clusters and resources, manage users, create and restore backups', replace: 'AlloyDB for PostgreSQL MCP 服务端公开了 Schema 和一组工具，用于管理 AlloyDB 集群和资源、管理用户、创建和恢复备份' },
    { search: 'The Google Cloud Bigtable Admin MCP server lets you manage Bigtable resources.', replace: 'Google Cloud Bigtable Admin MCP 服务端允许您管理 Bigtable 资源。' },
    { search: 'The Cloud SQL template MCP server lets you create and run Cloud SQL tools to examine database performance, configure instances, view logs, and more.', replace: 'Cloud SQL 模板 MCP 服务端允许您创建和运行 Cloud SQL 工具，以检查数据库性能、配置实例、查看日志等。' },
    { search: 'The Spanner template MCP server lets you create and run Spanner tools to create, querying, and query Spanner resources.', replace: 'Spanner 模板 MCP 服务端允许您创建和运行 Spanner 工具，以创建、查询和管理 Spanner 资源。' },
    { search: 'Connect your AI assistant to Looker business intelligence. This MCP server enables data exploration and content management by allowing agents to execute runs', replace: '将您的 AI 助手连接到 Looker 商业智能。该 MCP 服务端允许智能体执行数据探索和内容管理' },
    { search: 'Connect your AI assistant to the Knowledge Sharing (formerly known as Dataplex)', replace: '将您的 AI 助手连接到知识共享（前身为 Dataplex）' },
    { search: 'The MCP Toolbox for Databases is an open-source MCP server designed to simplify and secure the development of tools for interacting with databases.', replace: 'MCP Toolbox for Databases 是一个开源的 MCP 服务端，旨在简化并保护与数据库交互的工具开发。' }
  ];\n\n`;

preload = preload.slice(0, subStart) + cleanSubstringReplacements + preload.slice(subEnd);
console.log('Replaced substringReplacements (removed destructive "of" -> "共" bug).');

// 3. Replace translateString with robust, bug-free, comprehensive implementation
const transStart = preload.indexOf('  function translateString(text) {');
const transEnd = preload.indexOf('  const codeClassPattern =', transStart);
if (transStart === -1 || transEnd === -1) throw new Error('Cannot find translateString in preload.js');

const newTranslateString = `  function translateString(text) {
    if (!text) return text;
    
    let replacedText = text;
    for (const rule of substringReplacements) {
      if (replacedText.includes(rule.search)) {
        replacedText = replacedText.replaceAll(rule.search, rule.replace);
      }
    }
    
    text = replacedText;
    const trimmed = text.trim();
    if (!trimmed) return text;

    // 1. Direct Literal Match (Exact dictionary lookup first - fastest & most accurate)
    if (dictionary[trimmed]) {
      return text.replace(trimmed, dictionary[trimmed]);
    }
    const trimmedLower = trimmed.toLowerCase();
    if (dictionary[trimmedLower]) {
      return text.replace(trimmed, dictionary[trimmedLower]);
    }

    let dynamicMatch = trimmed;
    let isDynamic = false;

    // --- Dynamic Agent Status & Logs Regex Rules ---
    // Exploring files, tasks, commands
    if (/^Exploring\\b/i.test(trimmed)) {
      let res = trimmed;
      res = res.replace(/^Exploring\\s+/i, '正在浏览 ');
      res = res.replace(/(\\d+)\\s+files?/gi, '$1 个文件');
      res = res.replace(/(\\d+)\\s+tasks?/gi, '$1 个任务');
      res = res.replace(/running\\s+(\\d+)\\s+commands?/gi, '运行 $1 个命令');
      res = res.replace(/,\\s*/g, '，');
      dynamicMatch = res;
      isDynamic = true;
    } else if (/^Explored\\b/i.test(trimmed)) {
      if (/^Explored \\d+ files?$/i.test(trimmed)) {
        dynamicMatch = dynamicMatch.replace(/^Explored (\\d+) files?(.*)/i, '已浏览 $1 个文件$2');
      } else {
        dynamicMatch = dynamicMatch.replace(/^Explored (.*)/i, '已浏览 $1');
      }
      isDynamic = true;
    }

    // Running / Ran commands
    if (!isDynamic && /^(?:Running|Ran)\\s+\\d+\\s+commands?$/i.test(trimmed)) {
      if (/^Running/i.test(trimmed)) {
        dynamicMatch = trimmed.replace(/^Running\\s+(\\d+)\\s+commands?$/i, '正在运行 $1 个命令');
      } else {
        dynamicMatch = trimmed.replace(/^Ran\\s+(\\d+)\\s+commands?$/i, '已运行 $1 个命令');
      }
      isDynamic = true;
    } else if (!isDynamic && /^Ran\\s+(.+)$/i.test(trimmed)) {
      dynamicMatch = \`已运行 \${trimmed.slice(4)}\`;
      isDynamic = true;
    }

    // Quota reset countdown: "Resets in 4h 7m", "Resets in 6d 13h", "Resets in 25m"
    if (!isDynamic && /^Resets in\\s+(\\d+d)?\\s*(\\d+h)?\\s*(\\d+m)?\\s*(\\d+s)?$/i.test(trimmed)) {
      let timeStr = trimmed.replace(/^Resets in\\s+/i, '');
      timeStr = timeStr.replace(/(\\d+)d\\s*/gi, '$1天 ');
      timeStr = timeStr.replace(/(\\d+)h\\s*/gi, '$1小时 ');
      timeStr = timeStr.replace(/(\\d+)m\\s*/gi, '$1分钟 ');
      timeStr = timeStr.replace(/(\\d+)s\\s*/gi, '$1秒 ');
      dynamicMatch = \`\${timeStr.trim()}后重置\`;
      isDynamic = true;
    }

    // Dynamic task / tool action completion: "Check git status finished" -> "Check git status 已完成"
    if (!isDynamic && /^(.+)\\s+finished$/i.test(trimmed)) {
      const prefix = trimmed.slice(0, -9).trim();
      const prefixZh = dictionary[prefix] || coreWords[prefix.toLowerCase()] || prefix;
      dynamicMatch = \`\${prefixZh} 已完成\`;
      isDynamic = true;
    }

    // Select project / model dropdown current item
    if (!isDynamic && /^Select project, current:\\s*(.*)$/i.test(trimmed)) {
      const proj = trimmed.replace(/^Select project, current:\\s*/i, '');
      const projZh = proj === 'No Project' ? '无项目' : (dictionary[proj] || proj);
      dynamicMatch = \`选择项目，当前：\${projZh}\`;
      isDynamic = true;
    }
    if (!isDynamic && /^Select model, current:\\s*(.*)$/i.test(trimmed)) {
      const modelName = trimmed.replace(/^Select model, current:\\s*/i, '');
      const translatedModel = dictionary[modelName] || modelName;
      dynamicMatch = \`选择模型，当前：\${translatedModel}\`;
      isDynamic = true;
    }

    // Dynamic tasks running
    if (!isDynamic && /^\\d+ tasks? running$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/^(\\d+) tasks? running$/i, '$1 个任务运行中');
      isDynamic = true;
    }
    if (!isDynamic && /^\\d+ files?,\\s*\\d+ folders?$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/^(\\d+) files?,\\s*(\\d+) folders?$/i, '$1 个文件，$2 个文件夹');
      isDynamic = true;
    }
    if (!isDynamic && /^\\d+ folders?,\\s*\\d+ search(?:es)?$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/^(\\d+) folders?,\\s*(\\d+) search(?:es)?$/i, '$1 个文件夹，$2 次搜索');
      isDynamic = true;
    }
    if (!isDynamic && /^Send all \\((\\d+)\\)$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/^Send all \\((\\d+)\\)$/i, '发送全部 ($1)');
      isDynamic = true;
    }
    if (!isDynamic && /^Remove\\s+(.+)$/i.test(trimmed)) {
      dynamicMatch = \`移除 \${trimmed.slice(7)}\`;
      isDynamic = true;
    }
    if (!isDynamic && /^Compacting · (\\d+)s$/i.test(trimmed)) {
      dynamicMatch = \`正在压缩上下文 · \${RegExp.$1}秒\`;
      isDynamic = true;
    }
    if (!isDynamic && /^Checked task(?:-(.+))?$/i.test(trimmed)) {
      const taskId = trimmed.replace(/^Checked task-?/i, '');
      dynamicMatch = taskId ? \`已检查任务-\${taskId}\` : '已检查任务';
      isDynamic = true;
    }
    if (!isDynamic && /^Checking\\s+(.+)\\s+status$/i.test(trimmed)) {
      const target = trimmed.replace(/^Checking\\s+/i, '').replace(/\\s+status$/i, '');
      const targetZh = dictionary[target] || target;
      dynamicMatch = \`正在检查 \${targetZh} 状态\`;
      isDynamic = true;
    }
    if (!isDynamic && /^Killing task-(.+)$/i.test(trimmed)) {
      const taskId = trimmed.replace(/^Killing task-/i, '');
      dynamicMatch = \`正在终止任务-\${taskId}\`;
      isDynamic = true;
    }
    if (!isDynamic && /^Killed task(?:-(.+))?$/i.test(trimmed)) {
      const taskId = trimmed.replace(/^Killed task-?/i, '');
      dynamicMatch = taskId ? \`已终止任务-\${taskId}\` : '已终止任务';
      isDynamic = true;
    }
    if (!isDynamic && /^Wait for task-(.+)\\s+completion:\\s*(.+)$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/^Wait for task-(.+)\\s+completion:\\s*(.+)$/i, '等待任务-$1 完成：$2');
      isDynamic = true;
    }

    if (!isDynamic && /^Worked for \\d+s$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/Worked for (\\d+)s/i, '已工作 $1 秒');
      isDynamic = true;
    }
    if (!isDynamic && /^Thought for \\d+s$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/Thought for (\\d+)s/i, '已思考 $1 秒');
      isDynamic = true;
    }
    if (!isDynamic && /^Edited .* \\+\\d+ -\\d+$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/Edited (.*) \\+(\\d+) -(\\d+)/i, '编辑了 $1 (+$2 -$3)');
      isDynamic = true;
    }
    if (!isDynamic && /^\\d+ files? changed(.*)$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/^(\\d+) files? changed(.*)/i, '$1 个文件已更改$2');
      isDynamic = true;
    }
    if (!isDynamic && /^Canceled\\s+(.*)$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/^Canceled\\s+(.*)/i, '已取消 $1');
      isDynamic = true;
    }
    if (!isDynamic && /^No more older messages, showing \\d+ of \\d+$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/No more older messages, showing (\\d+) of (\\d+)/i, '没有更早的消息，显示第 $1 项（共 $2 项）');
      isDynamic = true;
    }
    if (!isDynamic && /^\\d+ files?,\\s*\\d+ pages?$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/(\\d+) files?,\\s*(\\d+) pages?/i, '$1 个文件，$2 个页面');
      isDynamic = true;
    }
    if (!isDynamic && /^\\d+ searches?$/i.test(trimmed)) {
      dynamicMatch = dynamicMatch.replace(/(\\d+) searches?/i, '$1 次搜索');
      isDynamic = true;
    }

    // 5-hour limit dynamic text (Hit warnings)
    const matchHit5hWeekly = trimmed.match(/^You have hit your 5-hour limit, so the weekly limit does not currently apply\\. Your 5-hour limit will refresh in (\\d+) hours?, (\\d+) minutes?\\.?$/i);
    if (!isDynamic && matchHit5hWeekly) {
      dynamicMatch = \`您已达到 5 小时额度限制，因此每周限额当前暂不适用。您的 5 小时限额将在 \${matchHit5hWeekly[1]} 小时 \${matchHit5hWeekly[2]} 分钟后重置。\`;
      isDynamic = true;
    } else if (!isDynamic) {
      const matchHit5hWeeklyMin = trimmed.match(/^You have hit your 5-hour limit, so the weekly limit does not currently apply\\. Your 5-hour limit will refresh in (\\d+) minutes?\\.?$/i);
      if (matchHit5hWeeklyMin) {
        dynamicMatch = \`您已达到 5 小时额度限制，因此每周限额当前暂不适用。您的 5 小时限额将在 \${matchHit5hWeeklyMin[1]} 分钟后重置。\`;
        isDynamic = true;
      }
    }

    const matchHit5hRefresh = trimmed.match(/^You have hit your 5-hour limit, it will refresh in (\\d+) hours?, (\\d+) minutes?\\. If on a supported paid plan, you can use AI credits in the interim\\.?$/i);
    if (!isDynamic && matchHit5hRefresh) {
      dynamicMatch = \`您已达到 5 小时频度限额，限额将在 \${matchHit5hRefresh[1]} 小时 \${matchHit5hRefresh[2]} 分钟后充值重置。在付费订阅计划下，您可以在此期间超额使用 AI 点数。\`;
      isDynamic = true;
    } else if (!isDynamic) {
      const matchHit5hRefreshMin = trimmed.match(/^You have hit your 5-hour limit, it will refresh in (\\d+) minutes?\\. If on a supported paid plan, you can use AI credits in the interim\\.?$/i);
      if (matchHit5hRefreshMin) {
        dynamicMatch = \`您已达到 5 小时频度限额，限额将在 \${matchHit5hRefreshMin[1]} 分钟后充值重置。在付费订阅计划下，您可以在此期间超额使用 AI 点数。\`;
        isDynamic = true;
      }
    }

    const matchBaselineQuota = trimmed.match(/^Your plan's baseline quota will refresh on (\\d{4}\\/\\d{1,2}\\/\\d{1,2} \\d{2}:\\d{2}:\\d{2})\\. To continue using this model now, enable AI Credit overages\\.?$/i);
    if (!isDynamic && matchBaselineQuota) {
      dynamicMatch = \`您的计划基础额度将在 \${matchBaselineQuota[1]} 重置。若要立即继续使用此模型，请启用 AI 超额额度。\`;
      isDynamic = true;
    }

    // Community MCP registry template rules
    const matchEnable = trimmed.match(/^Enable Antigravity to (interact with|deploy apps to) (.*?)\\.?$/i);
    if (!isDynamic && matchEnable) {
      const act = matchEnable[1];
      const target = matchEnable[2];
      dynamicMatch = act === 'interact with' ? \`允许 Antigravity 与 \${target} 进行交互。\` : \`允许 Antigravity 将应用部署到 \${target}。\`;
      isDynamic = true;
    }
    
    const matchExposes = trimmed.match(/^The (.*?) MCP server exposes (.*?) development tool actions to compatible AI-assistant clients\\.?$/i);
    if (!isDynamic && matchExposes) {
      dynamicMatch = \`\${matchExposes[1]} MCP 服务端，向兼容的 AI 助手客户端公开 \${matchExposes[2]} 开发工具操作。\`;
      isDynamic = true;
    }

    const matchGives = trimmed.match(/^The (.*?) Model Context Protocol \\(MCP\\) (Server|server) gives AI-powered development tools the ability to (.*?)\\.?$/i);
    if (!isDynamic && matchGives) {
      let action = matchGives[3];
      action = action.replace(/work with your (.*?) projects and your app's codebase/i, '协同处理您的 $1 项目及应用代码库');
      action = action.replace(/build, debug and inspect your (.*?) app/i, '构建、调试与检查您的 $1 应用');
      action = action.replace(/build, debug and inspect your (.*)/i, '构建、调试与检查您的 $1');
      dynamicMatch = \`针对 \${matchGives[1]} 的模型上下文协议 (MCP) 服务端，为 AI 辅助开发工具提供\${action}的能力。\`;
      isDynamic = true;
    }

    const matchProvides = trimmed.match(/^The (.*?) Model Context Protocol \\(MCP\\) server provides tools for (.*?)\\.?$/i);
    if (!isDynamic && matchProvides) {
      let action = matchProvides[2];
      action = action.replace(/semantic code analysis, live diagnostics, and transformation of your non-google3 Go codebase/i, '语义代码分析、实时诊断和非 google3 Go 代码库的转换');
      dynamicMatch = \`\${matchProvides[1]} 模型上下文协议 (MCP) 服务端，提供用于 \${action} 的工具。\`;
      isDynamic = true;
    }

    const matchInteractData = trimmed.match(/^Interact with your (.*?) data using natural language\\. This MCP server (.*?)\\.?$/i);
    if (!isDynamic && matchInteractData) {
      let action = matchInteractData[2];
      action = action.replace(/allows you to securely connect to your datasets to search the datasets, inspect table.*/i, '允许您安全地连接到数据集以搜索数据集、检查数据表并获取结构信息。');
      dynamicMatch = \`使用自然语言与您的 \${matchInteractData[1]} 数据进行交互。该 MCP 服务端\${action}\`;
      isDynamic = true;
    }

    const matchConnectAI = trimmed.match(/^Connect your AI assistant(?:s)? to (.*?)(?:\\. This MCP server|,)(?:\\s+)?(enables|enabling) (.*?)\\.?$/i);
    if (!isDynamic && matchConnectAI) {
      let action = matchConnectAI[3];
      action = action.replace(/data exploration and content management by allowing you to execute.*/i, '通过允许您执行自然语言查询，来实现数据探索与内容管理。');
      action = action.replace(/data discovery and governance by allowing you to.*/i, '通过允许您执行数据探索和治理，来实现数据发现与数据治理。');
      dynamicMatch = \`将您的 AI 助手连接到 \${matchConnectAI[1]}。该 MCP 服务端\${action}\`;
      isDynamic = true;
    }

    const matchRemoteMCP = trimmed.match(/^The (.*?) (?:remote )?MCP server lets you (.*?)\\.?$/i);
    if (!isDynamic && matchRemoteMCP) {
      let action = matchRemoteMCP[2];
      action = action.replace(/manage (.*?) resources/i, '管理 $1 资源');
      action = action.replace(/access and run (.*?) tools to (.*)/i, '访问和运行 $1 工具以：$2');
      action = action.replace(/manage Cloud SQL instances, manage users, create and restore backups.*/i, '管理 Cloud SQL 实例、管理用户、创建和恢复备份等');
      action = action.replace(/manage AlloyDB clusters and instances, manage users, create and restore.*/i, '管理 AlloyDB 集群和实例、管理用户、创建和恢复备份等');
      action = action.replace(/create, manage, and query Spanner resources from your AI-enabled development.*/i, '从您的 AI 辅助开发环境中创建、管理和查询 Spanner 资源');
      dynamicMatch = \`\${matchRemoteMCP[1]} 远程 MCP 服务端，允许您\${action}。\`;
      isDynamic = true;
    }

    // MCP Server Description dynamic translation
    const matchAllows = trimmed.match(/^(Allows running|Allows interacting with|Allows querying|Allows accessing|Provides tools to|Provides tools for|Provides tools) (.*?)\\.? This tool runs on the host system outside of any sandboxes\\.?$/i);
    if (!isDynamic && matchAllows) {
      let action = matchAllows[1].toLowerCase();
      let target = matchAllows[2];
      let actionZh = '允许运行';
      if (action.includes('interacting')) actionZh = '允许与';
      else if (action.includes('querying')) actionZh = '允许查询';
      else if (action.includes('accessing')) actionZh = '允许访问';
      else if (action.includes('tools for') || action.includes('tools to') || action.includes('provides tools')) actionZh = '提供用于';
      
      let targetZh = target;
      const targetLower = target.toLowerCase();
      if (targetLower === 'cmd.exe commands on windows') targetZh = 'Windows 上的 cmd.exe 命令';
      else if (targetLower === 'ipconfig to inspect network settings on the host machine') targetZh = 'ipconfig 以检查宿主机的网络设置';
      else if (targetLower === 'querying active directory domain services on windows') targetZh = '在 Windows 上查询活动目录 (Active Directory) 域服务';
      else if (targetLower === 'bash shell commands') targetZh = 'bash Shell 命令';
      else if (targetLower === 'cmd shell commands') targetZh = 'cmd Shell 命令';
      else if (targetLower === 'the docker daemon') targetZh = 'Docker 守护进程';
      else if (targetLower === 'git repositories') targetZh = 'Git 仓库';
      else if (targetLower === 'search files using grep') targetZh = '使用 grep 搜索文件';
      else if (targetLower === 'managing homebrew packages') targetZh = '管理 Homebrew 软件包';
      else if (targetLower === 'interacting with a kubernetes cluster' || targetLower === 'a kubernetes cluster') targetZh = 'Kubernetes 集群';
      else if (targetLower === 'the npm package manager') targetZh = 'npm 包管理器';
      else if (targetLower === 'the pip package manager') targetZh = 'pip 包管理器';
      else if (targetLower === 'running python scripts and modules' || targetLower === 'python scripts and modules') targetZh = '运行 Python 脚本和模块';
      else if (targetLower === 'searching files using ripgrep') targetZh = '使用 ripgrep 搜索文件';
      else if (targetLower === 'a sqlite database') targetZh = 'SQLite 数据库';
      else if (targetLower === 'the command line tool curl') targetZh = '命令行工具 curl';
      else if (targetLower === 'the google cloud cli') targetZh = 'Google Cloud CLI';
      else if (targetLower === 'google cloud pub/sub') targetZh = 'Google Cloud Pub/Sub';
      else if (targetLower === 'google cloud storage') targetZh = 'Google Cloud Storage';
      else if (targetLower === 'google cloud spanner') targetZh = 'Google Cloud Spanner';
      else if (targetLower === 'google cloud secret manager') targetZh = 'Google Cloud Secret Manager';
      else if (targetLower === 'google cloud kms') targetZh = 'Google Cloud KMS';
      else if (targetLower === 'github repositories') targetZh = 'GitHub 仓库';
      else if (targetLower === 'gitlab repositories') targetZh = 'GitLab 仓库';
      else if (targetLower === 'gmail messages and drafts') targetZh = 'Gmail 邮件与草稿';
      else if (targetLower === 'google calendar events') targetZh = 'Google 日历事件';
      else if (targetLower === 'google docs documents') targetZh = 'Google 文档';
      else if (targetLower === 'google drive files and folders') targetZh = 'Google 云端硬盘文件与文件夹';
      else if (targetLower === 'google sheets spreadsheets') targetZh = 'Google 表格';
      else if (targetLower === 'jira issues') targetZh = 'Jira 事务';
      else if (targetLower === 'confluence pages') targetZh = 'Confluence 页面';
      else if (targetLower === 'slack channels and messages') targetZh = 'Slack 频道与消息';
      else if (targetLower === 'linear issues') targetZh = 'Linear 事务';
      else if (targetLower === 'notion pages and databases') targetZh = 'Notion 页面与数据库';
      else if (targetLower === 'a postgresql database') targetZh = 'PostgreSQL 数据库';
      else if (targetLower === 'a mysql database') targetZh = 'MySQL 数据库';
      else if (targetLower === 'a redis cache') targetZh = 'Redis 缓存';
      else if (targetLower === 'an elasticsearch cluster') targetZh = 'Elasticsearch 集群';
      else if (targetLower === 'a mongodb database') targetZh = 'MongoDB 数据库';
      else if (targetLower === 'sentry projects and issues') targetZh = 'Sentry 项目与问题';
      else if (targetLower === 'datadog services') targetZh = 'Datadog 服务';
      else if (targetLower === 'aws services') targetZh = 'AWS 服务';
      else if (targetLower === 'azure services') targetZh = 'Azure 服务';
      else if (targetLower === 'cloudflare services') targetZh = 'Cloudflare 服务';
      else if (targetLower === 'vercel services') targetZh = 'Vercel 服务';
      else if (targetLower === 'heroku services') targetZh = 'Heroku 服务';
      else if (targetLower === 'netlify services') targetZh = 'Netlify 服务';
      else if (targetLower === 'github copilot services') targetZh = 'GitHub Copilot 服务';
      else if (targetLower === 'openai services') targetZh = 'OpenAI 服务';
      else if (targetLower === 'anthropic services') targetZh = 'Anthropic 服务';
      else if (targetLower === 'google gemini services') targetZh = 'Google Gemini 服务';
      else if (targetLower === 'google vertex ai services') targetZh = 'Google Vertex AI 服务';

      if (action.includes('tools for') || action.includes('tools to') || action.includes('provides tools')) {
        dynamicMatch = \`\${actionZh}\${targetZh}的工具。该工具运行在沙盒外的宿主系统上。\`;
      } else if (action.includes('interacting')) {
        dynamicMatch = \`\${actionZh}\${targetZh}进行交互。该工具运行在沙盒外的宿主系统上。\`;
      } else {
        dynamicMatch = \`\${actionZh}\${targetZh}。该工具运行在沙盒外的宿主系统上。\`;
      }
      isDynamic = true;
    }

    // Weekly limit dynamic text
    if (!isDynamic && /^You have used some of your weekly limit, it will fully refresh in (\\d+) days?,\\s*(\\d+) hours?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/You have used some of your weekly limit, it will fully refresh in (\\d+) days?,\\s*(\\d+) hours?\\.?/i, '您已消耗了部分每周限额，将在 $1 天 $2 小时后完全重置。');
      isDynamic = true;
    } else if (!isDynamic && /^You have used some of your weekly limit, it will fully refresh in (\\d+) days?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/You have used some of your weekly limit, it will fully refresh in (\\d+) days?\\.?/i, '您已消耗了部分每周限额，将在 $1 天后完全重置。');
      isDynamic = true;
    } else if (!isDynamic && /^You have used some of your weekly limit, it will fully refresh in (\\d+) hours?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/You have used some of your weekly limit, it will fully refresh in (\\d+) hours?\\.?/i, '您已消耗了部分每周限额，将在 $1 小时后完全重置。');
      isDynamic = true;
    } else if (!isDynamic && /^You have used some of your weekly limit, it will fully refresh in (\\d+) minutes?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/You have used some of your weekly limit, it will fully refresh in (\\d+) minutes?\\.?/i, '您已消耗了部分每周限额，将在 $1 分钟后完全重置。');
      isDynamic = true;
    }

    // 5-hour limit dynamic text
    if (!isDynamic && /^You have used some of your 5-hour limit, it will fully refresh in (\\d+) hours?,\\s*(\\d+) minutes?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/You have used some of your 5-hour limit, it will fully refresh in (\\d+) hours?,\\s*(\\d+) minutes?\\.?/i, '您已消耗了部分 5 小时限额，将在 $1 小时 $2 分钟后完全重置。');
      isDynamic = true;
    } else if (!isDynamic && /^You have used some of your 5-hour limit, it will fully refresh in (\\d+) minutes?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/You have used some of your 5-hour limit, it will fully refresh in (\\d+) minutes?\\.?/i, '您已消耗了部分 5 小时限额，将在 $1 分钟后完全重置。');
      isDynamic = true;
    }

    // Breakdown controls
    if (!isDynamic && /^Show (\\d+) breakdowns?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/Show (\\d+) breakdowns?/i, '显示 $1 个详细分项');
      isDynamic = true;
    }
    if (!isDynamic && /^Hide (\\d+) breakdowns?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/Hide (\\d+) breakdowns?/i, '收起 $1 个详细分项');
      isDynamic = true;
    }

    // Customization budget
    if (!isDynamic && /^(\\d+\\.?\\d*)% of the customization budget is available\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(/^(\\d+\\.?\\d*)% of the customization budget is available\\.?$/i, '$1% 的自定义额度可用。');
      isDynamic = true;
    }

    // Project delete prompt
    if (!isDynamic && /^Permanently delete .+ including \\d+ active conversations? and \\d+ archived conversations?\\.?$/i.test(trimmed)) {
      dynamicMatch = trimmed.replace(
        /^Permanently delete (.+) including (\\d+) active conversations? and (\\d+) archived conversations?\\.?$/i,
        '永久删除「$1」，包含 $2 个活跃对话和 $3 个已归档对话。'
      );
      isDynamic = true;
    }

    if (isDynamic) {
      return text.replace(trimmed, dynamicMatch);
    }

    // 2. Intelligent Punctuation Stripping & Reconstruction
    let core = trimmed;
    let trailPunc = '';
    let matchPunc = '';

    const puncRegex = /(\\.\\.\\.|…|\\.|\\?|!|:|：|？|！|。)$/;
    const match = core.match(puncRegex);
    if (match) {
      matchPunc = match[0];
      core = core.slice(0, -matchPunc.length).trim();
      
      if (matchPunc === '.') trailPunc = '.';
      else if (matchPunc === '?') trailPunc = '？';
      else if (matchPunc === '!') trailPunc = '！';
      else if (matchPunc === ':') trailPunc = '：';
      else if (matchPunc === '：') trailPunc = '：';
      else if (matchPunc === '？') trailPunc = '？';
      else if (matchPunc === '！') trailPunc = '！';
      else if (matchPunc === '。') trailPunc = '。';
      else trailPunc = matchPunc;
    }

    let coreTranslated = '';
    if (dictionary[core]) {
      coreTranslated = dictionary[core];
    } else {
      const coreLower = core.toLowerCase();
      if (dictionary[coreLower]) {
        coreTranslated = dictionary[coreLower];
      }
    }

    if (coreTranslated) {
      return text.replace(trimmed, coreTranslated + trailPunc);
    }

    // 3. Fallback to word-by-word ONLY for short strings (<= 1 word)
    if (/[\\u4e00-\\u9fa5]/.test(core)) {
      return text;
    }
    const wordsCount = core.split(/\\s+/).filter(Boolean).length;
    if (wordsCount > 1) {
      return text;
    }

    let temp = core;
    let replaced = false;
    const sortedKeys = Object.keys(combinedDict).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (key.length <= 3 && !/^[a-zA-Z0-9]+$/.test(key)) continue;
      const escapedKey = escapeRegExp(key);
      const startBoundary = /^[a-zA-Z0-9]/.test(key) ? '\\\\b' : '';
      const endBoundary = /[a-zA-Z0-9]$/.test(key) ? '\\\\b' : '';
      const regex = new RegExp(startBoundary + escapedKey + endBoundary, 'gi');
      if (regex.test(temp)) {
        temp = temp.replace(regex, combinedDict[key]);
        replaced = true;
      }
    }

    let finalTranslated = replaced ? temp : core;
    finalTranslated = finalTranslated.replace(/([\\u4e00-\\u9fa5])\\s+([\\u4e00-\\u9fa5])/g, '$1$2');
    if (matchPunc) {
      finalTranslated += trailPunc;
    }
    return text.replace(trimmed, finalTranslated);
  }\n\n`;

preload = preload.slice(0, transStart) + newTranslateString + preload.slice(transEnd);
console.log('Replaced translateString with comprehensive, bug-free implementation.');

// 4. Clean up AGYSupplementalTranslations: change corrupted "共" back to "of"
const suppStart = preload.indexOf('(function AGYSupplementalTranslations() {');
if (suppStart !== -1) {
  const suppEnd = preload.indexOf('\n})();\n\n(function AGYTranslationAuditQualityLayer()', suppStart);
  if (suppEnd !== -1) {
    let suppCode = preload.slice(suppStart, suppEnd);
    suppCode = suppCode.replaceAll('collections 共 skills', 'collections of skills');
    suppCode = suppCode.replaceAll('collection 共 agent skills', 'collection of agent skills');
    suppCode = suppCode.replaceAll('suite 共 agent skills', 'suite of agent skills');
    suppCode = suppCode.replaceAll('Outside 共 folders', 'Outside of folders');
    suppCode = suppCode.replaceAll('outside 共 projects', 'outside of projects');
    preload = preload.slice(0, suppStart) + suppCode + preload.slice(suppEnd);
    console.log('Cleaned up corrupted "共" -> "of" in AGYSupplementalTranslations.');
  }
}

// 5. Syntax validation of the updated preload script
console.log('Validating updated preload.js syntax...');
new vm.Script(preload, { filename: 'dist/preload.js' });
console.log('Syntax check passed!');

// 6. Test the updated translation function with unit test assertions
console.log('Testing translation engine with test cases...');
const testSandbox = {
  window: { addEventListener: () => {} },
  document: { addEventListener: () => {} },
  location: { pathname: '/', hash: '' },
  electron_1: {
    contextBridge: { exposeInMainWorld: () => {} },
    ipcRenderer: { invoke: async () => {}, on: () => {}, send: () => {} }
  },
  console: console
};

// Run the script in a mock environment up to before DOM execution
const dictIdx = preload.indexOf('const dictionary = {');
const iifeStart = preload.lastIndexOf('(function()', dictIdx);
const codeClassIdx = preload.indexOf('  const codeClassPattern =', dictIdx);
const testCode = preload.slice(iifeStart, codeClassIdx) + '\n  this.testTranslate = translateString;\n})();';
vm.runInNewContext(testCode, testSandbox);

const t = testSandbox.testTranslate;

const assertions = [
  // Exact dictionary matches
  ['More options', '更多选项'],
  ['More actions', '更多操作'],
  ['Undo to this point', '撤销至此处'],
  ['Project options', '项目选项'],
  ['Scroll to Bottom', '滚动到底部'],
  ['File Viewer', '文件查看器'],
  ['Terminal tab', '终端标签页'],
  ['Review tab', '审查标签页'],
  ['Overview tab', '概览标签页'],
  ['Maximize Pane', '最大化窗格'],
  ['Drag to select a region to comment', '拖动以框选评论区域'],
  ['Send message Enter', '发送消息 (Enter)'],
  ['Submit (Enter)', '提交 (Enter)'],
  ['Open IDE', '打开 IDE'],
  ['Cancel All Tasks', '取消全部任务'],
  ['Background Task Output', '后台任务输出'],
  ['Collapse queued messages', '折叠排队消息'],
  ['Sends after agent finishes working', '智能体完成工作后发送'],
  
  // Slash commands
  ['Plan carefully before executing a task.', '在执行任务前进行仔细规划。'],
  ['Interview me to align on a plan.', '通过交互式访谈对齐设计方案与计划。'],
  ['Invoke a browser agent for web tasks.', '调用浏览器智能体执行网页相关任务。'],
  ['Ask a quick question without interrupting the main conversation.', '在不中断主对话的情况下快速提问。'],

  // Dynamic status & numbers
  ['Exploring 1 file', '正在浏览 1 个文件'],
  ['Exploring 1 task', '正在浏览 1 个任务'],
  ['Exploring 2 files', '正在浏览 2 个文件'],
  ['Exploring 1 file, running 1 command', '正在浏览 1 个文件，运行 1 个命令'],
  ['Exploring 5 files, 2 tasks, running 10 commands', '正在浏览 5 个文件，2 个任务，运行 10 个命令'],
  ['Running 2 commands', '正在运行 2 个命令'],
  ['Ran git status', '已运行 git status'],
  ['Resets in 4h 7m', '4小时 7分钟后重置'],
  ['Resets in 6d 13h', '6天 13小时后重置'],
  ['Resets in 25m', '25分钟后重置'],
  ['Check git status finished', 'Check git status 已完成'],
  ['Select project, current: No Project', '选择项目，当前：无项目'],
  ['Select model, current: gemini-2.5-pro', '选择模型，当前：gemini-2.5-pro'],
  ['1 task running', '1 个任务运行中'],
  ['5 tasks running', '5 个任务运行中'],
  ['Send all (3)', '发送全部 (3)'],
  ['Remove avatar.png', '移除 avatar.png'],
  ['Compacting · 30s', '正在压缩上下文 · 30秒'],
  ['Checked task', '已检查任务'],
  ['Checked task-102', '已检查任务-102'],
  ['Checking task status', '正在检查任务状态'],

  // Punctuation handling
  ['More options...', '更多选项...'],
  ['Open IDE!', '打开 IDE！'],

  // Substring safety checks: "of" should NEVER corrupt words!
  ['Profile of software', 'Profile of software'],
  ['Proof of concept', 'Proof of concept'],
  ['Official document', 'Official document']
];

let failed = 0;
for (const [input, expected] of assertions) {
  const result = t(input);
  if (result !== expected) {
    console.error(`Assertion FAILED for "${input}": expected "${expected}", got "${result}"`);
    failed++;
  } else {
    console.log(`Assertion PASSED: "${input}" -> "${result}"`);
  }
}

if (failed > 0) {
  throw new Error(`${failed} translation assertions failed.`);
}

console.log('All', assertions.length, 'translation test cases passed successfully!');

// 7. Write updated preload.js and repack legacy-payload.asar
fs.writeFileSync(preloadPath, preload, 'utf8');

const backupPath = `${legacyPayloadAsar}.bak`;
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(legacyPayloadAsar, backupPath);
  console.log('Created backup:', backupPath);
}

console.log('Repacking legacy-payload.asar...');
asar.createPackage(tempDir, legacyPayloadAsar).then(() => {
  console.log('Successfully repacked legacy-payload.asar!');
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('Cleaned up temp directory. Ready for patch rebuild.');
}).catch(err => {
  console.error('Failed to repack asar:', err);
  process.exit(1);
});
