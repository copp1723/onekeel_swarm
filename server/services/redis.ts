/**
 * Redis Service for Secure Storage
 * 
 * Provides Redis connectivity for sessions, CSRF tokens, rate limiting, and caching.
 * Falls back gracefully in development mode with appropriate warnings.
 */

import Redis from 'ioredis';
import RedisStore from 'connect-redis';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;
let isRedisAvailable = false;

/**
 * Initialize Redis connection
 */
export async function initializeRedis(): Promise<void> {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('REDIS_URL is required in production for secure storage');
    }
    
    logger.warn('Redis URL not configured - using in-memory fallbacks (development only)');
    return;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Only reconnect when the error contains "READONLY"
          return true;
        }
        return false;
      },
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });

    // Handle connection events
    redisClient.on('connect', () => {
      logger.info('Redis client connected');
      isRedisAvailable = true;
    });

    redisClient.on('error', (err) => {
      logger.error('Redis client error', err);
      isRedisAvailable = false;
    });

    redisClient.on('close', () => {
      logger.warn('Redis client connection closed');
      isRedisAvailable = false;
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });

    // Test the connection
    await redisClient.ping();
    isRedisAvailable = true;
    logger.info('Redis connection established successfully');
  } catch (error) {
    logger.error('Failed to connect to Redis', error as Error);
    
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    
    // In development, continue without Redis
    logger.warn('Continuing without Redis (development mode)');
    if (redisClient) {
      redisClient.disconnect();
      redisClient = null;
    }
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  return redisClient;
}

/**
 * Check if Redis is available
 */
export function isRedisConnected(): boolean {
  return isRedisAvailable && redisClient !== null;
}

/**
 * Gracefully shutdown Redis connection
 */
export async function shutdownRedis(): Promise<void> {
  if (redisClient) {
    logger.info('Closing Redis connection...');
    await redisClient.quit();
    redisClient = null;
    isRedisAvailable = false;
  }
}

/**
 * Redis key namespaces for different features
 */
export const RedisNamespaces = {
  SESSION: 'session:',
  CSRF: 'csrf:',
  RATE_LIMIT: 'rate_limit:',
  CACHE: 'cache:',
  AUTH: 'auth:',
  WEBSOCKET: 'ws:'
} as const;

/**
 * Helper function to get namespaced key
 */
export function getRedisKey(namespace: keyof typeof RedisNamespaces, key: string): string {
  return `${RedisNamespaces[namespace]}${key}`;
}

/**
 * Set value with expiration
 */
export async function setWithExpiry(
  key: string, 
  value: string | number | Buffer, 
  expirySeconds: number
): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  await redisClient.setex(key, expirySeconds, value);
}

/**
 * Get value
 */
export async function getValue(key: string): Promise<string | null> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  return await redisClient.get(key);
}

/**
 * Delete value
 */
export async function deleteValue(key: string): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  await redisClient.del(key);
}

/**
 * Check if key exists
 */
export async function exists(key: string): Promise<boolean> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  const result = await redisClient.exists(key);
  return result === 1;
}

/**
 * Increment counter
 */
export async function increment(key: string, by: number = 1): Promise<number> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  return await redisClient.incrby(key, by);
}

/**
 * Set hash field
 */
export async function setHashField(
  key: string, 
  field: string, 
  value: string | number
): Promise<void> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  await redisClient.hset(key, field, value);
}

/**
 * Get hash field
 */
export async function getHashField(key: string, field: string): Promise<string | null> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  return await redisClient.hget(key, field);
}

/**
 * Get all hash fields
 */
export async function getHash(key: string): Promise<Record<string, string>> {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  
  return await redisClient.hgetall(key);
}

/**
 * Redis-based session store for Express
 */
export function createRedisSessionStore(session: any) {
  if (!redisClient) {
    throw new Error('Redis client must be initialized before creating session store');
  }
  
  return new RedisStore({
    client: redisClient,
    prefix: RedisNamespaces.SESSION,
    ttl: 86400 // 24 hours
  });
}