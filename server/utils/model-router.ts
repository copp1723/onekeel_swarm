import { logger } from './logger';

export interface ModelRequestOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  retries?: number;
}

export interface ModelResponse {
  content: string;
  model: string;
  tokensUsed?: number;
  latency: number;
  success: boolean;
  error?: string;
}

export class ModelRouter {
  private models: string[] = [
    'openai/gpt-4o-mini',
    'openai/gpt-3.5-turbo',
    'anthropic/claude-3-haiku',
    'meta-llama/llama-3.1-8b-instruct'
  ];
  
  private currentModelIndex = 0;
  private modelStats: Map<string, { requests: number; failures: number; avgLatency: number }> = new Map();

  constructor() {
    // Initialize stats for all models
    this.models.forEach(model => {
      this.modelStats.set(model, { requests: 0, failures: 0, avgLatency: 0 });
    });
  }

  async makeRequest(
    prompt: string, 
    systemPrompt?: string, 
    options: ModelRequestOptions = {}
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    const selectedModel = options.model || this.selectBestModel();
    
    logger.info('Making model request', { 
      model: selectedModel, 
      promptLength: prompt.length 
    });

    try {
      // Simulate API call - replace with actual implementation
      const response = await this.callModel(selectedModel, prompt, systemPrompt, options);
      const latency = Date.now() - startTime;

      // Update stats
      this.updateModelStats(selectedModel, true, latency);

      return {
        content: response,
        model: selectedModel,
        latency,
        success: true
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      this.updateModelStats(selectedModel, false, latency);

      logger.error('Model request failed', { 
        model: selectedModel, 
        error: (error as Error).message 
      });

      // Try fallback model if available
      if (!options.model && this.models.length > 1) {
        return this.makeRequestWithFallback(prompt, systemPrompt, options, selectedModel);
      }

      return {
        content: '',
        model: selectedModel,
        latency,
        success: false,
        error: (error as Error).message
      };
    }
  }

  private async makeRequestWithFallback(
    prompt: string,
    systemPrompt?: string,
    options: ModelRequestOptions = {},
    failedModel?: string
  ): Promise<ModelResponse> {
    const availableModels = this.models.filter(m => m !== failedModel);
    
    for (const model of availableModels) {
      try {
        return await this.makeRequest(prompt, systemPrompt, { ...options, model });
      } catch (error) {
        logger.warn('Fallback model also failed', { model, error: (error as Error).message });
        continue;
      }
    }

    return {
      content: 'I apologize, but I am unable to process your request at this time due to technical difficulties.',
      model: 'fallback',
      latency: 0,
      success: false,
      error: 'All models failed'
    };
  }

  private async callModel(
    model: string,
    prompt: string,
    systemPrompt?: string,
    options: ModelRequestOptions = {}
  ): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const requestBody = {
      model: model,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        { role: 'user', content: prompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 500
    };

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://onekeel-swarm.onrender.com',
          'X-Title': 'OneKeel Swarm'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      logger.error('OpenRouter API call failed', { error });
      throw error;
    }
  }

  private generateMockResponse(prompt: string, systemPrompt?: string): string {
    // Simple mock response generation
    if (prompt.toLowerCase().includes('email')) {
      return 'Thank you for your interest. I will get back to you soon with more information.';
    } else if (prompt.toLowerCase().includes('sms')) {
      return 'Thanks for reaching out! We\'ll contact you shortly.';
    } else if (prompt.toLowerCase().includes('chat')) {
      return 'Hello! How can I help you today?';
    } else if (systemPrompt?.toLowerCase().includes('agent')) {
      return 'I am an AI agent ready to assist with your request.';
    } else {
      return 'I understand your request and will provide assistance accordingly.';
    }
  }

  private selectBestModel(): string {
    // Simple round-robin selection with performance weighting
    const availableModels = this.models.filter(model => {
      const stats = this.modelStats.get(model);
      return !stats || (stats.failures / Math.max(stats.requests, 1)) < 0.5; // Less than 50% failure rate
    });

    if (availableModels.length === 0) {
      return this.models[0]; // Fallback to first model
    }

    // Select based on performance
    let bestModel = availableModels[0];
    let bestScore = 0;

    availableModels.forEach(model => {
      const stats = this.modelStats.get(model)!;
      const successRate = stats.requests === 0 ? 1 : 1 - (stats.failures / stats.requests);
      const speedScore = stats.avgLatency === 0 ? 1 : Math.max(0, 1 - (stats.avgLatency / 5000)); // Normalize to 5s max
      const score = (successRate * 0.7) + (speedScore * 0.3);

      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    });

    return bestModel;
  }

  private updateModelStats(model: string, success: boolean, latency: number): void {
    const stats = this.modelStats.get(model) || { requests: 0, failures: 0, avgLatency: 0 };
    
    stats.requests++;
    if (!success) {
      stats.failures++;
    }
    
    // Update average latency
    stats.avgLatency = ((stats.avgLatency * (stats.requests - 1)) + latency) / stats.requests;
    
    this.modelStats.set(model, stats);
  }

  getModelStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    this.modelStats.forEach((modelStats, model) => {
      stats[model] = {
        ...modelStats,
        successRate: modelStats.requests === 0 ? 1 : 1 - (modelStats.failures / modelStats.requests)
      };
    });

    return stats;
  }

  addModel(model: string): void {
    if (!this.models.includes(model)) {
      this.models.push(model);
      this.modelStats.set(model, { requests: 0, failures: 0, avgLatency: 0 });
      logger.info('Model added to router', { model });
    }
  }

  removeModel(model: string): void {
    const index = this.models.indexOf(model);
    if (index > -1) {
      this.models.splice(index, 1);
      this.modelStats.delete(model);
      logger.info('Model removed from router', { model });
    }
  }
}

export const modelRouter = new ModelRouter();