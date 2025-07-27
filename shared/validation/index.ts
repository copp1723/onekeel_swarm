/**
 * Centralized validation exports
 * Provides unified access to all validation utilities
 */

// Export unified validators
export * from './unified-validators';
export * from './csv-sanitization';
export * from './validation-schemas';
export * from './validation-middleware';

// Export specific utilities for backward compatibility
export {
  validateUUID,
  validateID,
  validateEmail,
  validatePhone,
  validateURL,
  validateDate,
  validateNumber,
  validateString,
  validateBoolean,
  validateArray,
  validateObject,
  sanitizeInput,
  sanitizeHTML,
  sanitizeJSON,
  sanitizeCSV,
  sanitizeFileName,
  sanitizePath,
  sanitizeURL,
  sanitizeEmail,
  sanitizePhone,
  sanitizeDate,
  sanitizeNumber,
  sanitizeString,
  sanitizeBoolean,
  sanitizeArray,
  sanitizeObject,
  createValidator,
  createSanitizer,
  combineValidators,
  combineSanitizers,
  validateAndSanitize,
  ValidationError,
  ValidationResult,
  SanitizationResult,
  ValidatorFunction,
  SanitizerFunction,
  ValidationOptions,
  SanitizationOptions
} from './unified-validators';

// Export CSV utilities
export {
  sanitizeCSVCell,
  sanitizeCSVRow,
  validateCSVFile,
  generateSecureCSVResponse,
  makeCSVSafe,
  validateCSVHeaders,
  isValidEmail,
  CSVUtils
} from './csv-sanitization';

// Export validation schemas
export {
  userSchema,
  contactSchema,
  campaignSchema,
  messageSchema,
  templateSchema,
  listSchema,
  segmentSchema,
  webhookSchema,
  apiKeySchema,
  subscriptionSchema,
  analyticsSchema,
  validateSchema,
  createSchemaValidator,
  SchemaValidationError
} from './validation-schemas';

// Export validation middleware
export {
  validateRequest,
  validateResponse,
  validateQuery,
  validateParams,
  validateBody,
  validateHeaders,
  createValidationMiddleware,
  handleValidationErrors,
  ValidationMiddlewareOptions
} from './validation-middleware';

// Export types
export type {
  ValidationError,
  ValidationResult,
  SanitizationResult,
  ValidatorFunction,
  SanitizerFunction,
  ValidationOptions,
  SanitizationOptions,
  SchemaValidationError,
  ValidationMiddlewareOptions
} from './unified-validators';

// Re-export common validation patterns
export const VALIDATION_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  URL: /^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$/,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  TIME: /^\d{2}:\d{2}:\d{2}$/,
  DATETIME: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?$/,
  COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  NUMERIC: /^\d+$/,
  DECIMAL: /^\d+(?:\.\d+)?$/,
  ALPHABETIC: /^[a-zA-Z]+$/,
  LOWERCASE: /^[a-z]+$/,
  UPPERCASE: /^[A-Z]+$/,
  WHITESPACE: /^\s+$/,
  NON_EMPTY: /^(?!\s*$).+/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  CREDIT_CARD: /^(?:\d{4}[\s-]?){3}\d{4}$/,
  POSTAL_CODE: /^\d{5}(?:-\d{4})?$/,
  IPV4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  IPV6: /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
  MAC_ADDRESS: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
  DOMAIN: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/,
  SUBDOMAIN: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)$/,
  PATH: /^\/(?:[^\/]+\/?)*$/,
  FILENAME: /^[a-zA-Z0-9._-]+$/,
  EXTENSION: /^\.[a-zA-Z0-9]+$/,
  MIME_TYPE: /^[a-zA-Z0-9]+\/[a-zA-Z0-9-+.]+$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,16}$/,
  TWITTER_HANDLE: /^@[a-zA-Z0-9_]{1,15}$/,
  HASHTAG: /^#[a-zA-Z0-9_]+$/,
  MENTION: /^@[a-zA-Z0-9_]+$/,
  EMOJI: /^(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])$/u
} as const;

// Default validation options
export const DEFAULT_VALIDATION_OPTIONS = {
  strict: false,
  allowEmpty: false,
  trim: true,
  lowercase: false,
  uppercase: false,
  minLength: 0,
  maxLength: Infinity,
  min: -Infinity,
  max: Infinity,
  pattern: null,
  custom: null
} as const;

// Default sanitization options
export const DEFAULT_SANITIZATION_OPTIONS = {
  trim: true,
  lowercase: false,
  uppercase: false,
  removeHTML: true,
  removeScripts: true,
  removeSQL: true,
  removeXSS: true,
  escapeHTML: true,
  escapeSQL: true,
  escapeJS: true,
  maxLength: Infinity,
  custom: null
} as const;

// Create a validation utility instance
export const Validation = {
  validate: validateAndSanitize,
  sanitize: sanitizeInput,
  createValidator,
  createSanitizer,
  combineValidators,
  combineSanitizers,
  patterns: VALIDATION_PATTERNS,
  options: DEFAULT_VALIDATION_OPTIONS,
  sanitizationOptions: DEFAULT_SANITIZATION_OPTIONS
};

// Default export
export default Validation;
