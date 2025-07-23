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
    subject: 'Welcome to {{companyName}}, {{firstName}}!',
    content: `Hi {{firstName}},

Welcome to {{companyName}}! We're excited to have you on board.

Here's what you can expect:
- Personalized service from our team
- Regular updates on your {{vehicleInterest}} search
- Exclusive deals and financing options

If you have any questions, feel free to reach out to us at any time.

Best regards,
The {{companyName}} Team`,
    category: 'welcome',
    variables: ['firstName', 'companyName', 'vehicleInterest'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'followup-001',
    name: 'Follow-up Email',
    subject: 'Still looking for your {{vehicleInterest}}, {{firstName}}?',
    content: `Hi {{firstName}},

I wanted to follow up on your interest in {{vehicleInterest}}.

We have some great new options that might be perfect for you:
- Competitive financing rates starting at {{interestRate}}%
- Extended warranty options
- Trade-in evaluations

Would you like to schedule a quick call to discuss your options?

Best regards,
{{agentName}}
{{companyName}}`,
    category: 'followup',
    variables: ['firstName', 'vehicleInterest', 'interestRate', 'agentName', 'companyName'],
    isActive: true,
    createdAt: '2024-01-05T00:00:00.000Z'
  },
  {
    id: 'promotion-001',
    name: 'Special Offer',
    subject: 'Exclusive offer for {{firstName}} - Limited time!',
    content: `Hi {{firstName}},

We have an exclusive offer just for you on {{vehicleInterest}}:

🎉 Special Financing: {{specialRate}}% APR
🎉 No payments for 90 days
🎉 Extended warranty included

This offer expires on {{expirationDate}}, so don't wait!

Click here to claim your offer: {{offerLink}}

Best regards,
{{agentName}}
{{companyName}}`,
    category: 'promotion',
    variables: ['firstName', 'vehicleInterest', 'specialRate', 'expirationDate', 'offerLink', 'agentName', 'companyName'],
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