export type WizardStep =
  | 'basics' | 'audience' | 'agent'
  | 'offer'  | 'templates'| 'schedule'
  | 'review';

export interface CampaignData {
  name: string;
  description: string;
  goal: string;
  context: string;
  audience: {
    filters: any[];
    targetCount: number;
    datasetId: string;
    contacts: any[];
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
  templates: any[];
  schedule: {
    startDate: string;
    totalEmails: number;
    daysBetweenEmails: number;
    timezone: string;
    sendTimeOptimization: boolean;
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