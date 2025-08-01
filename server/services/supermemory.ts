import { logger } from '../utils/logger';

export interface SuperMemoryEntry {
  id: string;
  key: string;
  value: any;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export class SuperMemory {
  private memory: Map<string, SuperMemoryEntry> = new Map();

  async store(key: string, value: any, metadata?: Record<string, any>, ttl?: number): Promise<string> {
    const id = crypto.randomUUID();
    const entry: SuperMemoryEntry = {
      id,
      key,
      value,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: ttl ? new Date(Date.now() + ttl * 1000) : undefined
    };

    this.memory.set(key, entry);
    logger.debug('SuperMemory: Stored entry', { key, id });
    return id;
  }

  async retrieve(key: string): Promise<any> {
    const entry = this.memory.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.memory.delete(key);
      return null;
    }

    logger.debug('SuperMemory: Retrieved entry', { key, id: entry.id });
    return entry.value;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.memory.delete(key);
    if (deleted) {
      logger.debug('SuperMemory: Deleted entry', { key });
    }
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.memory.get(key);
    if (!entry) return false;

    // Check if expired
    if (entry.expiresAt && entry.expiresAt < new Date()) {
      this.memory.delete(key);
      return false;
    }

    return true;
  }

  async search(pattern: string): Promise<SuperMemoryEntry[]> {
    const results: SuperMemoryEntry[] = [];
    const regex = new RegExp(pattern, 'i');

    for (const [key, entry] of this.memory.entries()) {
      // Check if expired
      if (entry.expiresAt && entry.expiresAt < new Date()) {
        this.memory.delete(key);
        continue;
      }

      if (regex.test(key) || regex.test(JSON.stringify(entry.value))) {
        results.push(entry);
      }
    }

    return results;
  }

  async clear(): Promise<void> {
    this.memory.clear();
    logger.info('SuperMemory: Cleared all entries');
  }

  async getStats(): Promise<{
    totalEntries: number;
    memoryUsage: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    const entries = Array.from(this.memory.values());
    
    return {
      totalEntries: entries.length,
      memoryUsage: JSON.stringify(entries).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.createdAt.getTime())) as unknown as Date : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.createdAt.getTime())) as unknown as Date : undefined
    };
  }
}

// Mock implementation for testing
export class MockSuperMemory extends SuperMemory {
  constructor() {
    super();
    logger.info('MockSuperMemory initialized');
  }

  async store(key: string, value: any, metadata?: Record<string, any>, ttl?: number): Promise<string> {
    logger.info('MockSuperMemory: Store called', { key });
    return super.store(key, value, metadata, ttl);
  }

  async retrieve(key: string): Promise<any> {
    logger.info('MockSuperMemory: Retrieve called', { key });
    return super.retrieve(key);
  }

  // Add compatibility methods for agent memory interface
  async addMemory(data: { content: string; metadata?: Record<string, any>; spaces?: string[] }): Promise<string> {
    const key = `memory-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    logger.info('MockSuperMemory: AddMemory called', { key, spaces: data.spaces });
    return this.store(key, data.content, data.metadata);
  }

  async searchMemories(query: string, limit: number = 5): Promise<any[]> {
    logger.info('MockSuperMemory: SearchMemories called', { query, limit });
    const results = await this.search(query);
    return results.slice(0, limit).map(entry => ({
      content: entry.value,
      metadata: entry.metadata,
      id: entry.id
    }));
  }
}

export const superMemory = new SuperMemory();
export const mockSuperMemory = new MockSuperMemory();