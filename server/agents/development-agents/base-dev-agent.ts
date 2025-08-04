import { BaseAgent } from '../base-agent';
import { logger } from '../../utils/logger';
import fs from 'fs/promises';
import path from 'path';

export interface DevTaskContext {
  taskId: string;
  taskDescription: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
  outputPath?: string;
}

export interface DevAgentResult {
  success: boolean;
  taskId: string;
  output?: any;
  files?: string[];
  error?: string;
}

export abstract class BaseDevAgent extends BaseAgent {
  protected devMode: boolean = true;
  
  constructor(agentType: string) {
    super(`dev-${agentType}`);
  }

  // Override to prevent production API usage
  protected async callOpenRouter(
    prompt: string,
    systemPrompt: string,
    options: any = {}
  ): Promise<string> {
    // Use development API key if available
    const devApiKey = process.env.DEV_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;
    
    if (!devApiKey) {
      logger.warn(`No API key for development agent ${this.agentType}`);
      return this.getMockResponse(prompt);
    }

    // Add development context to system prompt
    const devSystemPrompt = `${systemPrompt}\n\nNOTE: This is a development agent working on internal tasks. Focus on code generation, documentation, and system design.`;
    
    return super.callOpenRouter(prompt, devSystemPrompt, {
      ...options,
      temperature: options.temperature || 0.3, // Lower temperature for consistent code
      maxTokens: options.maxTokens || 2000, // Higher token limit for code generation
    });
  }

  // Helper method to write generated files
  protected async writeGeneratedFile(
    filePath: string,
    content: string,
    backup: boolean = true
  ): Promise<void> {
    const fullPath = path.resolve(filePath);
    
    // Create backup if file exists
    if (backup) {
      try {
        const exists = await fs.access(fullPath).then(() => true).catch(() => false);
        if (exists) {
          const backupPath = `${fullPath}.backup-${Date.now()}`;
          await fs.copyFile(fullPath, backupPath);
          logger.info(`Created backup: ${backupPath}`);
        }
      } catch (error) {
        logger.warn(`Could not create backup for ${fullPath}`, error);
      }
    }

    // Ensure directory exists
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
    logger.info(`Generated file: ${fullPath}`);
  }

  // Abstract method for task execution
  abstract executeTask(context: DevTaskContext): Promise<DevAgentResult>;
  
  // Store task progress
  protected async updateTaskProgress(
    taskId: string,
    status: 'in_progress' | 'completed' | 'failed',
    details?: any
  ): Promise<void> {
    await this.storeMemory(
      `Task ${taskId} status: ${status}`,
      {
        taskId,
        status,
        agentType: this.agentType,
        timestamp: new Date().toISOString(),
        ...details
      }
    );
  }
}