/**
 * Simplified Validation System - Post Refactor
 * Only exports actually available functions from unified-validators
 */

// Import what actually exists
import {
  isValidUUID,
  isValidUUIDv4, 
  isValidNumericId,
  isValidPositiveId,
  sanitizeId,
  validateIdArray,
  sanitizeIdArray,
  uuidSchema,
  uuidV4Schema,
  numericIdSchema,
  positiveIdSchema
} from './unified-validators';

// Basic validation functions that are commonly needed
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

export function sanitizeString(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

export function validateRequired(value: any): boolean {
  return value !== null && value !== undefined && value !== '';
}

// Export the ID validation functions that actually exist
export {
  isValidUUID,
  isValidUUIDv4,
  isValidNumericId, 
  isValidPositiveId,
  sanitizeId,
  validateIdArray,
  sanitizeIdArray,
  uuidSchema,
  uuidV4Schema,
  numericIdSchema,
  positiveIdSchema
};

// Legacy aliases for backward compatibility
export const validateUUID = isValidUUID;
export const validateID = isValidUUID;
export const sanitizeInput = sanitizeString;

// Simple validation result type
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Simple validation function creator
export function createValidator(validationFn: (value: any) => boolean, errorMessage: string) {
  return (value: any): ValidationResult => {
    const isValid = validationFn(value);
    return {
      isValid,
      error: isValid ? undefined : errorMessage
    };
  };
}

// Export a unified validation object for easy use
export const validation = {
  email: validateEmail,
  phone: validatePhone,
  uuid: isValidUUID,
  required: validateRequired,
  sanitize: sanitizeString
};
