import { BaseDevAgent, DevTaskContext, DevAgentResult } from './base-dev-agent';
import { logger } from '../../utils/logger';
import path from 'path';

export class DocumentationAgent extends BaseDevAgent {
  constructor() {
    super('documentation');
  }

  async executeTask(context: DevTaskContext): Promise<DevAgentResult> {
    logger.info(`DocumentationAgent executing task: ${context.taskId}`);
    
    try {
      await this.updateTaskProgress(context.taskId, 'in_progress');
      
      const result = await this.generateDocumentation(context);
      
      await this.updateTaskProgress(context.taskId, 'completed', {
        filesGenerated: result.files?.length || 0
      });
      
      return result;
    } catch (error) {
      await this.updateTaskProgress(context.taskId, 'failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        taskId: context.taskId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async generateDocumentation(context: DevTaskContext): Promise<DevAgentResult> {
    const files: string[] = [];
    
    // Generate different types of documentation based on task
    if (context.taskId === '1.1') {
      // API Integration Guide
      const apiGuide = await this.generateAPIGuide();
      const filePath = 'docs/onboarding/API_INTEGRATION_GUIDE.md';
      await this.writeGeneratedFile(filePath, apiGuide);
      files.push(filePath);
    }
    
    if (context.taskId === '1.2') {
      // Client Setup Checklist
      const checklist = await this.generateSetupChecklist();
      const filePath = 'docs/onboarding/CLIENT_SETUP_CHECKLIST.md';
      await this.writeGeneratedFile(filePath, checklist);
      files.push(filePath);
    }
    
    if (context.taskId === '1.3') {
      // Multi-tenant Architecture Documentation
      const architectureDoc = await this.generateArchitectureDoc();
      const filePath = 'docs/onboarding/MULTI_TENANT_ARCHITECTURE.md';
      await this.writeGeneratedFile(filePath, architectureDoc);
      files.push(filePath);
    }
    
    if (context.taskId === '1.4') {
      // User Role Permissions Matrix
      const permissionsMatrix = await this.generatePermissionsMatrix();
      const filePath = 'docs/onboarding/USER_ROLE_PERMISSIONS.md';
      await this.writeGeneratedFile(filePath, permissionsMatrix);
      files.push(filePath);
    }

    return {
      success: true,
      taskId: context.taskId,
      files
    };
  }

  private async generateAPIGuide(): Promise<string> {
    const prompt = `Generate a comprehensive API integration guide for agencies using the onekeel_swarm platform. Include:
    - Authentication flow with JWT tokens and API keys
    - REST API endpoints for lead management, campaigns, and agents
    - WebSocket integration for real-time features
    - Rate limiting and usage quotas
    - Code examples in JavaScript/TypeScript
    - Error handling best practices
    - Webhook configuration`;

    const systemPrompt = `You are creating technical documentation for a multi-tenant AI agent platform. Focus on clarity, completeness, and practical examples.`;

    return await this.callOpenRouter(prompt, systemPrompt);
  }

  private async generateSetupChecklist(): Promise<string> {
    const prompt = `Create a detailed client setup checklist for onboarding new clients to the platform. Include:
    - Pre-setup requirements
    - Account creation steps
    - Initial configuration items
    - Agent setup and customization
    - Campaign configuration
    - Integration testing steps
    - Go-live checklist
    - Post-launch monitoring`;

    const systemPrompt = `You are creating an operational checklist for customer success teams. Make it actionable and easy to follow.`;

    return await this.callOpenRouter(prompt, systemPrompt);
  }

  private async generateArchitectureDoc(): Promise<string> {
    const prompt = `Document the multi-tenant architecture for developers. Include:
    - Database schema with tenant isolation
    - API request flow with tenant context
    - Security boundaries and data isolation
    - Caching strategies per tenant
    - Resource allocation and limits
    - Deployment patterns
    - Scaling considerations`;

    const systemPrompt = `You are documenting a technical architecture. Be precise about implementation details and security considerations.`;

    return await this.callOpenRouter(prompt, systemPrompt);
  }

  private async generatePermissionsMatrix(): Promise<string> {
    const prompt = `Create a comprehensive user role permissions matrix. Include:
    - Role definitions (admin, manager, agent, viewer)
    - Resource permissions (CRUD operations)
    - Feature access levels
    - API endpoint permissions
    - Special permissions and overrides
    - Role inheritance rules
    Format as a clear markdown table with examples`;

    const systemPrompt = `You are defining security permissions. Be thorough and consider all edge cases.`;

    return await this.callOpenRouter(prompt, systemPrompt);
  }

  // Override processMessage as it's not used for development agents
  async processMessage(message: string, context: any): Promise<string> {
    return `Documentation agent does not process messages`;
  }

  async makeDecision(context: any): Promise<any> {
    return {
      action: 'generate_documentation',
      reasoning: 'This is a development agent for documentation tasks'
    };
  }
}