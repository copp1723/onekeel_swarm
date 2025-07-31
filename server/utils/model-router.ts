import { logger } from './logger';
import { executeWithOpenRouterBreaker } from './circuit-breaker';

export interface ModelRequestOptions {
  prompt: string;
  systemPrompt?: string;
  agentType: string;
  decisionType: string;
  conversationHistory: any[];
  requiresReasoning: boolean;
  businessCritical: boolean;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: any;
  model?: string;
}

export interface ModelResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  executionTime: number;
  complexity: {
    score: number;
    tier: 'basic' | 'standard' | 'advanced' | 'expert';
  }
}

/**
 * ModelRouter handles intelligent routing of model requests based on task complexity and requirements
 */
export class ModelRouter {
  /**
   * Routes a request to the appropriate model based on context and complexity
   */
  static async routeRequest(options: ModelRequestOptions): Promise<ModelResponse> {
    const startTime = Date.now();
    
    // Evaluate task complexity to determine appropriate model tier
    const complexity = this.evaluateComplexity(options);
    
    // If model is explicitly specified, use it
    let modelToUse = options.model;
    
    // Handle OpenRouter auto-select feature
    if (modelToUse === 'openrouter-auto') {
      modelToUse = undefined; // Let OpenRouter choose the best model
    } 
    // If no model specified, select based on complexity
    else if (!modelToUse) {
      modelToUse = this.selectModelForComplexity(complexity.tier);
    }

    try {
      const response = await this.callOpenRouter({
        prompt: options.prompt,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 500,
        model: modelToUse, // This can be undefined, letting OpenRouter choose the best model
        responseFormat: options.responseFormat
      });

      const executionTime = Date.now() - startTime;
      
      logger.info('Model request successful', {
        model: response.model || modelToUse || 'auto-selected',
        executionTime,
        complexity: complexity.tier,
        agentType: options.agentType
      });

      return {
        content: response.content,
        model: response.model || modelToUse || 'auto-selected',
        tokensUsed: response.tokensUsed,
        executionTime,
        complexity
      };
    } catch (error) {
      logger.error('Model request failed', {
        error: error instanceof Error ? error.message : String(error),
        model: modelToUse || 'auto-selected',
        complexity: complexity.tier,
        agentType: options.agentType
      });
      
      throw error;
    }
  }

  /**
   * Evaluates the complexity of a request to determine appropriate model
   */
  private static evaluateComplexity(options: ModelRequestOptions): {
    score: number;
    tier: 'basic' | 'standard' | 'advanced' | 'expert';
  } {
    let score = 0;
    
    // Base score on prompt length
    score += Math.min(30, options.prompt.length / 200);
    
    // Conversation history complexity
    score += Math.min(20, options.conversationHistory.length * 2);
    
    // Critical decision factor
    if (options.businessCritical) score += 15;
    
    // Reasoning requirements
    if (options.requiresReasoning) score += 20;
    
    // Agent type complexity
    if (options.agentType === 'overlord') score += 15;
    else if (options.agentType === 'email') score += 10;
    
    // Decision type complexity
    if (options.decisionType === 'strategic') score += 15;
    
    // Determine tier based on score
    let tier: 'basic' | 'standard' | 'advanced' | 'expert';
    if (score < 30) tier = 'basic';
    else if (score < 50) tier = 'standard';
    else if (score < 70) tier = 'advanced';
    else tier = 'expert';
    
    return { score, tier };
  }

  /**
   * Selects appropriate model based on complexity tier
   */
  private static selectModelForComplexity(tier: 'basic' | 'standard' | 'advanced' | 'expert'): string | undefined {
    switch (tier) {
      case 'basic':
        return 'openai/gpt-3.5-turbo'; // Less complex tasks
      case 'standard':
        return 'openai/gpt-4o-mini'; // Standard complexity
      case 'advanced':
        return 'anthropic/claude-3-sonnet'; // More complex reasoning
      case 'expert':
        return 'openai/gpt-4o'; // Most complex tasks
      default:
        return undefined; // Let OpenRouter decide
    }
  }

  /**
   * Makes the actual call to OpenRouter API
   */
  private static async callOpenRouter(options: {
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    model?: string;
    responseFormat?: any;
  }): Promise<{
    content: string;
    model?: string;
    tokensUsed?: number;
  }> {
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Prepare messages array
    const messages = [];
    
    // Add system message if provided
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    // Add user message
    messages.push({
      role: 'user',
      content: options.prompt
    });

    // Prepare request body
    const requestBody: any = {
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 500,
      route: 'fallback' // This ensures the request will try multiple providers if needed
    };
    
    // Add model if specified
    if (options.model) {
      requestBody.model = options.model;
    }
    
    // Add response format if specified
    if (options.responseFormat) {
      requestBody.response_format = options.responseFormat;
    }

    // Use circuit breaker to make the request
    try {
      const response = await executeWithOpenRouterBreaker(async () => {
        const result = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.SERVICE_URL || 'http://localhost:3000',
            'X-Title': 'OneKeel Swarm'
          },
          body: JSON.stringify(requestBody)
        });

        if (!result.ok) {
          const errorData = await result.json().catch(() => ({}));
          throw new Error(`OpenRouter API error: ${result.status} ${result.statusText} - ${JSON.stringify(errorData)}`);
        }

        return await result.json();
      });

      // Extract content from response
      return {
        content: response.choices[0]?.message?.content || '',
        model: response.model,
        tokensUsed: response.usage?.total_tokens
      };
    } catch (error) {
      logger.error('OpenRouter API call failed', { error });
      throw error;
    }
  }
}
