export { BaseAgent } from './base-agent';
export { OverlordAgent } from './overlord-agent';
export { EmailAgent } from './email-agent';
export { SMSAgent } from './sms-agent';
export { ChatAgent } from './chat-agent';

import { OverlordAgent } from './overlord-agent';
import { EmailAgent } from './email-agent';
import { SMSAgent } from './sms-agent';
import { ChatAgent } from './chat-agent';

// Singleton instances
let overlordAgent: OverlordAgent;
let emailAgent: EmailAgent;
let smsAgent: SMSAgent;
let chatAgent: ChatAgent;

export function getOverlordAgent(): OverlordAgent {
  if (!overlordAgent) {
    overlordAgent = new OverlordAgent();
  }
  return overlordAgent;
}

export function getEmailAgent(): EmailAgent {
  if (!emailAgent) {
    emailAgent = new EmailAgent();
  }
  return emailAgent;
}

export function getSMSAgent(): SMSAgent {
  if (!smsAgent) {
    smsAgent = new SMSAgent();
  }
  return smsAgent;
}

export function getChatAgent(): ChatAgent {
  if (!chatAgent) {
    chatAgent = new ChatAgent();
  }
  return chatAgent;
}

export function getAgentByType(type: string) {
  switch (type) {
    case 'overlord':
      return getOverlordAgent();
    case 'email':
      return getEmailAgent();
    case 'sms':
      return getSMSAgent();
    case 'chat':
      return getChatAgent();
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}