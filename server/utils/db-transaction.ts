import { db } from '../db/client';
import { logger } from './logger';

export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Execute a database operation within a transaction with retry logic
 */
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>,
  options: TransactionOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Start transaction
      const result = await db.transaction(async (tx) => {
        return await callback(tx);
      });
      
      return result;
    } catch (error: any) {
      lastError = error;
      logger.warn(`Transaction attempt ${attempt} failed`, { error: error.message });
      
      // Check if error is retryable
      if (!isRetryableError(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, retryDelay * Math.pow(2, attempt - 1))
      );
    }
  }

  throw lastError!;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any): boolean {
  // PostgreSQL error codes that are retryable
  const retryableCodes = [
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '55P03', // lock_not_available
    '57P01', // admin_shutdown
    '57P02', // crash_shutdown
    '57P03', // cannot_connect_now
    '58000', // system_error
    '58030', // io_error
    '08006', // connection_failure
    '08001', // sqlclient_unable_to_establish_sqlconnection
    '08004', // sqlserver_rejected_establishment_of_sqlconnection
  ];

  return retryableCodes.includes(error.code) || 
         error.message?.includes('connection') ||
         error.message?.includes('timeout');
}

/**
 * Batch insert with transaction
 */
export async function batchInsert<T>(
  table: any,
  records: T[],
  batchSize: number = 100
): Promise<void> {
  await withTransaction(async (tx) => {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await tx.insert(table).values(batch);
    }
  });
}