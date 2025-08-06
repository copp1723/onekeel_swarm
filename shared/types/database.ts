// Database type guards and validation for OneKeel Swarm
import type {
  User,
  Lead,
  Campaign,
  Communication,
  Session,
  FeatureFlag
} from '../../server/db/schema';

// Type guards for database entities
export function isValidUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'email' in obj &&
    'username' in obj &&
    'passwordHash' in obj &&
    'role' in obj &&
    'active' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).email === 'string' &&
    typeof (obj as any).username === 'string' &&
    typeof (obj as any).passwordHash === 'string' &&
    ['admin', 'manager', 'agent', 'viewer'].includes((obj as any).role) &&
    typeof (obj as any).active === 'boolean'
  );
}

export function isValidLead(obj: unknown): obj is Lead {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'status' in obj &&
    'source' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    typeof (obj as any).id === 'string' &&
    ['new', 'contacted', 'qualified', 'converted', 'rejected'].includes((obj as any).status) &&
    typeof (obj as any).source === 'string'
  );
}

export function isValidCampaign(obj: unknown): obj is Campaign {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'type' in obj &&
    'active' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).name === 'string' &&
    ['drip', 'blast', 'trigger'].includes((obj as any).type) &&
    typeof (obj as any).active === 'boolean'
  );
}

export function isValidCommunication(obj: unknown): obj is Communication {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'leadId' in obj &&
    'channel' in obj &&
    'direction' in obj &&
    'status' in obj &&
    'content' in obj &&
    'createdAt' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).leadId === 'string' &&
    ['email', 'sms', 'chat'].includes((obj as any).channel) &&
    ['inbound', 'outbound'].includes((obj as any).direction) &&
    ['pending', 'sent', 'delivered', 'failed', 'received'].includes((obj as any).status) &&
    typeof (obj as any).content === 'string'
  );
}

export function isValidSession(obj: unknown): obj is Session {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'userId' in obj &&
    'token' in obj &&
    'expiresAt' in obj &&
    'createdAt' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).userId === 'string' &&
    typeof (obj as any).token === 'string' &&
    (obj as any).expiresAt instanceof Date &&
    (obj as any).createdAt instanceof Date
  );
}

export function isValidFeatureFlag(obj: unknown): obj is FeatureFlag {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'key' in obj &&
    'name' in obj &&
    'enabled' in obj &&
    'rolloutPercentage' in obj &&
    'category' in obj &&
    'complexity' in obj &&
    'riskLevel' in obj &&
    'createdAt' in obj &&
    'updatedAt' in obj &&
    typeof (obj as any).id === 'string' &&
    typeof (obj as any).key === 'string' &&
    typeof (obj as any).name === 'string' &&
    typeof (obj as any).enabled === 'boolean' &&
    typeof (obj as any).rolloutPercentage === 'number' &&
    ['agent-tuning', 'campaign-advanced', 'system-config', 'integrations', 'ui-progressive', 'debugging', 'experimental'].includes((obj as any).category) &&
    ['basic', 'intermediate', 'advanced'].includes((obj as any).complexity) &&
    ['low', 'medium', 'high'].includes((obj as any).riskLevel)
  );
}

// Validation functions for enum values
export function isValidLeadStatus(status: unknown): status is 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected' {
  return typeof status === 'string' && ['new', 'contacted', 'qualified', 'converted', 'rejected'].includes(status);
}

export function isValidUserRole(role: unknown): role is 'admin' | 'manager' | 'agent' | 'viewer' {
  return typeof role === 'string' && ['admin', 'manager', 'agent', 'viewer'].includes(role);
}

export function isValidChannel(channel: unknown): channel is 'email' | 'sms' | 'chat' {
  return typeof channel === 'string' && ['email', 'sms', 'chat'].includes(channel);
}

export function isValidCommunicationDirection(direction: unknown): direction is 'inbound' | 'outbound' {
  return typeof direction === 'string' && ['inbound', 'outbound'].includes(direction);
}

export function isValidCommunicationStatus(status: unknown): status is 'pending' | 'sent' | 'delivered' | 'failed' | 'received' {
  return typeof status === 'string' && ['pending', 'sent', 'delivered', 'failed', 'received'].includes(status);
}

export function isValidCampaignType(type: unknown): type is 'drip' | 'blast' | 'trigger' {
  return typeof type === 'string' && ['drip', 'blast', 'trigger'].includes(type);
}

export function isValidAgentType(type: unknown): type is 'email' | 'sms' | 'chat' | 'voice' {
  return typeof type === 'string' && ['email', 'sms', 'chat', 'voice'].includes(type);
}

// Database result validation
export function validateDatabaseResult<T>(
  result: unknown,
  validator: (obj: unknown) => obj is T,
  context: string
): T | null {
  if (!result) {
    return null;
  }

  if (Array.isArray(result)) {
    if (result.length === 0) {
      return null;
    }
    const first = result[0];
    if (validator(first)) {
      return first;
    }
    throw new Error(`Invalid database result format in ${context}: expected valid entity, got ${typeof first}`);
  }

  if (validator(result)) {
    return result;
  }

  throw new Error(`Invalid database result format in ${context}: expected valid entity, got ${typeof result}`);
}

export function validateDatabaseResults<T>(
  results: unknown[],
  validator: (obj: unknown) => obj is T,
  context: string
): T[] {
  if (!Array.isArray(results)) {
    throw new Error(`Invalid database results format in ${context}: expected array, got ${typeof results}`);
  }

  const validResults: T[] = [];
  const invalidIndices: number[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (validator(result)) {
      validResults.push(result);
    } else {
      invalidIndices.push(i);
    }
  }

  if (invalidIndices.length > 0) {
    console.warn(`Warning: ${invalidIndices.length} invalid results found in ${context} at indices: ${invalidIndices.join(', ')}`);
  }

  return validResults;
}

// Safe type casting with validation
export function safeCastToUser(obj: unknown, context: string = 'unknown'): User {
  const result = validateDatabaseResult(obj, isValidUser, context);
  if (!result) {
    throw new Error(`No valid user found in ${context}`);
  }
  return result;
}

export function safeCastToLead(obj: unknown, context: string = 'unknown'): Lead {
  const result = validateDatabaseResult(obj, isValidLead, context);
  if (!result) {
    throw new Error(`No valid lead found in ${context}`);
  }
  return result;
}

export function safeCastToCampaign(obj: unknown, context: string = 'unknown'): Campaign {
  const result = validateDatabaseResult(obj, isValidCampaign, context);
  if (!result) {
    throw new Error(`No valid campaign found in ${context}`);
  }
  return result;
}

// Utility types for safe database operations
export type SafeDatabaseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

export function createSafeDatabaseResult<T>(
  result: unknown,
  validator: (obj: unknown) => obj is T,
  context: string
): SafeDatabaseResult<T | null> {
  try {
    const data = validateDatabaseResult(result, validator, context);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}

export function createSafeDatabaseResults<T>(
  results: unknown[],
  validator: (obj: unknown) => obj is T,
  context: string
): SafeDatabaseResult<T[]> {
  try {
    const data = validateDatabaseResults(results, validator, context);
    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown validation error' 
    };
  }
}