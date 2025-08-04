#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the root directory (two levels up from tools/build-fixes)
const rootDir = path.resolve(__dirname, '..', '..');

function fixReactImports(filePath) {
  console.log(`Checking ${filePath}`);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Add import for React if it's not already there
  if (content.includes('React.') && !content.includes("import React") && !content.includes("import * as React")) {
    content = `import * as React from 'react';\n${content}`;
    modified = true;
    console.log(`  Added React import`);
  }

  // Replace UMD global React with proper import
  if (content.match(/React\.[a-zA-Z]/)) {
    // Fix React.useState, React.useEffect, etc. to just useState, useEffect
    const originalContent = content;
    content = content.replace(/React\.(use[A-Z][a-zA-Z]*)/g, '$1');
    content = content.replace(/React\.StrictMode/g, 'StrictMode');
    content = content.replace(/React\.Component/g, 'Component');
    content = content.replace(/React\.ReactNode/g, 'ReactNode');
    
    if (originalContent !== content) {
      modified = true;
      console.log(`  Fixed React.X references`);
    }

    // Add any missing hooks or components to imports
    const hooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useContext'];
    const reactTypes = ['StrictMode', 'Component', 'ReactNode', 'ErrorInfo'];
    
    const usedHooks = hooks.filter(hook => content.includes(hook + '('));
    const usedTypes = reactTypes.filter(type => content.includes(type));
    
    const existingImportMatch = content.match(/import\s+(\*\s+as\s+React|{[^}]+})\s+from\s+['"]react['"]/);
    
    if (existingImportMatch) {
      if (existingImportMatch[1].startsWith('{')) {
        // Extract existing named imports
        const existingImports = existingImportMatch[1].slice(1, -1).split(',').map(s => s.trim());
        const allImports = [...new Set([...existingImports, ...usedHooks, ...usedTypes])];
        
        if (allImports.length > existingImports.length) {
          content = content.replace(
            /import\s+{[^}]+}\s+from\s+['"]react['"]/,
            `import { ${allImports.join(', ')} } from 'react'`
          );
          modified = true;
          console.log(`  Updated React named imports`);
        }
      }
    } else if (usedHooks.length > 0 || usedTypes.length > 0) {
      // Add new import at the top
      const allImports = [...usedHooks, ...usedTypes];
      content = `import { ${allImports.join(', ')} } from 'react';\n${content}`;
      modified = true;
      console.log(`  Added React named imports`);
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  Updated ${filePath}`);
    return true;
  }
  return false;
}

function processDirectory(dir, fileCount = { count: 0 }) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        totalFixed += processDirectory(filePath, fileCount);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && file !== 'vite-env.d.ts') {
      fileCount.count++;
      if (fixReactImports(filePath)) {
        totalFixed++;
      }
    }
  });

  return totalFixed;
}

// Process client/src directory
const clientSrcPath = path.join(rootDir, 'client', 'src');
if (fs.existsSync(clientSrcPath)) {
  console.log('Fixing React imports in client/src...');
  const fileCount = { count: 0 };
  const fixed = processDirectory(clientSrcPath, fileCount);
  console.log(`Checked ${fileCount.count} files and fixed ${fixed} files.`);
} else {
  console.log('client/src directory not found');
}
