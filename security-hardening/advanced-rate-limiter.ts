/**
 * Advanced Rate Limiting System with Distributed Cache Support
 * Provides flexible rate limiting with multiple strategies and Redis support
 */

import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { redis } from '../server/utils/redis-client';

// Rate limit strategies
export enum RateLimitStrategy {
  FIXED_WINDOW = 'fixed_window',
  SLIDING_WINDOW = 'sliding_window',
  TOKEN_BUCKET = 'token_bucket',
  LEAKY_BUCKET = 'leaky_bucket'
}

// Rate limit key generators
export enum KeyGenerator {
  IP = 'ip',
  USER = 'user',
  API_KEY = 'api_key',
  ENDPOINT = 'endpoint',
  CUSTOM = 'custom'
}

// Rate limit configuration
export interface RateLimitConfig {
  windowMs: number;
  max: number;
  strategy?: RateLimitStrategy;
  keyGenerator?: KeyGenerator | ((req: Request) => string);
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  store?: 'memory' | 'redis';
  message?: string | ((req: Request, res: Response) => string);
  handler?: (req: Request, res: Response, next: NextFunction) => void;
  skip?: (req: Request) => boolean;
  requestWasSuccessful?: (req: Request, res: Response) => boolean;
  // Advanced options
  weight?: (req: Request) => number;
  groupBy?: (req: Request) => string;
  costFunction?: (req: Request) => number;
  // Token bucket specific
  tokensPerInterval?: number;
  interval?: number;
  maxTokens?: number;
}

// In-memory store for rate limiting
class MemoryStore {
  private hits: Map<string, number[]> = new Map();
  private tokens: Map<string, { tokens: number; lastRefill: number }> = new Map();

  async increment(key: string, windowMs: number, strategy: RateLimitStrategy): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;

    switch (strategy) {
      case RateLimitStrategy.FIXED_WINDOW:
        return this.fixedWindowIncrement(key, windowMs, now);
      case RateLimitStrategy.SLIDING_WINDOW:
        return this.slidingWindowIncrement(key, windowMs, now);
      case RateLimitStrategy.TOKEN_BUCKET:
        return this.tokenBucketIncrement(key, windowMs, now);
      default:
        return this.fixedWindowIncrement(key, windowMs, now);
    }
  }

  private fixedWindowIncrement(key: string, windowMs: number, now: number): { count: number; resetTime: number } {
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `${key}:${windowStart}`;
    
    const hits = this.hits.get(windowKey) || [];
    hits.push(now);
    this.hits.set(windowKey, hits);

    // Cleanup old windows
    this.cleanup(now - windowMs * 2);

    return {
      count: hits.length,
      resetTime: windowStart + windowMs
    };
  }

  private slidingWindowIncrement(key: string, windowMs: number, now: number): { count: number; resetTime: number } {
    const hits = this.hits.get(key) || [];
    const windowStart = now - windowMs;
    
    // Filter hits within the window
    const validHits = hits.filter(hit => hit > windowStart);
    validHits.push(now);
    this.hits.set(key, validHits);

    return {
      count: validHits.length,
      resetTime: now + windowMs
    };
  }

  private tokenBucketIncrement(key: string, windowMs: number, now: number, tokensPerInterval = 10, maxTokens = 100): { count: number; resetTime: number } {
    let bucket = this.tokens.get(key) || { tokens: maxTokens, lastRefill: now };
    
    // Refill tokens based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(timePassed / windowMs * tokensPerInterval);
    bucket.tokens = Math.min(bucket.tokens + tokensToAdd, maxTokens);
    bucket.lastRefill = now;

    // Consume a token
    if (bucket.tokens > 0) {
      bucket.tokens--;
      this.tokens.set(key, bucket);
      return { count: maxTokens - bucket.tokens, resetTime: now + windowMs };
    }

    return { count: maxTokens + 1, resetTime: now + windowMs };
  }

  private cleanup(before: number) {
    for (const [key, hits] of this.hits.entries()) {
      if (key.includes(':')) {
        const windowStart = parseInt(key.split(':')[1]);
        if (windowStart < before) {
          this.hits.delete(key);
        }
      }
    }
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key);
    this.tokens.delete(key);
  }
}

// Redis store for distributed rate limiting
class RedisStore {
  async increment(key: string, windowMs: number, strategy: RateLimitStrategy): Promise<{ count: number; resetTime: number }> {
    if (!redis) {
      throw new Error('Redis client not initialized');
    }

    const now = Date.now();
    const resetTime = now + windowMs;

    switch (strategy) {
      case RateLimitStrategy.FIXED_WINDOW:
        return this.redisFixedWindow(key, windowMs, now);
      case RateLimitStrategy.SLIDING_WINDOW:
        return this.redisSlidingWindow(key, windowMs, now);
      case RateLimitStrategy.TOKEN_BUCKET:
        return this.redisTokenBucket(key, windowMs, now);
      default:
        return this.redisFixedWindow(key, windowMs, now);
    }
  }

  private async redisFixedWindow(key: string, windowMs: number, now: number): Promise<{ count: number; resetTime: number }> {
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `ratelimit:${key}:${windowStart}`;
    
    const multi = redis.multi();
    multi.incr(windowKey);
    multi.expire(windowKey, Math.ceil(windowMs / 1000));
    const results = await multi.exec();
    
    const count = results?.[0]?.[1] as number || 1;
    
    return {
      count,
      resetTime: windowStart + windowMs
    };
  }

  private async redisSlidingWindow(key: string, windowMs: number, now: number): Promise<{ count: number; resetTime: number }> {
    const windowKey = `ratelimit:sliding:${key}`;
    const windowStart = now - windowMs;
    
    const multi = redis.multi();
    // Remove old entries
    multi.zremrangebyscore(windowKey, '-inf', windowStart.toString());
    // Add current request
    multi.zadd(windowKey, now.toString(), `${now}:${Math.random()}`);
    // Count requests in window
    multi.zcount(windowKey, windowStart.toString(), '+inf');
    // Set expiry
    multi.expire(windowKey, Math.ceil(windowMs / 1000));
    
    const results = await multi.exec();
    const count = results?.[2]?.[1] as number || 1;
    
    return {
      count,
      resetTime: now + windowMs
    };
  }

  private async redisTokenBucket(key: string, windowMs: number, now: number, tokensPerInterval = 10, maxTokens = 100): Promise<{ count: number; resetTime: number }> {
    const bucketKey = `ratelimit:bucket:${key}`;
    
    // Lua script for atomic token bucket operations
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_ms = tonumber(ARGV[2])
      local tokens_per_interval = tonumber(ARGV[3])
      local max_tokens = tonumber(ARGV[4])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
      local tokens = tonumber(bucket[1]) or max_tokens
      local last_refill = tonumber(bucket[2]) or now
      
      -- Refill tokens
      local time_passed = now - last_refill
      local tokens_to_add = math.floor(time_passed / window_ms * tokens_per_interval)
      tokens = math.min(tokens + tokens_to_add, max_tokens)
      
      -- Try to consume a token
      if tokens > 0 then
        tokens = tokens - 1
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
        return {1, max_tokens - tokens}
      else
        return {0, max_tokens + 1}
      end
    `;
    
    const result = await redis.eval(luaScript, 1, bucketKey, now.toString(), windowMs.toString(), tokensPerInterval.toString(), maxTokens.toString()) as [number, number];
    
    return {
      count: result[1],
      resetTime: now + windowMs
    };
  }

  async reset(key: string): Promise<void> {
    if (!redis) return;
    
    const keys = await redis.keys(`ratelimit:*:${key}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

// Advanced rate limiter class
export class AdvancedRateLimiter {
  private config: Required<RateLimitConfig>;
  private store: MemoryStore | RedisStore;

  constructor(config: RateLimitConfig) {
    this.config = {
      windowMs: config.windowMs,
      max: config.max,
      strategy: config.strategy || RateLimitStrategy.FIXED_WINDOW,
      keyGenerator: config.keyGenerator || KeyGenerator.IP,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      standardHeaders: config.standardHeaders !== false,
      legacyHeaders: config.legacyHeaders || false,
      store: config.store || 'memory',
      message: config.message || 'Too many requests, please try again later.',
      handler: config.handler || this.defaultHandler,
      skip: config.skip || (() => false),
      requestWasSuccessful: config.requestWasSuccessful || ((req, res) => res.statusCode < 400),
      weight: config.weight || (() => 1),
      groupBy: config.groupBy || (() => ''),
      costFunction: config.costFunction || (() => 1),
      tokensPerInterval: config.tokensPerInterval || 10,
      interval: config.interval || 1000,
      maxTokens: config.maxTokens || 100
    };

    this.store = this.config.store === 'redis' ? new RedisStore() : new MemoryStore();
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check if should skip
        if (this.config.skip(req)) {
          return next();
        }

        // Generate key
        const key = this.generateKey(req);
        const group = this.config.groupBy(req);
        const fullKey = group ? `${group}:${key}` : key;

        // Calculate request cost
        const cost = this.config.costFunction(req);
        const weight = this.config.weight(req);
        const effectiveCost = cost * weight;

        // Increment counter
        const { count, resetTime } = await this.store.increment(fullKey, this.config.windowMs, this.config.strategy);

        // Set headers
        if (this.config.standardHeaders) {
          res.setHeader('RateLimit-Limit', this.config.max);
          res.setHeader('RateLimit-Remaining', Math.max(0, this.config.max - count));
          res.setHeader('RateLimit-Reset', new Date(resetTime).toISOString());
          res.setHeader('RateLimit-Reset-After', Math.ceil((resetTime - Date.now()) / 1000));
        }

        if (this.config.legacyHeaders) {
          res.setHeader('X-RateLimit-Limit', this.config.max);
          res.setHeader('X-RateLimit-Remaining', Math.max(0, this.config.max - count));
          res.setHeader('X-RateLimit-Reset', resetTime);
        }

        // Check if limit exceeded
        if (count > this.config.max) {
          res.setHeader('Retry-After', Math.ceil((resetTime - Date.now()) / 1000));
          return this.config.handler(req, res, next);
        }

        // Track response to potentially not count it
        if (this.config.skipSuccessfulRequests || this.config.skipFailedRequests) {
          const originalEnd = res.end;
          res.end = (...args: any[]) => {
            const wasSuccessful = this.config.requestWasSuccessful(req, res);
            
            if ((wasSuccessful && this.config.skipSuccessfulRequests) ||
                (!wasSuccessful && this.config.skipFailedRequests)) {
              // Decrement the counter
              this.store.reset(fullKey);
            }
            
            return originalEnd.apply(res, args);
          };
        }

        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        // Fail open - don't block requests on error
        next();
      }
    };
  }

  private generateKey(req: Request): string {
    if (typeof this.config.keyGenerator === 'function') {
      return this.config.keyGenerator(req);
    }

    switch (this.config.keyGenerator) {
      case KeyGenerator.IP:
        return this.getIP(req);
      case KeyGenerator.USER:
        return (req as any).user?.id || this.getIP(req);
      case KeyGenerator.API_KEY:
        return req.headers['x-api-key'] as string || this.getIP(req);
      case KeyGenerator.ENDPOINT:
        return `${req.method}:${req.path}`;
      default:
        return this.getIP(req);
    }
  }

  private getIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return (forwarded as string).split(',')[0].trim();
    }
    return req.socket.remoteAddress || 'unknown';
  }

  private defaultHandler(req: Request, res: Response, next: NextFunction) {
    const message = typeof this.config.message === 'function' 
      ? this.config.message(req, res)
      : this.config.message;

    res.status(429).json({
      error: 'Too Many Requests',
      message,
      retryAfter: res.getHeader('Retry-After')
    });
  }

  // Reset rate limit for a specific key
  async reset(req: Request): Promise<void> {
    const key = this.generateKey(req);
    await this.store.reset(key);
  }
}

// Preset configurations
export const RateLimitPresets = {
  // Strict API rate limiting
  strictAPI: new AdvancedRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    strategy: RateLimitStrategy.SLIDING_WINDOW,
    store: 'redis',
    message: 'API rate limit exceeded. Please retry after some time.'
  }),

  // Authentication endpoints
  auth: new AdvancedRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    strategy: RateLimitStrategy.FIXED_WINDOW,
    keyGenerator: KeyGenerator.IP,
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts. Please try again later.'
  }),

  // File upload endpoints
  upload: new AdvancedRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    strategy: RateLimitStrategy.TOKEN_BUCKET,
    tokensPerInterval: 2,
    maxTokens: 10,
    costFunction: (req) => {
      // Cost based on file size
      const size = parseInt(req.headers['content-length'] || '0');
      return Math.ceil(size / (1024 * 1024)); // 1 token per MB
    }
  }),

  // Public API endpoints
  publicAPI: new AdvancedRateLimiter({
    windowMs: 60 * 1000,
    max: 30,
    strategy: RateLimitStrategy.SLIDING_WINDOW,
    keyGenerator: (req) => {
      // Rate limit by API key if provided, otherwise by IP
      return req.headers['x-api-key'] as string || req.socket.remoteAddress || 'unknown';
    }
  }),

  // Websocket connections
  websocket: new AdvancedRateLimiter({
    windowMs: 60 * 1000,
    max: 5,
    strategy: RateLimitStrategy.FIXED_WINDOW,
    message: 'Too many websocket connection attempts'
  })
};

// Helper to create custom rate limiters
export function createRateLimiter(config: RateLimitConfig) {
  return new AdvancedRateLimiter(config);
}