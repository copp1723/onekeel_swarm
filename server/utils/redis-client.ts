/**
 * Redis Client Utility
 * 
 * Provides a simplified interface to Redis functionality for use across the application.
 * This acts as a wrapper around the main Redis service.
 */

import { getRedisClient } from '../services/redis';

// Export the redis client instance
export const redis = getRedisClient();

// Re-export commonly used Redis functions for convenience
export {
  initializeRedis,
  isRedisConnected,
  shutdownRedis,
  RedisNamespaces,
  getRedisKey,
  setWithExpiry,
  getValue,
  deleteValue,
  exists,
  increment,
  setHashField,
  getHashField,
  getHash,
  createRedisSessionStore
} from '../services/redis';