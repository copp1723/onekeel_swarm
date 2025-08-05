import Redis from 'ioredis';
import { logger } from './logger';

// Create Redis client with fallback for development
export const redis = process.env.REDIS_URL 
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: 'localhost',
      port: 6379,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null // Don't retry in development
    });

// Handle connection errors gracefully
redis.on('error', (error) => {
  if (error.code === 'ECONNREFUSED') {
    logger.warn('Redis connection refused - running without Redis cache');
  } else {
    logger.error('Redis error:', error);
  }
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

// Export a mock implementation for when Redis is not available
export const redisMock = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1,
  expire: async () => 1,
  ttl: async () => -1,
  exists: async () => 0,
  sadd: async () => 1,
  srem: async () => 1,
  smembers: async () => [],
  sismember: async () => 0
};

// Use mock if Redis is not connected
export const getRedisClient = () => {
  if (redis.status === 'ready') {
    return redis;
  }
  logger.warn('Using Redis mock - data will not persist');
  return redisMock;
};