#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanupUnusedImports(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove completely unused import lines
  const unusedImportPatterns = [
    /^import \{ useState, useEffect, useRef, useCallback, useMemo, useContext \} from 'react';\s*$/gm,
    /^import \{ WizardContext \} from '\.\.\/types';\s*$/gm,
    /^import \{ Card, CardContent, CardHeader, CardTitle \} from '@\/components\/ui\/card';\s*$/gm,
    /^import \{ Select, SelectContent, SelectItem, SelectTrigger, SelectValue \} from '@\/components\/ui\/select';\s*$/gm
  ];

  unusedImportPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  });

  // Clean up specific unused imports from React imports
  const reactImportRegex = /import \{([^}]+)\} from 'react';/;
  const match = content.match(reactImportRegex);
  
  if (match) {
    const imports = match[1].split(',').map(s => s.trim());
    const usedImports = [];
    
    // Check which imports are actually used
    imports.forEach(importName => {
      // Look for usage in the file (excluding the import line itself)
      const contentWithoutImport = content.replace(reactImportRegex, '');
      if (contentWithoutImport.includes(importName + '(') || 
          contentWithoutImport.includes(importName + ' ') ||
          contentWithoutImport.includes('<' + importName) ||
          contentWithoutImport.includes(importName + '>')) {
        usedImports.push(importName);
      }
    });

    if (usedImports.length === 0) {
      // Remove the entire import if nothing is used
      content = content.replace(reactImportRegex, '');
      modified = true;
    } else if (usedImports.length !== imports.length) {
      // Update the import with only used imports
      content = content.replace(reactImportRegex, `import { ${usedImports.join(', ')} } from 'react';`);
      modified = true;
    }
  }

  // Remove duplicate ReactNode imports
  const reactNodeDuplicateRegex = /import \{([^}]*), ReactNode \} from 'react';\s*import \{[^}]*ReactNode[^}]*\} from 'react'/g;
  if (reactNodeDuplicateRegex.test(content)) {
    content = content.replace(reactNodeDuplicateRegex, (match) => {
      // Keep only the first import and merge
      return match.split('\n')[0];
    });
    modified = true;
  }

  // Clean up empty lines left by removed imports
  content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`Cleaned: ${filePath}`);
    return true;
  }
  return false;
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalCleaned = 0;

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      totalCleaned += processDirectory(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      if (cleanupUnusedImports(filePath)) {
        totalCleaned++;
      }
    }
  });

  return totalCleaned;
}

// Process client/src directory
const clientSrcPath = path.join(__dirname, 'client', 'src');
if (fs.existsSync(clientSrcPath)) {
  console.log('Cleaning up unused imports in client/src...');
  const cleaned = processDirectory(clientSrcPath);
  console.log(`Cleaned ${cleaned} files.`);
} else {
  console.log('client/src directory not found');
}
