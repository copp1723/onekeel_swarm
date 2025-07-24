import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Feature flag context type
interface FeatureFlagContext {
  userId?: string;
  userRole?: 'admin' | 'manager' | 'agent' | 'viewer';
  environment: 'development' | 'staging' | 'production';
  customProperties?: Record<string, any>;
}

// Feature flag evaluation result
interface FeatureFlagEvaluation {
  enabled: boolean;
  reason: string;
  source: 'default' | 'rollout' | 'user_override' | 'role_targeting';
}

// Feature flag service client
class FeatureFlagClient {
  private cache = new Map<string, { enabled: boolean; expiry: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes client-side cache

  async isEnabled(flagKey: string, context: FeatureFlagContext): Promise<boolean> {
    // Check cache first
    const cached = this.cache.get(flagKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.enabled;
    }

    try {
      const response = await fetch('/api/feature-flags/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flagKey, context }),
      });

      if (!response.ok) {
        console.warn(`Feature flag evaluation failed for ${flagKey}:`, response.statusText);
        return false;
      }

      const data = await response.json();
      const enabled = data.success ? data.evaluation.enabled : false;

      // Cache the result
      this.cache.set(flagKey, {
        enabled,
        expiry: Date.now() + this.CACHE_TTL
      });

      return enabled;
    } catch (error) {
      console.error(`Error evaluating feature flag ${flagKey}:`, error);
      return false;
    }
  }

  async getAllFlags(context: FeatureFlagContext): Promise<Record<string, boolean>> {
    try {
      const response = await fetch('/api/feature-flags/all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        console.warn('Failed to fetch all feature flags:', response.statusText);
        return {};
      }

      const data = await response.json();
      return data.success ? data.flags : {};
    } catch (error) {
      console.error('Error fetching all feature flags:', error);
      return {};
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

const featureFlagClient = new FeatureFlagClient();

// Hook for checking a single feature flag
export const useFeatureFlag = (flagKey: string) => {
  const [enabled, setEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const checkFlag = useCallback(async () => {
    if (!flagKey) {
      setEnabled(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context: FeatureFlagContext = {
        userId: user?.id,
        userRole: user?.role as any,
        environment: (import.meta.env.VITE_ENVIRONMENT || 'development') as any,
      };

      const isEnabled = await featureFlagClient.isEnabled(flagKey, context);
      setEnabled(isEnabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [flagKey, user?.id, user?.role]);

  useEffect(() => {
    checkFlag();
  }, [checkFlag]);

  const refresh = useCallback(() => {
    featureFlagClient.clearCache();
    checkFlag();
  }, [checkFlag]);

  return { enabled, loading, error, refresh };
};

// Hook for checking multiple feature flags
export const useFeatureFlags = (flagKeys: string[]) => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const checkFlags = useCallback(async () => {
    if (!flagKeys || flagKeys.length === 0) {
      setFlags({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const context: FeatureFlagContext = {
        userId: user?.id,
        userRole: user?.role as any,
        environment: (import.meta.env.VITE_ENVIRONMENT || 'development') as any,
      };

      const results: Record<string, boolean> = {};
      
      // Check each flag individually (could be optimized with bulk API)
      await Promise.all(
        flagKeys.map(async (key) => {
          results[key] = await featureFlagClient.isEnabled(key, context);
        })
      );

      setFlags(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFlags({});
    } finally {
      setLoading(false);
    }
  }, [flagKeys, user?.id, user?.role]);

  useEffect(() => {
    checkFlags();
  }, [checkFlags]);

  const refresh = useCallback(() => {
    featureFlagClient.clearCache();
    checkFlags();
  }, [checkFlags]);

  return { flags, loading, error, refresh };
};

// Hook for all feature flags (useful for admin interfaces)
export const useAllFeatureFlags = () => {
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchAllFlags = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const context: FeatureFlagContext = {
        userId: user?.id,
        userRole: user?.role as any,
        environment: (import.meta.env.VITE_ENVIRONMENT || 'development') as any,
      };

      const allFlags = await featureFlagClient.getAllFlags(context);
      setFlags(allFlags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setFlags({});
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchAllFlags();
  }, [fetchAllFlags]);

  const refresh = useCallback(() => {
    featureFlagClient.clearCache();
    fetchAllFlags();
  }, [fetchAllFlags]);

  return { flags, loading, error, refresh };
};

// Utility hook for feature flag-based rendering
export const useFeatureFlaggedComponent = (flagKey: string, fallbackComponent?: React.ComponentType) => {
  const { enabled, loading } = useFeatureFlag(flagKey);
  
  return {
    enabled,
    loading,
    renderWhenEnabled: (component: React.ComponentType) => enabled ? component : null,
    renderWithFallback: (component: React.ComponentType) => {
      if (loading) return null;
      return enabled ? component : (fallbackComponent || null);
    }
  };
};