import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { WebSocketMessageHandler } from '../websocket/message-handler';

interface AgentCapabilities {
  email: boolean;
  sms: boolean;
  chat: boolean;
}

interface MessageCoordination {
  agentId: string;
  channel: 'email' | 'sms' | 'chat';
  scheduledTime?: Date;
  priority: number;
  messageTemplate?: string;
}

interface ScheduleSyncData {
  campaignId: string;
  agents: string[];
  coordinatedMessages: MessageCoordination[];
  lastSyncTime: Date;
}

// Agent-to-agent message types
interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'decision' | 'status' | 'handover' | 'goal_update' | 'coordination';
  payload: any;
  timestamp: Date;
}

// Goal progress tracking
interface GoalProgress {
  campaignId: string;
  leadId: string;
  goals: {
    [goalName: string]: {
      target: number;
      current: number;
      completed: boolean;
      lastUpdated: Date;
    };
  };
}

export class AgentCommunicationHub extends EventEmitter {
  private activeSyncs: Map<string, ScheduleSyncData> = new Map();
  private agentMessages: Map<string, AgentMessage[]> = new Map();
  private goalProgress: Map<string, GoalProgress> = new Map();
  private wsHandler: WebSocketMessageHandler | null = null;

  constructor() {
    super();
    this.initializeMessageHandlers();
  }

  /**
   * Initialize WebSocket handler for real-time communication
   */
  setWebSocketHandler(wsHandler: WebSocketMessageHandler): void {
    this.wsHandler = wsHandler;
  }

  /**
   * Initialize internal message handlers for agent communication
   */
  private initializeMessageHandlers(): void {
    // Handle decision coordination
    this.on('agent:decision', async (message: AgentMessage) => {
      await this.handleAgentDecision(message);
    });

    // Handle status updates
    this.on('agent:status', async (message: AgentMessage) => {
      await this.handleAgentStatus(message);
    });

    // Handle handover requests
    this.on('agent:handover', async (message: AgentMessage) => {
      await this.handleAgentHandover(message);
    });

    // Handle goal updates
    this.on('agent:goal_update', async (message: AgentMessage) => {
      await this.handleGoalUpdate(message);
    });
  }

  /**
   * Send message between agents
   */
  async sendAgentMessage(from: string, to: string, type: AgentMessage['type'], payload: any): Promise<void> {
    const message: AgentMessage = {
      id: crypto.randomUUID(),
      from,
      to,
      type,
      payload,
      timestamp: new Date()
    };

    // Store message
    const key = `${from}-${to}`;
    if (!this.agentMessages.has(key)) {
      this.agentMessages.set(key, []);
    }
    this.agentMessages.get(key)!.push(message);

    // Emit for processing
    this.emit(`agent:${type}`, message);

    // Send via WebSocket for real-time updates
    if (this.wsHandler) {
      (this.wsHandler as any).broadcastCallback({
        type: 'agent_message',
        data: message
      });
    }

    logger.info('Agent message sent', {
      from,
      to,
      type,
      messageId: message.id
    });
  }

  /**
   * Handle agent decision coordination
   */
  private async handleAgentDecision(message: AgentMessage): Promise<void> {
    const { from, payload } = message;
    const { leadId, decision, requiresCoordination } = payload;

    logger.info('Processing agent decision', { from, leadId, requiresCoordination });

    if (requiresCoordination) {
      // Get all active agents for this lead (simplified for now)
      const activeAgents = ['email', 'sms', 'chat'];
      
      // Notify all agents of decision
      for (const agent of activeAgents) {
        if (agent !== from) {
          await this.sendAgentMessage('hub', agent, 'coordination', {
            leadId,
            decision,
            originalDecision: decision
          });
        }
      }
    }
  }

  /**
   * Handle agent status updates
   */
  private async handleAgentStatus(message: AgentMessage): Promise<void> {
    const { from, payload } = message;
    const { leadId, status, details } = payload;

    logger.info('Processing agent status update', { from, leadId, status });

    // Update WebSocket clients
    if (this.wsHandler) {
      (this.wsHandler as any).broadcastCallback({
        type: 'agent_status_update',
        data: { leadId, agent: from, status, details }
      });
    }
  }

  /**
   * Handle agent handover requests
   */
  private async handleAgentHandover(message: AgentMessage): Promise<void> {
    const { from, payload } = message;
    const { leadId, targetAgent, reason, context } = payload;

    logger.info('Agent handover requested', {
      from,
      to: targetAgent,
      leadId,
      reason
    });

    // Transfer context to target agent
    await this.sendAgentMessage(from, targetAgent, 'handover', {
      leadId,
      context,
      reason,
      previousAgent: from
    });
  }

  /**
   * Handle goal progress updates
   */
  private async handleGoalUpdate(message: AgentMessage): Promise<void> {
    const { payload } = message;
    const { campaignId, leadId, goalName, progress } = payload;

    const key = `${campaignId}-${leadId}`;
    let goalData = this.goalProgress.get(key);
    
    if (!goalData) {
      goalData = {
        campaignId,
        leadId,
        goals: {}
      };
      this.goalProgress.set(key, goalData);
    }

    // Update goal progress
    goalData.goals[goalName] = {
      target: progress.target,
      current: progress.current,
      completed: progress.current >= progress.target,
      lastUpdated: new Date()
    };

    // Check if all goals are completed
    const allGoalsCompleted = Object.values(goalData.goals).every(g => g.completed);
    
    if (allGoalsCompleted) {
      // Trigger campaign completion logic
      await this.handleCampaignCompletion(campaignId, leadId);
    }

    // Broadcast goal update
    if (this.wsHandler) {
      (this.wsHandler as any).broadcastCallback({
        type: 'goal_progress_update',
        data: {
          campaignId,
          leadId,
          goals: goalData.goals
        }
      });
    }
  }

  /**
   * Track goal progress for a lead
   */
  async updateGoalProgress(
    campaignId: string,
    leadId: string,
    goalName: string,
    increment: number = 1
  ): Promise<void> {
    const key = `${campaignId}-${leadId}`;
    let goalData = this.goalProgress.get(key);
    
    if (!goalData) {
      goalData = {
        campaignId,
        leadId,
        goals: {}
      };
      this.goalProgress.set(key, goalData);
    }

    const currentProgress = goalData.goals[goalName]?.current || 0;
    const newProgress = currentProgress + increment;

    await this.sendAgentMessage('hub', 'all', 'goal_update', {
      campaignId,
      leadId,
      goalName,
      progress: {
        target: 100, // Default target
        current: newProgress
      }
    });
  }

  /**
   * Get goal progress for a lead
   */
  getGoalProgress(campaignId: string, leadId: string): GoalProgress | null {
    const key = `${campaignId}-${leadId}`;
    return this.goalProgress.get(key) || null;
  }

  /**
   * Handle campaign completion
   */
  private async handleCampaignCompletion(campaignId: string, leadId: string): Promise<void> {
    logger.info('Campaign goals completed', { campaignId, leadId });
    
    // Notify all agents
    const activeAgents = ['email', 'sms', 'chat'];
    for (const agent of activeAgents) {
      await this.sendAgentMessage('hub', agent, 'coordination', {
        leadId,
        event: 'campaign_completed',
        campaignId
      });
    }
  }

  /**
   * Get message history between agents
   */
  getAgentMessageHistory(from: string, to: string): AgentMessage[] {
    const key = `${from}-${to}`;
    return this.agentMessages.get(key) || [];
  }

  /**
   * Clear message history (for testing)
   */
  clearMessageHistory(): void {
    this.agentMessages.clear();
    this.goalProgress.clear();
  }

  /**
   * Create a multi-channel agent that can communicate across all channels
   */
  async createCommunicationAgent(
    agentId: string,
    capabilities: AgentCapabilities,
    campaignId?: string
  ): Promise<CommunicationAgentInstance> {
    return new CommunicationAgentInstance(
      agentId,
      capabilities,
      this,
      campaignId
    );
  }

  /**
   * Process a message through the appropriate channel
   */
  async processMessage(
    message: string,
    context: any,
    channel: 'email' | 'sms' | 'chat'
  ): Promise<string> {
    // Simple response for now - would integrate with actual agents
    logger.info('Processing message', { channel, message: message.substring(0, 50) });
    return `Processed ${channel} message: ${message}`;
  }
}

/**
 * Individual agent instance that can work across multiple channels
 */
export class CommunicationAgentInstance {
  constructor(
    public id: string,
    public capabilities: AgentCapabilities,
    private hub: AgentCommunicationHub,
    public campaignId?: string
  ) {}

  async sendMessage(
    lead: any,
    message: string,
    channel: 'email' | 'sms' | 'chat',
    context: any
  ): Promise<any> {
    if (!this.capabilities[channel]) {
      throw new Error(`Agent ${this.id} does not have ${channel} capabilities`);
    }

    logger.info(`Agent ${this.id} sent message`, {
      leadId: lead.id,
      channel,
      campaignId: this.campaignId
    });

    // Process through the appropriate channel agent
    const response = await this.hub.processMessage(message, context, channel);

    // Return success response
    return { success: true, channel, response };
  }

  async getAvailableChannels(): Promise<('email' | 'sms' | 'chat')[]> {
    return Object.entries(this.capabilities)
      .filter(([_, enabled]) => enabled)
      .map(([channel, _]) => channel as 'email' | 'sms' | 'chat');
  }

  async isChannelAvailable(channel: 'email' | 'sms' | 'chat'): Promise<boolean> {
    return this.capabilities[channel];
  }
}

// Singleton instance
let communicationHub: AgentCommunicationHub | null = null;

export function getCommunicationHub(): AgentCommunicationHub {
  if (!communicationHub) {
    communicationHub = new AgentCommunicationHub();
  }
  return communicationHub;
}