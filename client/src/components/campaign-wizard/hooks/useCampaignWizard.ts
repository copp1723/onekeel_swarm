import { useState, useCallback } from 'react';
import type { CampaignData, WizardStep, WizardContext } from '../types';

const EMPTY_DATA: CampaignData = {
  name: '', description: '', goal: '', context: '',
  handoverGoals: '',
  audience: { filters: [], targetCount: 0, datasetId: '',
              contacts: [], headerMapping: {} },
  agentId: '',
  offer: {
    product: '', keyBenefits: [], pricing: '', urgency: '',
    disclaimer: '', cta: { primary: '', secondary: '', link: '' },
  },
  templates: [],
  schedule: {
    totalMessages: 5,
    daysBetweenMessages: 3,
  },
  handoverRules: {
    qualificationScore: 7,
    conversationLength: 10,
    timeThreshold: 300,
    keywordTriggers: [],
    buyingSignals: [],
    escalationPhrases: [],
    goalCompletionRequired: [],
    handoverRecipients: []
  }
};

export function useCampaignWizard(
  onComplete: (data: CampaignData) => void,
): WizardContext {
  const [data, setData] = useState<CampaignData>(EMPTY_DATA);
  const [step, setStep] = useState<WizardStep>('basics');

  const order: WizardStep[] = [
    'basics','audience','agent',
    'offer','templates','schedule','review',
  ];
  const idx = order.indexOf(step);

  const next  = useCallback(() => idx < order.length - 1 && setStep(order[idx+1]), [idx]);
  const prev  = useCallback(() => idx > 0 && setStep(order[idx-1]), [idx]);
  const goto  = useCallback((s: WizardStep) => setStep(s), []);
  const complete = useCallback(() => onComplete(data), [data, onComplete]);

  return { data, setData, step, next, prev, goto, complete };
}