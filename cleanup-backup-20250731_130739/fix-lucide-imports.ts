#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Map of files to their missing icons based on the TypeScript errors
const filesToFix = {
  'src/App.tsx': ['Brain', 'LogOut'],
  'src/components/campaign-intelligence/AIInsightsDashboard.tsx': ['Brain', 'TrendingUp', 'Target', 'Lightbulb', 'Users', 'MessageSquare'],
  'src/views/AgentsView.tsx': ['Plus', 'Brain'],
  'src/components/dashboard/PerformanceMetrics.tsx': ['Brain', 'TrendingUp', 'Users', 'Target'],
  'src/views/LeadsView.tsx': ['UserPlus', 'Users', 'TrendingUp', 'Phone', 'Mail', 'Building', 'Calendar', 'Filter', 'Download', 'Upload', 'X', 'Trash2', 'Check'],
  'src/components/email-verification/BulkEmailVerifier.tsx': ['Upload', 'CheckCircle', 'XCircle', 'AlertCircle', 'Download', 'Trash2'],
  'src/components/dashboard/StatsDashboard.tsx': ['UserPlus', 'Users', 'Brain', 'Target'],
  'src/views/ContactsView.tsx': ['UserPlus', 'Mail', 'Phone', 'Building', 'Calendar', 'Filter', 'Download', 'Search', 'Edit', 'Trash2', 'X', 'Check', 'Users'],
  'src/views/EmailVerificationView.tsx': ['Mail', 'Shield', 'CheckCircle', 'AlertCircle'],
  'src/components/contacts/ContactsList.tsx': ['Phone', 'Mail', 'Building', 'Calendar', 'Edit', 'Trash2'],
  'src/components/navigation/TopBar.tsx': ['Bell', 'ChevronDown'],
  'src/components/navigation/Sidebar.tsx': ['Bot', 'Users', 'UserPlus', 'Mail', 'Shield', 'Send', 'Search', 'BarChart2', 'Calendar', 'Settings', 'MessageSquare', 'FileText', 'ChevronRight', 'ChevronLeft', 'X', 'Menu'],
  'src/views/CampaignsView.tsx': ['Plus', 'Calendar', 'Users', 'Send', 'Clock', 'CheckCircle', 'XCircle', 'Edit', 'Trash2', 'Play', 'Pause'],
  'src/views/DashboardView.tsx': ['TrendingUp', 'TrendingDown', 'DollarSign'],
  'src/components/campaigns/CampaignsList.tsx': ['Calendar', 'Users', 'Clock', 'CheckCircle', 'XCircle', 'Pause', 'Edit', 'Trash2', 'Play'],
  'src/views/AnalyticsView.tsx': ['TrendingUp', 'Users', 'Mail', 'Target'],
  'src/views/SettingsView.tsx': ['User', 'Key', 'CreditCard', 'Bell', 'Shield', 'Users', 'Building'],
  'src/components/chat-widget/ChatIcon.tsx': ['MessageCircle'],
  'src/components/campaign-wizard/CampaignWizard.tsx': ['X'],
  'src/components/campaign-wizard/steps/AgentStep.tsx': ['Bot'],
  'src/views/ChatbotView.tsx': ['MessageSquare', 'Settings', 'Send'],
  'src/components/chat-widget/ChatWidget.tsx': ['MessageCircle', 'Send', 'X', 'Minimize2', 'Maximize2'],
  'src/components/leads/LeadsList.tsx': ['Phone', 'Mail', 'Building', 'Calendar', 'Edit', 'Trash2'],
  'src/views/IntegrationsView.tsx': ['Plug', 'CheckCircle', 'AlertCircle'],
  'src/components/agents/AgentCard.tsx': ['Brain', 'MoreVertical', 'Edit', 'Trash2'],
  'src/components/csv-upload/CsvUploadButton.tsx': ['Upload', 'FileText'],
  'src/views/EconomyView.tsx': ['DollarSign', 'TrendingUp', 'CreditCard'],
  'src/components/leads/LeadDetail.tsx': ['X', 'User', 'Mail', 'Phone', 'Building', 'MapPin', 'Calendar', 'Tag', 'Clock', 'MessageSquare']
};

function fixLucideImports(basePath: string) {
  let fixedCount = 0;
  let notFoundCount = 0;
  let alreadyFixedCount = 0;

  for (const [filePath, requiredIcons] of Object.entries(filesToFix)) {
    const fullPath = path.join(basePath, 'client', filePath);
    
    try {
      if (!fs.existsSync(fullPath)) {
        console.log(`❌ File not found: ${fullPath}`);
        notFoundCount++;
        continue;
      }

      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Check if file already has a lucide-react import
      const lucideImportMatch = content.match(/import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/);
      
      if (lucideImportMatch) {
        // Extract existing imports
        const existingImports = lucideImportMatch[1]
          .split(',')
          .map(imp => imp.trim())
          .filter(imp => imp);
        
        // Check which icons are missing
        const missingIcons = requiredIcons.filter(icon => !existingImports.includes(icon));
        
        if (missingIcons.length === 0) {
          console.log(`✅ Already fixed: ${filePath}`);
          alreadyFixedCount++;
          continue;
        }
        
        // Add missing icons
        const allIcons = [...new Set([...existingImports, ...missingIcons])].sort();
        const newImport = `import { ${allIcons.join(', ')} } from 'lucide-react'`;
        
        content = content.replace(lucideImportMatch[0], newImport);
        console.log(`🔧 Updated import in ${filePath}: added ${missingIcons.join(', ')}`);
      } else {
        // No lucide-react import found, add it
        const importStatement = `import { ${requiredIcons.sort().join(', ')} } from 'lucide-react';\n`;
        
        // Find a good place to insert the import (after other imports or at the beginning)
        const importMatch = content.match(/^(import[\s\S]*?from\s*['"][^'"]+['"];?\s*\n)+/m);
        
        if (importMatch) {
          // Insert after existing imports
          const insertPosition = importMatch.index! + importMatch[0].length;
          content = content.slice(0, insertPosition) + importStatement + content.slice(insertPosition);
        } else {
          // Insert at the beginning
          content = importStatement + content;
        }
        
        console.log(`✨ Added new import to ${filePath}: ${requiredIcons.join(', ')}`);
      }
      
      // Write the file back
      fs.writeFileSync(fullPath, content, 'utf8');
      fixedCount++;
      
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Fixed: ${fixedCount} files`);
  console.log(`✅ Already correct: ${alreadyFixedCount} files`);
  console.log(`❌ Not found: ${notFoundCount} files`);
  console.log(`📁 Total files checked: ${Object.keys(filesToFix).length}`);
}

// Run the fix
const projectPath = '/Users/joshcopp/Desktop/onekeel_swarm';
console.log(`🚀 Starting Lucide React icon import fixes in: ${projectPath}\n`);
fixLucideImports(projectPath);