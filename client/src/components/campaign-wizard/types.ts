export type WizardStep =
  | 'basics' | 'audience' | 'agent'
  | 'offer'  | 'templates'| 'schedule'
  | 'review';

export interface Agent {
  id: string;
  name: string;
  role: string;
  type?: string;
  capabilities?: string[];
}

export interface AudienceFilter {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface Contact {
  id?: string;
  email: string;
  name?: string;
  [key: string]: any;
}

export interface EmailTemplate {
  id?: string;
  subject: string;
  body: string;
  order?: number;
  daysSinceStart?: number;
  previewText?: string;
  personalizationTokens?: string[];
}

export interface CampaignData {
  name: string;
  context: string;
  handoverGoals: string;
  audience: {
    filters: AudienceFilter[];
    targetCount: number;
    datasetId: string;
    contacts: Contact[];
    headerMapping: Record<string, string>;
  };
  agentId: string;
  offer: {
    product: string;
    keyBenefits: string[];
    pricing: string;
    urgency: string;
    disclaimer: string;
    cta: { primary: string; secondary: string; link: string };
  };
  templates: EmailTemplate[];
  schedule: {
    totalMessages: number;
    daysBetweenMessages: number;
  };
  handoverRules: {
    qualificationScore: number;
    conversationLength: number;
    timeThreshold: number;
    keywordTriggers: string[];
    buyingSignals: string[];
    escalationPhrases: string[];
    goalCompletionRequired: string[];
    handoverRecipients: Array<{name: string, email: string}>;
  };
}

export interface WizardContext {
  data: CampaignData;
  setData: React.Dispatch<React.SetStateAction<CampaignData>>;
  step: WizardStep;
  next(): void;
  prev(): void;
  goto(s: WizardStep): void;
  complete(): void;
}