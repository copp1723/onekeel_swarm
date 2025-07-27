// Mock Feature Flag Service for when database is not available
export interface FeatureFlagContext {
  userId?: string;
  userRole?: 'admin' | 'manager' | 'agent' | 'viewer';
  environment: 'development' | 'staging' | 'production';
  customProperties?: Record<string, any>;
}

export interface FeatureFlagEvaluation {
  enabled: boolean;
  reason: string;
  source: 'default' | 'rollout' | 'user_override' | 'role_targeting';
}

// Default enabled flags for development
const DEFAULT_ENABLED_FLAGS = [
  'ui.contacts-terminology',
  'ui.agent-templates',
  'ui.campaign-intelligence',
  'ui.multi-agent-campaigns',
  'ui.progressive-disclosure',
  'campaign.multi-agent',
  'campaign.dynamic-sequencing',
  'campaign.behavioral-triggers',
  'agent.advanced-tuning',
  'system.terminology-config'
];

class MockFeatureFlagService {
  private flags = new Map<string, any>();

  constructor() {
    // Initialize with default flags
    DEFAULT_ENABLED_FLAGS.forEach(key => {
      this.flags.set(key, {
        key,
        enabled: true,
        rolloutPercentage: 100,
        userRoles: ['admin', 'manager', 'agent', 'viewer'],
        environments: ['development', 'staging', 'production']
      });
    });
  }

  async evaluateFlag(flagKey: string, context: FeatureFlagContext): Promise<FeatureFlagEvaluation> {
    const flag = this.flags.get(flagKey);
    
    if (!flag) {
      return {
        enabled: false,
        reason: 'Flag not found',
        source: 'default'
      };
    }

    // Check environment
    if (!flag.environments.includes(context.environment)) {
      return {
        enabled: false,
        reason: 'Not enabled for environment',
        source: 'default'
      };
    }

    // Check user role if specified
    if (context.userRole && !flag.userRoles.includes(context.userRole)) {
      return {
        enabled: false,
        reason: 'Not enabled for user role',
        source: 'role_targeting'
      };
    }

    return {
      enabled: flag.enabled,
      reason: 'Flag is enabled',
      source: 'default'
    };
  }

  async isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagKey, context);
    return evaluation.enabled;
  }

  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    
    for (const [key, _] of this.flags) {
      result[key] = await this.isEnabled(key, context);
    }
    
    return result;
  }

  async getFlagsByCategory(category: string): Promise<any[]> {
    const allFlags = Array.from(this.flags.values());
    if (category === 'all') return allFlags;
    
    return allFlags.filter(flag => 
      flag.key.startsWith(category.replace('-', '.'))
    );
  }

  async createFlag(flagData: any): Promise<any> {
    const flag = {
      ...flagData,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.flags.set(flag.key, flag);
    return flag;
  }

  async updateFlag(flagKey: string, updates: any): Promise<any> {
    const flag = this.flags.get(flagKey);
    if (!flag) return null;
    
    const updated = {
      ...flag,
      ...updates,
      updatedAt: new Date()
    };
    this.flags.set(flagKey, updated);
    return updated;
  }

  async deleteFlag(flagKey: string): Promise<boolean> {
    return this.flags.delete(flagKey);
  }

  async disableFlag(flagKey: string, reason: string): Promise<boolean> {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;
    
    flag.enabled = false;
    flag.disabledReason = reason;
    flag.updatedAt = new Date();
    return true;
  }

  async enableFlag(flagKey: string, rolloutPercentage: number = 100): Promise<boolean> {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;
    
    flag.enabled = true;
    flag.rolloutPercentage = rolloutPercentage;
    flag.updatedAt = new Date();
    delete flag.disabledReason;
    return true;
  }

  async setUserOverride(
    flagKey: string, 
    userId: string, 
    enabled: boolean, 
    reason?: string,
    expiresAt?: Date
  ): Promise<any> {
    // Mock implementation - just return success
    return {
      flagKey,
      userId,
      enabled,
      reason,
      expiresAt,
      createdAt: new Date()
    };
  }

  async healthCheck(): Promise<any> {
    return {
      status: 'healthy',
      flagCount: this.flags.size,
      lastCheck: new Date()
    };
  }
}

export const mockFeatureFlagService = new MockFeatureFlagService();