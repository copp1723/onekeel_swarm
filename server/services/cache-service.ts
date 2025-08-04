import Redis from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Redis-based caching service for database optimization
 * Implements caching strategies for frequently accessed data
 */
class CacheService {
  private redis: Redis | null = null;
  private isEnabled: boolean = false;
  private readonly defaultTTL: number = 300; // 5 minutes default TTL

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Check if Redis URL is configured
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl) {
        logger.warn('Redis URL not configured, caching disabled');
        return;
      }

      // Create Redis connection with proper configuration for production
      this.redis = new Redis(redisUrl, {
        // Connection settings
        connectTimeout: 10000, // 10 seconds
        commandTimeout: 5000,  // 5 seconds
        retryDelayOnFailover: 100,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 3,
        
        // Redis cluster/sentinel configuration
        lazyConnect: true,
        keepAlive: 30000,
        
        // Connection pool settings
        family: 4, // IPv4
        
        // Error handling
        retryDelayOnClusterDown: 300,
        enableReadyCheck: true,
        maxRetriesPerRequest: null,
        
        // Performance settings
        compression: 'gzip',
        
        // Monitoring
        showFriendlyErrorStack: process.env.NODE_ENV === 'development'
      });

      // Connection event handlers
      this.redis.on('connect', () => {
        logger.info('Redis cache connected successfully');
        this.isEnabled = true;
      });

      this.redis.on('error', (error) => {
        logger.error('Redis cache connection error', error);
        this.isEnabled = false;
      });

      this.redis.on('close', () => {
        logger.warn('Redis cache connection closed');
        this.isEnabled = false;
      });

      this.redis.on('reconnecting', () => {
        logger.info('Redis cache reconnecting...');
      });

      // Test connection
      await this.redis.connect();
      await this.redis.ping();
      
      logger.info('Redis cache service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize Redis cache service', error as Error);
      this.isEnabled = false;
    }
  }

  /**
   * Get cached value with JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.get(this.prefixKey(key));
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache get error', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Set cached value with JSON serialization and TTL
   */
  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.setex(this.prefixKey(key), ttl, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.del(this.prefixKey(key));
      return result > 0;
    } catch (error) {
      logger.error('Cache delete error', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(this.prefixKey(pattern));
      if (keys.length === 0) {
        return 0;
      }
      return await this.redis.del(...keys);
    } catch (error) {
      logger.error('Cache delete pattern error', { pattern, error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.exists(this.prefixKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error', { key, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const result = await this.redis.expire(this.prefixKey(key), ttl);
      return result === 1;
    } catch (error) {
      logger.error('Cache expire error', { key, ttl, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Increment counter
   */
  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.isEnabled || !this.redis) {
      return 0;
    }

    try {
      const result = await this.redis.incr(this.prefixKey(key));
      if (ttl && result === 1) {
        // Set TTL only on first increment
        await this.redis.expire(this.prefixKey(key), ttl);
      }
      return result;
    } catch (error) {
      logger.error('Cache increment error', { key, error: (error as Error).message });
      return 0;
    }
  }

  /**
   * Add to hash
   */
  async hset(key: string, field: string, value: any): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.hset(this.prefixKey(key), field, serializedValue);
      return true;
    } catch (error) {
      logger.error('Cache hset error', { key, field, error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get from hash
   */
  async hget<T>(key: string, field: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const value = await this.redis.hget(this.prefixKey(key), field);
      if (value === null) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Cache hget error', { key, field, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Get all hash fields
   */
  async hgetall<T extends Record<string, any>>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.redis) {
      return null;
    }

    try {
      const values = await this.redis.hgetall(this.prefixKey(key));
      if (Object.keys(values).length === 0) {
        return null;
      }
      
      const parsed: Record<string, any> = {};
      for (const [field, value] of Object.entries(values)) {
        try {
          parsed[field] = JSON.parse(value);
        } catch {
          parsed[field] = value;
        }
      }
      return parsed as T;
    } catch (error) {
      logger.error('Cache hgetall error', { key, error: (error as Error).message });
      return null;
    }
  }

  /**
   * Cache with fallback to database function
   */
  async getOrSet<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database
    const value = await fetchFunction();
    
    // Cache the result (fire and forget)
    this.set(key, value, ttl).catch(error => {
      logger.error('Failed to cache value', { key, error: (error as Error).message });
    });

    return value;
  }

  /**
   * Batch get multiple keys
   */
  async mget<T>(keys: string[]): Promise<Record<string, T | null>> {
    if (!this.isEnabled || !this.redis || keys.length === 0) {
      return {};
    }

    try {
      const prefixedKeys = keys.map(key => this.prefixKey(key));
      const values = await this.redis.mget(...prefixedKeys);
      
      const result: Record<string, T | null> = {};
      keys.forEach((key, index) => {
        const value = values[index];
        try {
          result[key] = value ? JSON.parse(value) : null;
        } catch {
          result[key] = null;
        }
      });
      
      return result;
    } catch (error) {
      logger.error('Cache mget error', { keys, error: (error as Error).message });
      return {};
    }
  }

  /**
   * Batch set multiple keys
   */
  async mset(keyValues: Record<string, any>, ttl: number = this.defaultTTL): Promise<boolean> {
    if (!this.isEnabled || !this.redis || Object.keys(keyValues).length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();
      
      for (const [key, value] of Object.entries(keyValues)) {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(this.prefixKey(key), ttl, serializedValue);
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Cache mset error', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (!this.isEnabled || !this.redis) {
      return { enabled: false };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        enabled: true,
        memory: info,
        keyspace: keyspace,
        connected: this.redis.status === 'ready'
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error);
      return { enabled: false, error: (error as Error).message };
    }
  }

  /**
   * Clear all cache
   */
  async flush(): Promise<boolean> {
    if (!this.isEnabled || !this.redis) {
      return false;
    }

    try {
      await this.redis.flushall();
      logger.info('Cache flushed successfully');
      return true;
    } catch (error) {
      logger.error('Cache flush error', error as Error);
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.quit();
        logger.info('Redis cache connection closed');
      } catch (error) {
        logger.error('Error closing Redis cache connection', error as Error);
      }
    }
  }

  /**
   * Check if caching is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Prefix keys to avoid collisions
   */
  private prefixKey(key: string): string {
    const prefix = process.env.CACHE_KEY_PREFIX || 'onekeel:';
    return `${prefix}${key}`;
  }

  // High-level cache methods for common data patterns

  /**
   * Cache user data
   */
  async cacheUser(userId: string, userData: any, ttl: number = 900): Promise<void> {
    await this.set(`user:${userId}`, userData, ttl); // 15 minutes
  }

  /**
   * Get cached user data
   */
  async getCachedUser(userId: string): Promise<any | null> {
    return await this.get(`user:${userId}`);
  }

  /**
   * Cache lead data
   */
  async cacheLead(leadId: string, leadData: any, ttl: number = 600): Promise<void> {
    await this.set(`lead:${leadId}`, leadData, ttl); // 10 minutes
  }

  /**
   * Get cached lead data
   */
  async getCachedLead(leadId: string): Promise<any | null> {
    return await this.get(`lead:${leadId}`);
  }

  /**
   * Cache campaign data
   */
  async cacheCampaign(campaignId: string, campaignData: any, ttl: number = 1800): Promise<void> {
    await this.set(`campaign:${campaignId}`, campaignData, ttl); // 30 minutes
  }

  /**
   * Get cached campaign data
   */
  async getCachedCampaign(campaignId: string): Promise<any | null> {
    return await this.get(`campaign:${campaignId}`);
  }

  /**
   * Cache conversation data
   */
  async cacheConversation(conversationId: string, conversationData: any, ttl: number = 300): Promise<void> {
    await this.set(`conversation:${conversationId}`, conversationData, ttl); // 5 minutes
  }

  /**
   * Get cached conversation data
   */
  async getCachedConversation(conversationId: string): Promise<any | null> {
    return await this.get(`conversation:${conversationId}`);
  }

  /**
   * Cache agent configuration
   */
  async cacheAgentConfig(agentType: string, configData: any, ttl: number = 3600): Promise<void> {
    await this.set(`agent_config:${agentType}`, configData, ttl); // 1 hour
  }

  /**
   * Get cached agent configuration
   */
  async getCachedAgentConfig(agentType: string): Promise<any | null> {
    return await this.get(`agent_config:${agentType}`);
  }

  /**
   * Invalidate related caches when data changes
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    await this.delPattern(`user:${userId}*`);
    await this.delPattern(`session:${userId}*`);
  }

  /**
   * Invalidate lead-related caches
   */
  async invalidateLeadCaches(leadId: string): Promise<void> {
    await this.delPattern(`lead:${leadId}*`);
    await this.delPattern(`conversation:*:lead:${leadId}`);
  }

  /**
   * Invalidate campaign-related caches
   */
  async invalidateCampaignCaches(campaignId: string): Promise<void> {
    await this.delPattern(`campaign:${campaignId}*`);
    await this.delPattern(`*:campaign:${campaignId}`);
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Export for dependency injection and testing
export { CacheService };