import { featureFlagService } from '../services/feature-flag-service';

// Default feature flags for Phase 1 implementation
const DEFAULT_FLAGS = [
  // UI Progressive Disclosure
  {
    key: 'ui.new-navigation',
    name: 'New 3-Tab Navigation',
    description: 'Enable the new consolidated 3-tab navigation structure',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development', 'staging'],
    category: 'ui-progressive' as const,
    complexity: 'basic' as const,
    riskLevel: 'low' as const
  },
  {
    key: 'ui.contacts-terminology',
    name: 'Contacts Terminology',
    description: 'Show "Contacts" instead of "Leads" in the UI',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development', 'staging'],
    category: 'ui-progressive' as const,
    complexity: 'basic' as const,
    riskLevel: 'low' as const
  },
  {
    key: 'ui.enhanced-dashboard',
    name: 'Enhanced Dashboard Cards',
    description: 'Enable enhanced dashboard with performance metrics cards',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin', 'manager'],
    environments: ['development', 'staging'],
    category: 'ui-progressive' as const,
    complexity: 'basic' as const,
    riskLevel: 'low' as const
  },

  // Agent Advanced Settings
  {
    key: 'agent.advanced-temperature',
    name: 'Advanced AI Temperature Control',
    description: 'Show temperature slider and advanced AI model parameters',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'agent-tuning' as const,
    complexity: 'advanced' as const,
    riskLevel: 'high' as const
  },
  {
    key: 'agent.custom-models',
    name: 'Custom Model Selection',
    description: 'Allow selection of specific AI models (GPT-4, Claude variants)',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'agent-tuning' as const,
    complexity: 'advanced' as const,
    riskLevel: 'medium' as const
  },
  {
    key: 'agent.debug-mode',
    name: 'Agent Debug Mode',
    description: 'Show detailed AI response logging and debugging options',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'debugging' as const,
    complexity: 'advanced' as const,
    riskLevel: 'medium' as const
  },
  {
    key: 'agent.working-hours',
    name: 'Advanced Working Hours',
    description: 'Complex working hours and handover configuration',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin', 'manager'],
    environments: ['development', 'staging'],
    category: 'agent-tuning' as const,
    complexity: 'intermediate' as const,
    riskLevel: 'medium' as const
  },

  // Campaign Advanced Features
  {
    key: 'campaign.ai-enhancement',
    name: 'AI Campaign Enhancement',
    description: 'AI-powered campaign description and goal enhancement',
    enabled: true,
    rolloutPercentage: 50,
    userRoles: ['admin', 'manager'],
    environments: ['development', 'staging', 'production'],
    category: 'campaign-advanced' as const,
    complexity: 'intermediate' as const,
    riskLevel: 'low' as const
  },
  {
    key: 'campaign.advanced-scheduling',
    name: 'Advanced Campaign Scheduling',
    description: 'Complex multi-timezone scheduling and optimization',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'campaign-advanced' as const,
    complexity: 'advanced' as const,
    riskLevel: 'medium' as const
  },
  {
    key: 'campaign.ab-testing',
    name: 'Campaign A/B Testing',
    description: 'A/B testing framework for campaigns',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'campaign-advanced' as const,
    complexity: 'advanced' as const,
    riskLevel: 'medium' as const
  },

  // System Configuration
  {
    key: 'system.database-tuning',
    name: 'Database Performance Tuning',
    description: 'Database connection pooling and performance settings',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'system-config' as const,
    complexity: 'advanced' as const,
    riskLevel: 'high' as const
  },
  {
    key: 'system.external-apis',
    name: 'External API Configuration',
    description: 'Direct configuration of Mailgun, Twilio, OpenAI settings',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'system-config' as const,
    complexity: 'advanced' as const,
    riskLevel: 'high' as const
  },
  {
    key: 'system.monitoring-advanced',
    name: 'Advanced System Monitoring',
    description: 'Advanced monitoring and alerting capabilities',
    enabled: true,
    rolloutPercentage: 100,
    userRoles: ['admin', 'manager'],
    environments: ['development', 'staging', 'production'],
    category: 'system-config' as const,
    complexity: 'intermediate' as const,
    riskLevel: 'low' as const
  },

  // Integration Features
  {
    key: 'integration.webhooks',
    name: 'Webhook Configuration',
    description: 'Advanced webhook and integration configuration',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'integrations' as const,
    complexity: 'advanced' as const,
    riskLevel: 'medium' as const
  },
  {
    key: 'integration.custom-fields',
    name: 'Custom Field Mapping',
    description: 'Custom field mapping for external integrations',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin', 'manager'],
    environments: ['development', 'staging'],
    category: 'integrations' as const,
    complexity: 'intermediate' as const,
    riskLevel: 'low' as const
  },

  // Role-Based Access
  {
    key: 'role.admin-only',
    name: 'Admin Only Features',
    description: 'Features that are only accessible to administrators',
    enabled: true,
    rolloutPercentage: 100,
    userRoles: ['admin'],
    environments: ['development', 'staging', 'production'],
    category: 'ui-progressive' as const,
    complexity: 'basic' as const,
    riskLevel: 'low' as const
  },
  {
    key: 'role.manager-access',
    name: 'Manager Level Access',
    description: 'Features available to managers and above',
    enabled: true,
    rolloutPercentage: 100,
    userRoles: ['admin', 'manager'],
    environments: ['development', 'staging', 'production'],
    category: 'ui-progressive' as const,
    complexity: 'basic' as const,
    riskLevel: 'low' as const
  },

  // Experimental Features
  {
    key: 'experimental.new-ui-components',
    name: 'New UI Components',
    description: 'Experimental UI components and layouts',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'experimental' as const,
    complexity: 'intermediate' as const,
    riskLevel: 'low' as const
  },
  {
    key: 'experimental.ai-insights',
    name: 'AI-Powered Insights',
    description: 'Experimental AI-powered analytics and insights',
    enabled: false,
    rolloutPercentage: 0,
    userRoles: ['admin'],
    environments: ['development'],
    category: 'experimental' as const,
    complexity: 'advanced' as const,
    riskLevel: 'medium' as const
  }
];

// Function to set up default feature flags
export async function setupDefaultFeatureFlags(): Promise<void> {
  console.log('Setting up default feature flags...');
  
  try {
    let created = 0;
    let skipped = 0;

    for (const flagData of DEFAULT_FLAGS) {
      try {
        await featureFlagService.createFlag(flagData);
        console.log(`✓ Created feature flag: ${flagData.key}`);
        created++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
          console.log(`⚠ Skipped existing flag: ${flagData.key}`);
          skipped++;
        } else {
          console.error(`✗ Failed to create flag ${flagData.key}:`, error);
          throw error;
        }
      }
    }

    console.log(`\n✅ Feature flag setup complete!`);
    console.log(`   Created: ${created} flags`);
    console.log(`   Skipped: ${skipped} existing flags`);
    console.log(`   Total: ${DEFAULT_FLAGS.length} flags processed`);

  } catch (error) {
    console.error('❌ Failed to setup default feature flags:', error);
    throw error;
  }
}

// Export the flags for reference
export { DEFAULT_FLAGS };

// If run directly
if (require.main === module) {
  setupDefaultFeatureFlags()
    .then(() => {
      console.log('Default feature flags setup completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to setup default feature flags:', error);
      process.exit(1);
    });
}