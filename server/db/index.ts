// Database client and connection
export { db, closeConnection, type DbTransaction } from './client';

// Schema exports
export * from './schema';

// Mock repository classes for compatibility
export class LeadsRepository {
  static async findById(id: string) { return null; }
  static async create(data: any) { return { id: crypto.randomUUID(), ...data }; }
  static async update(id: string, data: any) { return null; }
  static async delete(id: string) { return false; }
  static async findAll() { return []; }
}

export class ConversationsRepository {
  static async findById(id: string) { return null; }
  static async create(leadId: string, channel: string, agentType: string) { 
    return { id: crypto.randomUUID(), leadId, channel, agentType, messages: [] }; 
  }
  static async findByLeadId(leadId: string) { return []; }
  static async findByLeadIdAndChannel(leadId: string, channel: string) { return null; }
  static async appendMessage(id: string, sender: string, content: string) { return null; }
  static async updateAgentType(id: string, agentType: string) { return null; }
}

export class AgentDecisionsRepository {
  static async create(data: any) { return { id: crypto.randomUUID(), ...data }; }
  static async findByLeadId(leadId: string) { return []; }
}

export class CampaignsRepository {
  static async findById(id: string) { return null; }
  static async updateLeadStatus(campaignId: string, leadId: string, status: string) { return null; }
}

export class CommunicationsRepository {
  static async create(
    leadId: string,
    channel: string,
    direction: string,
    content: string,
    status: string,
    metadata?: any,
    options?: any
  ) { 
    return { id: crypto.randomUUID(), leadId, channel, direction, content, status }; 
  }
}

export class AgentConfigurationsRepository {
  static async findByType(type: string) { return null; }
  static async create(data: any) { return { id: crypto.randomUUID(), ...data }; }
}

export class UsersRepository {
  static async findById(id: string) { return null; }
}

export class AuditLogRepository {
  static async create(data: any) { return { id: crypto.randomUUID(), ...data }; }
}

export class AnalyticsRepository {
  static async create(data: any) { return { id: crypto.randomUUID(), ...data }; }
}

export class ClientsRepository {
  static async findById(id: string) { return null; }
}

export class EmailTemplatesRepository {
  static async findById(id: string) { return null; }
}

export class Lead {
  id: string = '';
  name: string = '';
  email: string = '';
  phone?: string;
  source: string = '';
  status: string = '';
  metadata: any = {};
  createdAt: Date = new Date();
  updatedAt: Date = new Date();
}

// Export singleton instances for compatibility
export const leadsRepository = LeadsRepository;
export const conversationsRepository = ConversationsRepository;
export const agentDecisionsRepository = AgentDecisionsRepository;
export const campaignsRepository = CampaignsRepository;
export const communicationsRepository = CommunicationsRepository;
export const emailTemplatesRepository = EmailTemplatesRepository;
export const agentConfigurationsRepository = AgentConfigurationsRepository;
export const usersRepository = UsersRepository;
export const auditLogRepository = AuditLogRepository;
export const analyticsRepository = AnalyticsRepository;
export const clientsRepository = ClientsRepository;