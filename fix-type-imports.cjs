#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fixTypeImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix imports like: import { TypeName } from '../types';
  content = content.replace(
    /^import \{ ([^}]*(?:[A-Z]\w*[^}]*)) \} from (['"][^'"]*types[^'"]*['"]|['"][^'"]*\.\.\/types['"])/gm,
    (match, imports, from) => {
      modified = true;
      return `import type { ${imports} } from ${from}`;
    }
  );

  // Fix imports like: import { CampaignData } from '../types';
  const typeNamePatterns = [
    'CampaignData', 'WizardStep', 'WizardContext', 'Agent', 'EmailTemplate',
    'UnifiedAgentConfig', 'AgentType', 'AgentTemplate', 'ViewType'
  ];
  
  typeNamePatterns.forEach(typeName => {
    const regex = new RegExp(`^import \\{ ([^}]*${typeName}[^}]*) \\} from`, 'gm');
    content = content.replace(regex, (match, imports) => {
      modified = true;
      return `import type { ${imports} } from`;
    });
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
  }
}

function walkDir(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      walkDir(filePath, callback);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      callback(filePath);
    }
  });
}

// Fix client files
walkDir('/Users/joshcopp/Desktop/onekeel_swarm/client/src', fixTypeImports);
console.log('Type import fixing complete!');