import { BaseAgent, AgentContext, AgentDecision } from './base-agent';
import { AgentConfigurationsRepository } from '../db';

export class ChatAgent extends BaseAgent {
  constructor() {
    super('chat');
  }

  // Override getMockResponse for chat-specific mock behavior
  protected getMockResponse(prompt: string): string {
    if (prompt.includes('website visitor') || prompt.includes('chat conversation')) {
      // Parse out visitor name if available
      const nameMatch = prompt.match(/Visitor Name: (.+)/);
      const visitorName = nameMatch ? nameMatch[1] : 'there';
      
      if (prompt.includes('initial greeting')) {
        return `Hello ${visitorName}! Welcome to CCL-3. I'm here to help you find the perfect solution. What brings you here today?`;
      }
      
      return `I understand your interest! Let me help you with that. Could you tell me a bit more about your specific needs so I can provide the best information?`;
    }
    
    return super.getMockResponse(prompt);
  }

  async processMessage(message: string, context: AgentContext): Promise<string> {
    const { lead, campaign } = context;
    
    // Store incoming chat message in supermemory
    await this.storeMemory(`Chat from ${lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'Visitor'}: ${message}`, {
      leadId: lead.id,
      type: 'chat_received',
      source: lead.source
    });

    // Search for previous chat interactions and patterns
    const memories = await this.searchMemory(`chat ${lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'visitor'} ${message.substring(0, 20)}`);
    const chatHistory = memories.filter(m => m.metadata?.type?.includes('chat')).slice(0, 3);
    
    // Get active chat agent configuration
    const agentConfig = await AgentConfigurationsRepository.getActiveByType('chat');
    
    let systemPrompt: string;
    let prompt: string;
    
    if (agentConfig) {
      // Use configured agent
      systemPrompt = AgentConfigurationsRepository.generatePromptFromConfig(agentConfig, {
        leadInfo: lead,
        conversationHistory: context.conversationHistory || '',
        chatMemories: chatHistory.map(h => h.content).join('\n')
      });
      
      prompt = `Generate a chat response:
Visitor Name: ${lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'Visitor'}
Their Message: "${message}"

Context:
- Source: ${lead.source}
- Campaign: ${lead.campaign || 'General'}
- Time on site: Active chat session

Respond according to your configuration.`;
      
      // Track performance
      await AgentConfigurationsRepository.updatePerformance(agentConfig.id, 'conversations');
    } else {
      // Fallback to default behavior
      systemPrompt = `You are a Chat Agent providing real-time support on a website.
Be responsive, helpful, and guide visitors towards the campaign goals.
Campaign Goals: ${campaign?.goals?.join(', ') || 'General assistance'}
Respond quickly with clear, conversational messages.

Previous chat context: ${chatHistory.map(h => h.content).join('\n')}`;

      prompt = `Generate a chat response:
Visitor Name: ${lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'Visitor'}
Their Message: "${message}"

Context:
- Source: ${lead.source}
- Campaign: ${lead.campaign || 'General'}
- Time on site: Active chat session

Create a helpful chat response that:
1. Addresses their question immediately
2. Offers specific assistance
3. Guides towards campaign goals
4. Maintains conversational tone
5. Keeps it concise (2-3 sentences max)`;
    }

    const response = await this.generateResponse(
      prompt,
      systemPrompt,
      {
        leadId: lead.id,
        leadName: lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'Visitor',
        type: 'chat_sent',
        metadata: { campaign: campaign?.name }
      },
      {
        temperature: agentConfig?.temperature ? agentConfig.temperature / 100 : 0.7,
        maxTokens: agentConfig?.maxTokens || 300
      }
    );

    return response;
  }

  async makeDecision(_context: AgentContext): Promise<AgentDecision> {
    return {
      action: 'send_chat_message',
      reasoning: 'Chat agent executing real-time communication',
      data: {}
    };
  }

  async generateInitialMessage(context: AgentContext, focus: string): Promise<string> {
    const { lead } = context;
    
    // Search for successful initial chat patterns
    const memories = await this.searchMemory(`initial chat greeting ${focus}`);
    const successfulGreetings = memories.slice(0, 2).map(m => m.content).join('\n');
    
    const systemPrompt = `You are starting a website chat conversation.
Be welcoming and immediately helpful.

Successful greeting patterns: ${successfulGreetings}`;

    const prompt = `Create an initial chat greeting for:
Visitor Name: ${lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'Visitor'}
Focus: ${focus}

The message should:
1. Welcome them warmly
2. Mention you're here to help
3. Reference the focus area
4. Ask how you can assist
5. Be brief and friendly (2-3 sentences)`;

    const greeting = await this.generateResponse(
      prompt,
      systemPrompt,
      {
        leadId: lead.id,
        leadName: lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'Visitor',
        type: 'initial_chat',
        metadata: { focus }
      }
    );

    return greeting;
  }

  // Chat-specific method for quick responses
  async generateQuickReply(context: AgentContext): Promise<string[]> {
    const systemPrompt = `Generate 3 quick reply options for a chat conversation.
These should be common questions or actions the visitor might want.`;

    const prompt = `Based on the context:
Campaign: ${context.campaign?.name || 'General'}
Goals: ${context.campaign?.goals?.join(', ') || 'Assistance'}

Generate 3 quick reply button options (max 25 characters each):`;

    const response = await this.callOpenRouter(prompt, systemPrompt);
    
    // Parse response and return array of quick replies
    return response.split('\n')
      .filter(line => line.trim())
      .slice(0, 3)
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
  }
}