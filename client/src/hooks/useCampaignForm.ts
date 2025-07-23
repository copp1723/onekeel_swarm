import { useState, useEffect } from 'react';

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
  variables: string[];
}

interface CampaignTemplate {
  templateId: string;
  delay: number;
  delayUnit: 'minutes' | 'hours' | 'days';
  order: number;
}

interface Schedule {
  id: string;
  name: string;
  type: 'template' | 'fixed' | 'custom';
  config?: any;
}

interface HandoverRecipient {
  name: string;
  email: string;
  role: string;
  priority: 'high' | 'medium' | 'low';
}

interface HandoverCriteria {
  qualificationScore: number;
  conversationLength: number;
  timeThreshold: number;
  keywordTriggers: string[];
  goalCompletionRequired: string[];
  handoverRecipients: HandoverRecipient[];
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  tags?: string[];
}

interface CampaignFormData {
  name: string;
  description: string;
  agentId: string;
  status: string;
  templates: CampaignTemplate[];
  scheduleType: 'template' | 'fixed' | 'custom';
  fixedInterval: { days: number; emails: number };
  conversationMode: 'auto' | 'template' | 'ai';
  selectedLeads: string[];
  handoverCriteria: HandoverCriteria;
  audience: {
    filters: any[];
    targetCount: number;
  };
  settings: {
    sendTimeOptimization: boolean;
    enableAIMode: boolean;
    aiModeThreshold: 'first_reply' | 'buying_signals' | 'manual';
    handoverGoal: string;
    handoverKeywords: string[];
    dailyLimit: number;
    timezone: string;
    templateLibrary: 'custom' | 'welcome' | 'followup' | 'nurture' | 'reengagement';
    handoverFollowUp: {
      enabled: boolean;
      daysAfterHandover: number;
      maxAttempts: number;
      daysBetweenAttempts: number;
    };
  };
}

const getInitialFormData = (): CampaignFormData => ({
  name: '',
  description: '',
  agentId: '',
  status: 'draft',
  templates: [],
  scheduleType: 'template',
  fixedInterval: { days: 3, emails: 5 },
  conversationMode: 'auto',
  selectedLeads: [],
  handoverCriteria: {
    qualificationScore: 7,
    conversationLength: 5,
    timeThreshold: 300,
    keywordTriggers: [],
    goalCompletionRequired: [],
    handoverRecipients: []
  },
  audience: {
    filters: [],
    targetCount: 0
  },
  settings: {
    sendTimeOptimization: true,
    enableAIMode: true,
    aiModeThreshold: 'first_reply',
    handoverGoal: '',
    handoverKeywords: [],
    dailyLimit: 100,
    timezone: 'recipient',
    templateLibrary: 'custom',
    handoverFollowUp: {
      enabled: false,
      daysAfterHandover: 7,
      maxAttempts: 2,
      daysBetweenAttempts: 3
    }
  }
});

export function useCampaignForm(campaign?: any) {
  const [formData, setFormData] = useState<CampaignFormData>(getInitialFormData());
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<Schedule[]>([]);
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [isDragging, setIsDragging] = useState<number | null>(null);

  useEffect(() => {
    loadData();
    if (campaign) {
      // Convert existing campaign data to new format
      const campaignTemplates = campaign.templates?.map((templateId: string, index: number) => ({
        templateId,
        delay: campaign.settings?.followUpSchedule?.daysBetweenEmails || 3,
        delayUnit: 'days' as const,
        order: index
      })) || [];

      setFormData({
        ...campaign,
        templates: campaignTemplates,
        scheduleType: campaign.scheduleType || 'template',
        fixedInterval: campaign.fixedInterval || { days: 3, emails: 5 },
        conversationMode: campaign.conversationMode || 'auto',
        selectedLeads: campaign.selectedLeads || [],
        handoverCriteria: campaign.handoverCriteria || {
          qualificationScore: 7,
          conversationLength: 5,
          timeThreshold: 300,
          keywordTriggers: [],
          goalCompletionRequired: [],
          handoverRecipients: []
        },
        settings: {
          sendTimeOptimization: campaign.settings?.sendTimeOptimization ?? true,
          enableAIMode: campaign.settings?.enableAIMode ?? true,
          aiModeThreshold: campaign.settings?.aiModeThreshold || 'first_reply',
          handoverGoal: campaign.settings?.handoverGoal || '',
          handoverKeywords: campaign.settings?.handoverKeywords || [],
          dailyLimit: campaign.settings?.dailyLimit || 100,
          timezone: campaign.settings?.timezone || 'recipient',
          templateLibrary: campaign.settings?.templateLibrary || 'custom',
          handoverFollowUp: campaign.settings?.handoverFollowUp || {
            enabled: false,
            daysAfterHandover: 7,
            maxAttempts: 2,
            daysBetweenAttempts: 3
          }
        }
      });
    }
  }, [campaign]);

  const loadData = async () => {
    try {
      const [templatesRes, schedulesRes] = await Promise.all([
        fetch('/api/email/templates'),
        fetch('/api/email/schedules')
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data || []);
      }

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setAvailableSchedules(schedulesData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const addTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const newTemplate: CampaignTemplate = {
      templateId,
      delay: formData.templates.length === 0 ? 0 : 1,
      delayUnit: 'days',
      order: formData.templates.length
    };

    setFormData(prev => ({
      ...prev,
      templates: [...prev.templates, newTemplate]
    }));
  };

  const removeTemplate = (index: number) => {
    setFormData(prev => ({
      ...prev,
      templates: prev.templates.filter((_, i) => i !== index)
    }));
  };

  const updateTemplateDelay = (index: number, delay: number, delayUnit: 'minutes' | 'hours' | 'days') => {
    setFormData(prev => ({
      ...prev,
      templates: prev.templates.map((t, i) => 
        i === index ? { ...t, delay, delayUnit } : t
      )
    }));
  };

  const moveTemplate = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= formData.templates.length) return;
    
    const newTemplates = [...formData.templates];
    const [removed] = newTemplates.splice(fromIndex, 1);
    newTemplates.splice(toIndex, 0, removed);
    
    // Update order
    newTemplates.forEach((t, i) => t.order = i);
    
    setFormData(prev => ({ ...prev, templates: newTemplates }));
  };

  const importTemplates = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const text = await file.text();
        try {
          const imported = JSON.parse(text);
          if (imported.templates && Array.isArray(imported.templates)) {
            setFormData(prev => ({ ...prev, templates: imported.templates }));
          }
        } catch (err) {
          console.error('Error importing templates:', err);
        }
      }
    };
    input.click();
  };

  const exportTemplates = () => {
    const data = {
      campaignName: formData.name,
      templates: formData.templates,
      scheduleType: formData.scheduleType,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-templates-${formData.name || 'export'}.json`;
    a.click();
  };

  const prepareFormData = () => {
    return {
      ...formData,
      // Convert templates array back to the format expected by backend if needed
      templates: formData.scheduleType === 'template' 
        ? formData.templates 
        : formData.templates.map(t => t.templateId),
      settings: {
        ...formData.settings,
        // Include schedule info in settings for backward compatibility
        followUpSchedule: formData.scheduleType === 'fixed' ? {
          totalEmails: formData.fixedInterval.emails,
          daysBetweenEmails: formData.fixedInterval.days,
          enabled: true
        } : undefined
      }
    };
  };

  return {
    formData,
    setFormData,
    templates,
    availableSchedules,
    showTemplateLibrary,
    setShowTemplateLibrary,
    isDragging,
    setIsDragging,
    addTemplate,
    removeTemplate,
    updateTemplateDelay,
    moveTemplate,
    importTemplates,
    exportTemplates,
    prepareFormData,
    availableTemplates: templates.filter(t => 
      !formData.templates.some(ct => ct.templateId === t.id)
    )
  };
}