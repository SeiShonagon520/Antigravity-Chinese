const fs = require('fs');
const path = require('path');

const rulesPath = path.join(__dirname, 'runtime-rules.json');
const injectedCodePath = path.join(__dirname, 'injected-client-features.js');

const replacementCode = fs.readFileSync(injectedCodePath, 'utf8');
const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

// Locate pet rule by description
const petRule = rules.find(r => r.description && r.description.includes('pet with micro-interactions')) || rules[8];
petRule.description = 'Inject in-UI branch conversation buttons, modal, shortcut, and full-featured pet with micro-interactions (edge peek, afk sleep, launch push, scramble pudding drag)';
petRule.replace = replacementCode;

fs.writeFileSync(rulesPath, JSON.stringify(rules, null, 2) + '\n', 'utf8');
console.log('Successfully updated runtime-rules.json with micro-interaction tuned pet system!');
