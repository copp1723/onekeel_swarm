// Unified email template system
export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: 'welcome' | 'followup' | 'promotion' | 'nurture' | 'custom';
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export const defaultEmailTemplates: EmailTemplate[] = [
  {
    id: 'welcome-001',
    name: 'Welcome Email',
    subject: 'Quick question about your car search',
    content: `Hey {{firstName}},

Saw you're looking at vehicles. What's driving the search? New job, family changes, or just ready for something different?

I can help you figure out what makes sense for your situation.

{{agentName}}`,
    category: 'welcome',
    variables: ['firstName', 'agentName'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'followup-001',
    name: 'Follow-up Email',
    subject: 'Found a few options for you',
    content: `{{firstName}},

Based on what you're looking for, I've got some vehicles that might work.

The financing is solid right now. Want to take a look?

{{agentName}}`,
    category: 'followup',
    variables: ['firstName', 'agentName'],
    isActive: true,
    createdAt: '2024-01-05T00:00:00.000Z'
  },
  {
    id: 'promotion-001',
    name: 'Special Offer',
    subject: 'This might interest you',
    content: `{{firstName}},

Got something that might work for you. {{specialRate}}% financing and no payments for 90 days.

Worth a conversation? {{offerLink}}

{{agentName}}`,
    category: 'promotion',
    variables: ['firstName', 'specialRate', 'offerLink', 'agentName'],
    isActive: true,
    createdAt: '2024-01-10T00:00:00.000Z'
  }
];

// Template variable replacement utility
export const replaceTemplateVariables = (template: string, variables: Record<string, string>): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
};

// Extract variables from template content
export const extractTemplateVariables = (content: string): string[] => {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  
  return [...new Set(matches.map(match => match.replace(/[{}]/g, '')))];
};

// Validate template
export const validateTemplate = (template: Partial<EmailTemplate>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!template.name?.trim()) errors.push('Template name is required');
  if (!template.subject?.trim()) errors.push('Template subject is required');
  if (!template.content?.trim()) errors.push('Template content is required');
  
  // Check for consistent variables
  if (template.subject && template.content) {
    const subjectVars = extractTemplateVariables(template.subject);
    const contentVars = extractTemplateVariables(template.content);
    const allVars = [...new Set([...subjectVars, ...contentVars])];
    
    if (template.variables && template.variables.length > 0) {
      const missingVars = allVars.filter(v => !template.variables!.includes(v));
      if (missingVars.length > 0) {
        errors.push(`Missing variables in template definition: ${missingVars.join(', ')}`);
      }
    }
  }
  
  return { valid: errors.length === 0, errors };
};

export default {
  defaultEmailTemplates,
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplate
};