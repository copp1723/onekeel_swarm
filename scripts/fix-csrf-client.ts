#!/usr/bin/env tsx
/**
 * Script to update all fetch calls to use the new API client with CSRF support
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

async function updateFetchCalls() {
  const files = await glob('client/src/**/*.{ts,tsx}', {
    ignore: ['**/node_modules/**', '**/dist/**', '**/api-client.ts']
  });

  let updatedFiles = 0;

  for (const file of files) {
    let content = readFileSync(file, 'utf-8');
    let hasChanges = false;

    // Check if file uses fetch for API calls
    if (content.includes('fetch(') && content.includes('/api/')) {
      // Add import if not present
      if (!content.includes('api-client')) {
        const importStatement = "import { apiClient } from '@/utils/api-client';";
        
        // Add after the last import
        const lastImportMatch = content.match(/^import[^;]+;/gm);
        if (lastImportMatch) {
          const lastImport = lastImportMatch[lastImportMatch.length - 1];
          const insertPosition = content.indexOf(lastImport) + lastImport.length;
          content = content.slice(0, insertPosition) + '\n' + importStatement + content.slice(insertPosition);
          hasChanges = true;
        }
      }

      // Replace fetch calls
      // Pattern 1: fetch('/api/...', { method: 'POST', ... })
      content = content.replace(
        /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*\{\s*method:\s*['"`]POST['"`]/g,
        "apiClient.post('$1'"
      );

      // Pattern 2: fetch('/api/...', { method: 'PUT', ... })
      content = content.replace(
        /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*\{\s*method:\s*['"`]PUT['"`]/g,
        "apiClient.put('$1'"
      );

      // Pattern 3: fetch('/api/...', { method: 'DELETE', ... })
      content = content.replace(
        /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]\s*,\s*\{\s*method:\s*['"`]DELETE['"`]/g,
        "apiClient.delete('$1'"
      );

      // Pattern 4: Simple GET requests - fetch('/api/...')
      content = content.replace(
        /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]\s*\)/g,
        "apiClient.get('$1')"
      );

      // Check if content changed
      const originalContent = readFileSync(file, 'utf-8');
      if (content !== originalContent) {
        hasChanges = true;
      }
    }

    if (hasChanges) {
      writeFileSync(file, content);
      console.log(`✅ Updated: ${file}`);
      updatedFiles++;
    }
  }

  console.log(`\n✨ Updated ${updatedFiles} files with API client`);
}

// Run the update
updateFetchCalls().catch(console.error);