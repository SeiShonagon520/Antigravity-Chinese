const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, 'runtime-rules.json');
const injectedCodePath = path.join(__dirname, 'injected-client-features.js');

const replacementCode = fs.readFileSync(injectedCodePath, 'utf8');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Rule 9 is the last rule
rules[rules.length - 1].description = 'Inject in-UI branch conversation buttons, modal, shortcut, and full-featured pet with micro-interactions (edge peek, afk sleep, launch push, scramble pudding drag)';
rules[rules.length - 1].replace = replacementCode;

fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + '\n', 'utf8');
console.log('Successfully updated runtime-rules.json with micro-interaction tuned pet system!');
