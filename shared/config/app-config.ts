import os from 'os';

// Environment configuration
export interface AppConfig {
  server: {
    port: number;
    nodeEnv: string;
    memoryLimit: number;
  };
  features: {
    enableAgents: boolean;
    enableWebSocket: boolean;
    enableRedis: boolean;
    enableMonitoring: boolean;
    enableEmailTemplates: boolean;
  };
  database: {
    url?: string;
    maxConnections: number;
  };
  external: {
    mailgun: {
      apiKey?: string;
      domain?: string;
      fromEmail?: string;
    };
    twilio: {
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
    };
    openai: {
      apiKey?: string;
      model: string;
    };
  };
  security: {
    sessionSecret: string;
    jwtSecret?: string;
    rateLimitWindow: number;
    rateLimitMax: number;
  };
}

// Default configuration
const defaultConfig: AppConfig = {
  server: {
    port: parseInt(process.env.PORT || '5000'),
    nodeEnv: process.env.NODE_ENV || 'development',
    memoryLimit: parseInt(process.env.MEMORY_LIMIT || String(Math.min(1638, Math.floor(os.totalmem() / 1024 / 1024 * 0.25))))
  },
  features: {
    enableAgents: process.env.ENABLE_AGENTS !== 'false',
    enableWebSocket: process.env.ENABLE_WEBSOCKET !== 'false',
    enableRedis: process.env.ENABLE_REDIS === 'true',
    enableMonitoring: process.env.ENABLE_MONITORING === 'true',
    enableEmailTemplates: process.env.EMAIL_TEMPLATES_ENABLED === 'true'
  },
  database: {
    url: process.env.DATABASE_URL,
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10')
  },
  external: {
    mailgun: {
      apiKey: process.env.MAILGUN_API_KEY,
      domain: process.env.MAILGUN_DOMAIN,
      fromEmail: process.env.MAILGUN_FROM_EMAIL
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
    }
  },
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'ccl3-swarm-secret-key',
    jwtSecret: process.env.JWT_SECRET,
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100')
  }
};

// Configuration validation
export const validateConfig = (config: AppConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    errors.push('Invalid server port');
  }
  
  if (config.server.memoryLimit < 128) {
    errors.push('Memory limit too low (minimum 128MB)');
  }
  
  if (config.features.enableEmailTemplates && !config.external.mailgun.apiKey) {
    errors.push('Mailgun API key required when email templates are enabled');
  }
  
  if (!config.security.sessionSecret || config.security.sessionSecret.length < 16) {
    errors.push('Session secret must be at least 16 characters');
  }
  
  return { valid: errors.length === 0, errors };
};

// Get configuration with validation
export const getConfig = (): AppConfig => {
  const config = { ...defaultConfig };
  const validation = validateConfig(config);
  
  if (!validation.valid) {
    console.warn('Configuration validation warnings:', validation.errors);
  }
  
  return config;
};

// Export singleton instance
export const appConfig = getConfig();

export default appConfig;