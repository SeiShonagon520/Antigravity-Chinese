const asar = require('@electron/asar');
const vm = require('vm');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appAsarPath = path.join(root, 'assets', 'app.asar');

const preload = asar.extractFile(appAsarPath, 'dist/preload.js').toString('utf8');
const menu = asar.extractFile(appAsarPath, 'dist/menu.js').toString('utf8');

console.log('--- Checking dist/menu.js in assets/app.asar ---');
console.log('New Window localized:', menu.includes('新建窗口'));
console.log('Docs localized:', menu.includes('文档'));
console.log('Connect to WSL localized:', menu.includes('连接到 WSL'));
console.log('Reopen Locally localized:', menu.includes('在本地重新打开'));

console.log('\n--- Checking dist/preload.js in assets/app.asar ---');
console.log('Destructive of->共 rule removed:', !preload.includes('{ search: "of", replace: "共" }'));

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

const dictIdx = preload.indexOf('const dictionary = {');
const iifeStart = preload.lastIndexOf('(function()', dictIdx);
const codeClassIdx = preload.indexOf('  const codeClassPattern =', dictIdx);
const testCode = preload.slice(iifeStart, codeClassIdx) + '\n  this.testTranslate = translateString;\n})();';
vm.runInNewContext(testCode, testSandbox);
const t = testSandbox.testTranslate;

const checks = [
  'More options',
  'Undo to this point',
  'Scroll to Bottom',
  'File Viewer',
  'Terminal tab',
  'Review tab',
  'Overview tab',
  'Drag to select a region to comment',
  'Cancel All Tasks',
  'Send message Enter',
  'Submit (Enter)',
  'Background Task Output',
  'Open IDE',
  'Collapse queued messages',
  'Sends after agent finishes working',
  'Exploring 5 files, 2 tasks, running 10 commands',
  'Running 3 commands',
  'Ran git log',
  'Resets in 4h 7m',
  'Resets in 6d 13h',
  'Resets in 25m',
  'Select project, current: No Project',
  'Select model, current: gemini-2.5-pro',
  '1 task running',
  'Remove file.txt',
  'Compacting · 15s',
  'Profile of software',
  'Plan carefully before executing a task.'
];

checks.forEach(c => {
  console.log('"' + c + '" -> "' + t(c) + '"');
});
