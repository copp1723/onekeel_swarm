#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map of files to their missing imports
const missingImports = {
  'client/src/views/BrandingManagementView.tsx': ['Palette'],
  'client/src/views/CampaignsView.tsx': ['Wand2', 'Plus', 'Target'],
  'client/src/views/ClientManagementView.tsx': ['Building'],
  'client/src/views/ConversationsView.tsx': ['MessageSquare'],
  'client/src/views/DashboardView.tsx': [
    'Users',
    'Target',
    'Mail',
    'BarChart3',
  ],
  'client/src/views/LeadsView.tsx': ['Plus', 'Users'],
  'client/src/views/TemplateLibraryView.tsx': ['FileText'],
  'client/src/views/UsersView.tsx': [
    'User',
    'Mail',
    'Shield',
    'Calendar',
    'ToggleLeft',
  ],
};

function addMissingImports(filePath, icons) {
  console.log(`Adding missing imports to ${filePath}: ${icons.join(', ')}`);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Find the first import line
  let firstImportIndex = -1;
  let hasLucideImport = false;
  let lucideImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import')) {
      if (firstImportIndex === -1) firstImportIndex = i;
      if (lines[i].includes('lucide-react')) {
        hasLucideImport = true;
        lucideImportIndex = i;
        break;
      }
    }
  }

  if (hasLucideImport) {
    // Update existing lucide import
    const existingImport = lines[lucideImportIndex];
    const match = existingImport.match(
      /import\s*\{\s*([^}]*)\s*\}\s*from\s*['"]lucide-react['"]/
    );
    if (match) {
      const existingIcons = match[1]
        .split(',')
        .map(icon => icon.trim())
        .filter(Boolean);
      const allIcons = [...new Set([...existingIcons, ...icons])];
      lines[lucideImportIndex] =
        `import { ${allIcons.join(', ')} } from 'lucide-react';`;
    }
  } else {
    // Add new lucide import after first import
    const newImport = `import { ${icons.join(', ')} } from 'lucide-react';`;
    if (firstImportIndex >= 0) {
      lines.splice(firstImportIndex + 1, 0, newImport);
    } else {
      lines.unshift(newImport);
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'));
  console.log(`Updated ${filePath}`);
}

// Process all files
Object.entries(missingImports).forEach(([filePath, icons]) => {
  addMissingImports(filePath, icons);
});

console.log('✅ All missing imports added!');
