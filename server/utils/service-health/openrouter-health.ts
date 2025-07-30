import { logger } from '../logger';
import { openrouterCircuitBreaker } from '../circuit-breaker';

export interface OpenRouterHealthStatus {
  configured: boolean;
  connected: boolean;
  lastChecked: string;
  responseTime?: number;
  error?: string;
  details?: {
    apiKeyPresent: boolean;
    modelsAvailable?: string[];
    accountInfo?: any;
    rateLimits?: any;
  };
}

export class OpenRouterHealthChecker {
  private apiKey: string;
  private isConfigured: boolean;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor() {
    // Check both OPENROUTER_API_KEY and OPENAI_API_KEY for compatibility
    this.apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || "";
    this.isConfigured = !!this.apiKey;
  }

  async checkHealth(): Promise<OpenRouterHealthStatus> {
    const startTime = Date.now();
    const status: OpenRouterHealthStatus = {
      configured: this.isConfigured,
      connected: false,
      lastChecked: new Date().toISOString(),
      details: {
        apiKeyPresent: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
      }
    };

    if (!this.isConfigured) {
      status.error = "OpenRouter not configured - missing API key";
      return status;
    }

    try {
      // Test connection by fetching available models with circuit breaker protection
      const modelsResponse = await openrouterCircuitBreaker.execute(async () => {
        return await fetch(`${this.baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });
      });

      if (!modelsResponse.ok) {
        throw new Error(`HTTP ${modelsResponse.status}: ${modelsResponse.statusText}`);
      }

      const modelsData = await modelsResponse.json();
      
      status.connected = true;
      status.responseTime = Date.now() - startTime;
      status.details!.modelsAvailable = modelsData.data?.slice(0, 5).map((model: any) => model.id) || [];

      // Try to get account/usage info if available
      try {
        const accountResponse = await fetch(`${this.baseUrl}/auth/key`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        });

        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          status.details!.accountInfo = {
            label: accountData.data?.label,
            usage: accountData.data?.usage,
            limit: accountData.data?.limit,
            is_free_tier: accountData.data?.is_free_tier
          };
        }
      } catch (accountError) {
        // Account info is optional, don't fail the health check
        logger.debug('Could not fetch OpenRouter account info', { error: accountError });
      }

      logger.info('OpenRouter health check passed', {
        responseTime: status.responseTime,
        modelsCount: status.details!.modelsAvailable?.length
      });

    } catch (error) {
      status.connected = false;
      status.responseTime = Date.now() - startTime;
      status.error = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('OpenRouter health check failed', {
        error: status.error,
        responseTime: status.responseTime
      });
    }

    return status;
  }

  async testGenerationCapability(): Promise<{
    canGenerate: boolean;
    error?: string;
    testResponse?: string;
    model?: string;
  }> {
    if (!this.isConfigured) {
      return {
        canGenerate: false,
        error: "OpenRouter not configured"
      };
    }

    try {
      // Test with a simple completion request
      const testRequest = {
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: "Respond with exactly: 'Health check successful'"
          }
        ],
        max_tokens: 10,
        temperature: 0
      };

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testRequest)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const testResponse = data.choices?.[0]?.message?.content || '';

      return {
        canGenerate: true,
        testResponse,
        model: data.model
      };

    } catch (error) {
      return {
        canGenerate: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async validateConfiguration(): Promise<{
    valid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (!process.env.OPENROUTER_API_KEY) {
      issues.push("OPENROUTER_API_KEY environment variable not set");
    } else if (process.env.OPENROUTER_API_KEY.length < 20) {
      issues.push("OPENROUTER_API_KEY appears to be too short");
    }

    // Check if we have fallback configurations
    if (!process.env.OPENAI_API_KEY) {
      recommendations.push("Consider setting OPENAI_API_KEY as a fallback for AI operations");
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations
    };
  }

  async getAvailableModels(): Promise<{
    success: boolean;
    models?: Array<{
      id: string;
      name: string;
      description?: string;
      pricing?: any;
    }>;
    error?: string;
  }> {
    if (!this.isConfigured) {
      return {
        success: false,
        error: "OpenRouter not configured"
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        models: data.data?.map((model: any) => ({
          id: model.id,
          name: model.name || model.id,
          description: model.description,
          pricing: model.pricing
        })) || []
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getConfigurationSummary(): {
    service: string;
    configured: boolean;
    hasApiKey: boolean;
    baseUrl: string;
  } {
    return {
      service: 'OpenRouter',
      configured: this.isConfigured,
      hasApiKey: !!process.env.OPENROUTER_API_KEY,
      baseUrl: this.baseUrl
    };
  }
}

// Export singleton instance
export const openRouterHealthChecker = new OpenRouterHealthChecker();
