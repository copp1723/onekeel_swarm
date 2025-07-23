import { getCommunicationHub } from '../agents/communication-hub';
import { WebSocketMessageHandler } from '../websocket/message-handler';
import { logger } from '../utils/logger';

export class CommunicationHubService {
  private static instance: CommunicationHubService;
  private initialized = false;

  static getInstance(): CommunicationHubService {
    if (!CommunicationHubService.instance) {
      CommunicationHubService.instance = new CommunicationHubService();
    }
    return CommunicationHubService.instance;
  }

  /**
   * Initialize the communication hub with WebSocket handler
   */
  initialize(wsHandler: WebSocketMessageHandler): void {
    if (this.initialized) {
      logger.warn('Communication hub already initialized');
      return;
    }

    const hub = getCommunicationHub();
    hub.setWebSocketHandler(wsHandler);
    
    this.initialized = true;
    logger.info('Communication hub initialized with WebSocket support');
  }

  /**
   * Get the communication hub instance
   */
  getHub() {
    return getCommunicationHub();
  }

  /**
   * Send a message between agents
   */
  async sendAgentMessage(
    from: string,
    to: string,
    type: 'decision' | 'status' | 'handover' | 'goal_update' | 'coordination',
    payload: any
  ): Promise<void> {
    const hub = getCommunicationHub();
    await hub.sendAgentMessage(from, to, type, payload);
  }

  /**
   * Update goal progress for a lead
   */
  async updateGoalProgress(
    campaignId: string,
    leadId: string,
    goalName: string,
    increment: number = 1
  ): Promise<void> {
    const hub = getCommunicationHub();
    await hub.updateGoalProgress(campaignId, leadId, goalName, increment);
  }

  /**
   * Get goal progress for a lead
   */
  getGoalProgress(campaignId: string, leadId: string) {
    const hub = getCommunicationHub();
    return hub.getGoalProgress(campaignId, leadId);
  }

  /**
   * Request agent handover
   */
  async requestHandover(
    fromAgent: string,
    toAgent: string,
    leadId: string,
    reason: string,
    context: any
  ): Promise<void> {
    await this.sendAgentMessage(fromAgent, toAgent, 'handover', {
      leadId,
      targetAgent: toAgent,
      reason,
      context
    });
  }

  /**
   * Coordinate decision between agents
   */
  async coordinateDecision(
    agentId: string,
    leadId: string,
    decision: any,
    requiresCoordination: boolean = true
  ): Promise<void> {
    await this.sendAgentMessage(agentId, 'hub', 'decision', {
      leadId,
      decision,
      requiresCoordination
    });
  }

  /**
   * Broadcast agent status update
   */
  async broadcastStatus(
    agentId: string,
    leadId: string,
    status: string,
    details: any
  ): Promise<void> {
    await this.sendAgentMessage(agentId, 'hub', 'status', {
      leadId,
      status,
      details
    });
  }
}

export const communicationHubService = CommunicationHubService.getInstance();