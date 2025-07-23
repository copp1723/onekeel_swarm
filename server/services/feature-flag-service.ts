import { db } from '../db/client';
import { featureFlags, featureFlagUserOverrides, users } from '../db/schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import type { 
  FeatureFlag, 
  NewFeatureFlag, 
  FeatureFlagUserOverride,
  NewFeatureFlagUserOverride 
} from '../db/schema';

// Feature Flag Context for evaluating flags
export interface FeatureFlagContext {
  userId?: string;
  userRole?: 'admin' | 'manager' | 'agent' | 'viewer';
  environment: 'development' | 'staging' | 'production';
  customProperties?: Record<string, any>;
}

// Feature Flag Evaluation Result
export interface FeatureFlagEvaluation {
  enabled: boolean;
  reason: string;
  source: 'default' | 'rollout' | 'user_override' | 'role_targeting';
}

// Feature Flag Service Class
export class FeatureFlagService {
  private static instance: FeatureFlagService;
  private flagCache = new Map<string, FeatureFlag>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Singleton pattern
  public static getInstance(): FeatureFlagService {
    if (!FeatureFlagService.instance) {
      FeatureFlagService.instance = new FeatureFlagService();
    }
    return FeatureFlagService.instance;
  }

  // Evaluate a single feature flag
  async isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
    const evaluation = await this.evaluateFlag(flagKey, context);
    return evaluation.enabled;
  }

  // Get detailed evaluation information
  async evaluateFlag(flagKey: string, context: FeatureFlagContext): Promise<FeatureFlagEvaluation> {
    try {
      // Get flag configuration
      const flag = await this.getFlag(flagKey);
      if (!flag) {
        return {
          enabled: false,
          reason: 'Flag not found',
          source: 'default'
        };
      }

      // Check if flag is globally disabled
      if (!flag.enabled) {
        return {
          enabled: false,
          reason: 'Flag globally disabled',
          source: 'default'
        };
      }

      // Check environment targeting
      const environments = flag.environments as string[];
      if (!environments.includes(context.environment)) {
        return {
          enabled: false,
          reason: `Environment ${context.environment} not targeted`,
          source: 'default'
        };
      }

      // Check user override first
      if (context.userId) {
        const userOverride = await this.getUserOverride(flag.id, context.userId);
        if (userOverride && (!userOverride.expiresAt || userOverride.expiresAt > new Date())) {
          return {
            enabled: userOverride.enabled,
            reason: userOverride.reason || 'User override',
            source: 'user_override'
          };
        }
      }

      // Check role targeting
      if (context.userRole) {
        const targetRoles = flag.userRoles as string[];
        if (!targetRoles.includes(context.userRole)) {
          return {
            enabled: false,
            reason: `Role ${context.userRole} not targeted`,
            source: 'role_targeting'
          };
        }
      }

      // Check rollout percentage
      if (flag.rolloutPercentage < 100) {
        const hash = this.getUserHash(context.userId || 'anonymous', flagKey);
        const threshold = flag.rolloutPercentage / 100;
        
        if (hash > threshold) {
          return {
            enabled: false,
            reason: `User not in ${flag.rolloutPercentage}% rollout`,
            source: 'rollout'
          };
        }
      }

      // Flag is enabled
      return {
        enabled: true,
        reason: 'All conditions met',
        source: 'default'
      };

    } catch (error) {
      console.error(`Error evaluating flag ${flagKey}:`, error);
      return {
        enabled: false,
        reason: 'Evaluation error',
        source: 'default'
      };
    }
  }

  // Get all flags for a context
  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, boolean>> {
    try {
      const flags = await db
        .select()
        .from(featureFlags)
        .where(eq(featureFlags.enabled, true));

      const result: Record<string, boolean> = {};
      
      for (const flag of flags) {
        const evaluation = await this.evaluateFlag(flag.key, context);
        result[flag.key] = evaluation.enabled;
      }

      return result;
    } catch (error) {
      console.error('Error getting all flags:', error);
      return {};
    }
  }

  // Administrative methods
  async createFlag(flagData: NewFeatureFlag): Promise<FeatureFlag> {
    const [flag] = await db
      .insert(featureFlags)
      .values({
        ...flagData,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();

    this.invalidateCache(flag.key);
    return flag;
  }

  async updateFlag(flagKey: string, updates: Partial<NewFeatureFlag>): Promise<FeatureFlag | null> {
    const [flag] = await db
      .update(featureFlags)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(featureFlags.key, flagKey))
      .returning();

    if (flag) {
      this.invalidateCache(flagKey);
    }

    return flag || null;
  }

  async deleteFlag(flagKey: string): Promise<boolean> {
    const [deleted] = await db
      .delete(featureFlags)
      .where(eq(featureFlags.key, flagKey))
      .returning();

    if (deleted) {
      this.invalidateCache(flagKey);
      return true;
    }

    return false;
  }

  // User override methods
  async setUserOverride(
    flagKey: string, 
    userId: string, 
    enabled: boolean, 
    reason?: string,
    expiresAt?: Date
  ): Promise<FeatureFlagUserOverride> {
    const flag = await this.getFlag(flagKey);
    if (!flag) {
      throw new Error(`Flag ${flagKey} not found`);
    }

    // Delete existing override
    await db
      .delete(featureFlagUserOverrides)
      .where(and(
        eq(featureFlagUserOverrides.flagId, flag.id),
        eq(featureFlagUserOverrides.userId, userId)
      ));

    // Create new override
    const [override] = await db
      .insert(featureFlagUserOverrides)
      .values({
        flagId: flag.id,
        userId,
        enabled,
        reason,
        expiresAt,
        createdAt: new Date()
      })
      .returning();

    return override;
  }

  async removeUserOverride(flagKey: string, userId: string): Promise<boolean> {
    const flag = await this.getFlag(flagKey);
    if (!flag) {
      return false;
    }

    const [deleted] = await db
      .delete(featureFlagUserOverrides)
      .where(and(
        eq(featureFlagUserOverrides.flagId, flag.id),
        eq(featureFlagUserOverrides.userId, userId)
      ))
      .returning();

    return !!deleted;
  }

  // Emergency methods
  async disableFlag(flagKey: string, reason: string = 'Emergency disable'): Promise<boolean> {
    const flag = await this.updateFlag(flagKey, { 
      enabled: false,
      rolloutPercentage: 0
    });

    if (flag) {
      // Log the emergency disable
      console.warn(`Feature flag ${flagKey} emergency disabled: ${reason}`);
      return true;
    }

    return false;
  }

  async enableFlag(flagKey: string, rolloutPercentage: number = 100): Promise<boolean> {
    const flag = await this.updateFlag(flagKey, { 
      enabled: true,
      rolloutPercentage
    });

    return !!flag;
  }

  // Rollback to previous state (simplified implementation)
  async rollbackFlag(flagKey: string): Promise<boolean> {
    // In a full implementation, this would restore from audit logs
    // For now, we'll just disable the flag
    return await this.disableFlag(flagKey, 'Rollback triggered');
  }

  // Cache management
  private async getFlag(flagKey: string): Promise<FeatureFlag | null> {
    // Check cache first
    const cached = this.flagCache.get(flagKey);
    const expiry = this.cacheExpiry.get(flagKey);
    
    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    // Fetch from database
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, flagKey))
      .limit(1);

    if (flag) {
      this.flagCache.set(flagKey, flag);
      this.cacheExpiry.set(flagKey, Date.now() + this.CACHE_TTL);
    }

    return flag || null;
  }

  private async getUserOverride(flagId: string, userId: string): Promise<FeatureFlagUserOverride | null> {
    const [override] = await db
      .select()
      .from(featureFlagUserOverrides)
      .where(and(
        eq(featureFlagUserOverrides.flagId, flagId),
        eq(featureFlagUserOverrides.userId, userId)
      ))
      .limit(1);

    return override || null;
  }

  private invalidateCache(flagKey: string): void {
    this.flagCache.delete(flagKey);
    this.cacheExpiry.delete(flagKey);
  }

  // Hash function for consistent user bucketing
  private getUserHash(userId: string, flagKey: string): number {
    const str = `${userId}:${flagKey}`;
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Convert to 0-1 range
    return Math.abs(hash) / 2147483647;
  }

  // Bulk operations
  async bulkEvaluate(flagKeys: string[], context: FeatureFlagContext): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    await Promise.all(
      flagKeys.map(async (key) => {
        results[key] = await this.isEnabled(key, context);
      })
    );

    return results;
  }

  // Get flags by category
  async getFlagsByCategory(category: string): Promise<FeatureFlag[]> {
    return await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.category, category as any));
  }

  // Health check
  async healthCheck(): Promise<{ status: string; flagsCount: number; cacheSize: number }> {
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(featureFlags);

      return {
        status: 'healthy',
        flagsCount: count,
        cacheSize: this.flagCache.size
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        flagsCount: 0,
        cacheSize: this.flagCache.size
      };
    }
  }
}

// Export singleton instance
export const featureFlagService = FeatureFlagService.getInstance();

// Convenience function for middleware
export const isFeatureEnabled = async (
  flagKey: string, 
  context: FeatureFlagContext
): Promise<boolean> => {
  return await featureFlagService.isEnabled(flagKey, context);
};