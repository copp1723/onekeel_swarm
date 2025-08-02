#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fixReactImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix "import React from 'react';" to remove React default import
  if (content.includes("import React from 'react';")) {
    content = content.replace("import React from 'react';", '');
    modified = true;
  }

  // Fix "import React, { ... }" to "import { ... }"
  const reactImportRegex = /import React, \{([^}]+)\} from 'react';/g;
  if (reactImportRegex.test(content)) {
    content = content.replace(reactImportRegex, "import {$1} from 'react';");
    modified = true;
  }

  // Fix React.FC to just remove it (since we're using function components)
  content = content.replace(/: React\.FC<([^>]*)>/g, '');

  // Fix React.useState, React.useEffect, etc. to just useState, useEffect
  content = content.replace(/React\.(use[A-Z][a-zA-Z]*)/g, '$1');
  content = content.replace(/React\.StrictMode/g, 'StrictMode');
  content = content.replace(/React\.Component/g, 'Component');
  content = content.replace(/React\.ReactNode/g, 'ReactNode');

  // Add missing imports for hooks that are used
  const hooks = [
    'useState',
    'useEffect',
    'useRef',
    'useCallback',
    'useMemo',
    'useContext',
  ];
  const usedHooks = [];

  hooks.forEach(hook => {
    if (
      (content.includes(hook + '(') && !content.includes(`import {`)) ||
      !content.includes(hook)
    ) {
      usedHooks.push(hook);
    }
  });

  // If we have StrictMode, Component, or ReactNode, add them to imports
  const reactTypes = [];
  if (content.includes('StrictMode')) reactTypes.push('StrictMode');
  if (content.includes('Component')) reactTypes.push('Component');
  if (content.includes('ReactNode')) reactTypes.push('ReactNode');
  if (content.includes('ErrorInfo')) reactTypes.push('ErrorInfo');

  // Find existing react import and update it
  const existingImportMatch = content.match(/import \{([^}]+)\} from 'react';/);
  if (existingImportMatch) {
    const existingImports = existingImportMatch[1]
      .split(',')
      .map(s => s.trim());
    const allImports = [
      ...new Set([...existingImports, ...usedHooks, ...reactTypes]),
    ];
    if (allImports.length > 0) {
      content = content.replace(
        /import \{[^}]+\} from 'react';/,
        `import { ${allImports.join(', ')} } from 'react';`
      );
    }
  } else if (usedHooks.length > 0 || reactTypes.length > 0) {
    // Add new import at the top
    const allImports = [...usedHooks, ...reactTypes];
    content = `import { ${allImports.join(', ')} } from 'react';\n` + content;
  }

  // Fix any type annotations that use 'any'
  content = content.replace(/\{\s*([^:}]+):\s*any\s*\}/g, '{ $1: any }');
  content = content.replace(/\(\s*([^:)]+):\s*any\s*\)/g, '($1: any)');

  if (modified || content !== fs.readFileSync(filePath, 'utf8')) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalFixed += processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (fixReactImports(filePath)) {
        totalFixed++;
      }
    }
  });

  return totalFixed;
}

// Process client/src directory
const clientSrcPath = path.join(__dirname, 'client', 'src');
if (fs.existsSync(clientSrcPath)) {
  console.log('Fixing React imports in client/src...');
  const fixed = processDirectory(clientSrcPath);
  console.log(`Fixed ${fixed} files.`);
} else {
  console.log('client/src directory not found');
}
