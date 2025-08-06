import { useState, useCallback } from 'react';
import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import type { CampaignData, WizardStep, EmailTemplate, Contact } from './types';
// Use type-only import for Agent to avoid ESM "does not provide an export" at runtime
type Agent = import('./types').Agent;
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  ChevronDown,
  ChevronUp,
  Target,
  Users,
  Mail,
  Brain,
  Sparkles,
  Check,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Clock,
  Zap,
  Plus,
  FileText,
  Upload,
  Save,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Loader2,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface CampaignWizardProps {
  isOpen: boolean;
  onClose(): void;
  onComplete(data: CampaignData): void;
  agents?: Agent[];
}

interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  id: string;
}


export function CampaignWizard({ isOpen, onClose, onComplete, agents = [] }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [csvError, setCsvError] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());

  // New state for loading and notifications
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingTemplates, setIsGeneratingTemplates] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    context: '',
    handoverGoals: '',
    audience: {
      filters: [],
      targetCount: 0,
      datasetId: '',
      contacts: [] as Contact[],
      headerMapping: {} as Record<string,string>
    },
    agentId: '',
    offer: {
      product: '',
      keyBenefits: [],
      pricing: '',
      urgency: '',
      disclaimer: '',
      cta: {
        primary: '',
        secondary: '',
        link: ''
      }
    },
    templates: [] as EmailTemplate[],
    schedule: {
      totalMessages: 5,
      daysBetweenMessages: 3
    },
    handoverRules: {
      qualificationScore: 80,
      conversationLength: 10,
      timeThreshold: 30,
      keywordTriggers: [],
      buyingSignals: ['interested', 'ready to buy', 'pricing', 'how much', 'cost', 'purchase'],
      escalationPhrases: ['speak to human', 'agent', 'representative', 'help', 'manager'],
      goalCompletionRequired: ['qualified'],
      handoverRecipients: [] as Array<{name: string, email: string}>
    }
  });

  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'basics', label: 'Campaign Basics', icon: <Target className="h-4 w-4" /> },
    { id: 'audience', label: 'Target Audience', icon: <Users className="h-4 w-4" /> },
    { id: 'agent', label: 'Select Agent', icon: <Brain className="h-4 w-4" /> },
    { id: 'offer', label: 'Offer Details', icon: <Sparkles className="h-4 w-4" /> },
    { id: 'templates', label: 'Email Templates', icon: <Mail className="h-4 w-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock className="h-4 w-4" /> },
    { id: 'review', label: 'Review & Launch', icon: <Check className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  // Helper functions for notifications and validation
  const addNotification = (type: Notification['type'], title: string, message: string) => {
    const id = Date.now().toString();
    const notification: Notification = { type, title, message, id };
    setNotifications(prev => [...prev, notification]);

    // Auto-remove success notifications after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  // Authentication check
  const checkAuthentication = (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) {
      addNotification('error', 'Authentication Required', 'Please log in to continue.');
      return false;
    }
    return true;
  };

  // Data validation
  const validateCampaignData = (): boolean => {
    if (!campaignData.name.trim()) {
      addNotification('error', 'Validation Error', 'Campaign name is required.');
      return false;
    }

    if (!campaignData.context.trim()) {
      addNotification('error', 'Validation Error', 'Campaign context is required.');
      return false;
    }

    if (!campaignData.agentId) {
      addNotification('error', 'Validation Error', 'Please select an AI agent.');
      return false;
    }

    if (!campaignData.audience.contacts || campaignData.audience.contacts.length === 0) {
      addNotification('error', 'Validation Error', 'Please add at least one contact to your campaign.');
      return false;
    }

    return true;
  };

  // Parse API error response
  const parseApiError = async (response: Response): Promise<string> => {
    try {
      const text = await response.text();
      if (!text) return `HTTP ${response.status}: ${response.statusText}`;

      try {
        const errorData = JSON.parse(text);
        return errorData.error || errorData.message || errorData.details || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        return text.length > 200 ? `${text.substring(0, 200)}...` : text;
      }
    } catch {
      return `HTTP ${response.status}: ${response.statusText}`;
    }
  };

  // Retry helper for API calls
  const retryApiCall = async (
    apiCall: () => Promise<any>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<any> => {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt === maxRetries) {
          throw lastError;
        }

        // Only retry on network errors or 5xx server errors
        if (error instanceof TypeError || (error as any)?.status >= 500) {
          addNotification('warning', 'Retrying...', `Attempt ${attempt} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        } else {
          throw lastError;
        }
      }
    }

    throw lastError!;
  };

  // Toggle template expansion
  const toggleTemplateExpansion = (index: number) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedTemplates(newExpanded);
  };

  // Define onDrop callback for file upload - must be defined at top level for hooks
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setCsvError('');
    
    if (acceptedFiles.length === 0) {
      return;
    }
    
    const file = acceptedFiles[0];
    
    // Validate file size (10MB limit)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      setCsvError('File size exceeds 10MB limit');
      return;
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setCsvError('Only CSV files are allowed');
      return;
    }
    
    setUploadedFileName(file.name);
    
    Papa.parse(file, {
      header: true,
      complete: (results: Papa.ParseResult<any>) => {
        if (results.errors.length > 0) {
          setCsvError(`CSV parsing error: ${results.errors[0].message}`);
          return;
        }
        
        if (!results.data || results.data.length === 0) {
          setCsvError('CSV file is empty');
          return;
        }
        
        // Get headers
        const headers = results.meta.fields || [];
        if (headers.length === 0) {
          setCsvError('No headers found in CSV file');
          return;
        }
        
        // Limit to first 10 columns
        const limitedHeaders = headers.slice(0, 10);
        
        // Auto-map headers for First Name and Email
        const headerMapping: Record<string, string> = {};
        let foundEmail = false;
        let foundFirstName = false;
        
        limitedHeaders.forEach((header: string) => {
          const headerLower = header.toLowerCase().trim();
          
          // Check for email variations
          if (!foundEmail && (
            headerLower === 'email' ||
            headerLower === 'email address' ||
            headerLower === 'emailaddress' ||
            headerLower === 'e-mail' ||
            headerLower === 'mail'
          )) {
            headerMapping['email'] = header;
            foundEmail = true;
          }
          
          // Check for first name variations
          if (!foundFirstName && (
            headerLower === 'first name' ||
            headerLower === 'firstname' ||
            headerLower === 'first_name' ||
            headerLower === 'fname' ||
            headerLower === 'given name' ||
            headerLower === 'givenname'
          )) {
            headerMapping['firstName'] = header;
            foundFirstName = true;
          }
        });
        
        // Validation
        if (!foundEmail) {
          setCsvError('Required column "Email" not found. Please ensure your CSV has a column with email addresses.');
          return;
        }
        
        if (!foundFirstName) {
          setCsvError('Required column "First Name" not found. Please ensure your CSV has a column with first names.');
          return;
        }
        
        // Process contacts with limited columns and sanitization
        const contacts: Contact[] = results.data.map((row: Record<string, any>) => {
          const mapped: any = {};
          limitedHeaders.forEach((header: string) => {
            let value = row[header];

            if (typeof value === 'string') {
              value = value.trim();
              if (/^[=+\-@]/.test(value)) {
                value = "'" + value;
              }
              value = value.substring(0, 255);
            }

            mapped[header] = value;
          });

          const emailVal = mapped[headerMapping['email']];
          const firstNameVal = mapped[headerMapping['firstName']];

          const contact: Contact = {
            email: emailVal,
            name: firstNameVal,
            ...mapped
          };
          return contact;
        }).slice(0, 10000)
        .filter((contact: Contact) => {
          return Boolean(contact.email) && Boolean(contact.name);
        });

        setCampaignData((prev: CampaignData): CampaignData => ({
          ...prev,
          audience: {
            ...prev.audience,
            contacts,
            headerMapping: headerMapping,
            targetCount: contacts.length
          }
        }));
      },
      error: (error: Error) => {
        setCsvError(`Error reading file: ${error.message}`);
      }
    });
  }, [setCampaignData, setCsvError, setUploadedFileName]);

  // useDropzone hook must be called at top level
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  const enhanceWithAI = (field: string) => {
    // Generate contextual AI enhancements based on campaign data
    if (field === 'handoverGoals') {
      setCampaignData(prev => ({
        ...prev,
        handoverGoals: `Qualify the lead's budget and timeline, confirm decision-making authority, and schedule a demo or consultation call when they express strong interest or ask specific pricing questions.`
      }));
    } else if (field === 'context') {
      const campaignName = campaignData.name || 'This campaign';
      const product = campaignData.offer?.product || 'our solution';
      const benefits = campaignData.offer?.keyBenefits?.length > 0 
        ? campaignData.offer.keyBenefits.join(', ') 
        : 'competitive advantages and exclusive benefits';
      
      setCampaignData(prev => ({
        ...prev,
        context: `Business Context: ${campaignName} focuses on converting prospects interested in ${product}. 

Key objectives:
- Highlight ${benefits}
- Address concerns about pricing, timing, or commitment
- Build trust through social proof and testimonials
- Create urgency without being pushy
- Personalize messaging based on lead's interaction history

The AI should maintain a warm, consultative tone - like a knowledgeable friend helping them make the best decision. Each email should feel like a natural progression in the conversation, not a scripted sales pitch.`
      }));
    }
  };

  const generateEmailTemplates = async () => {
    if (!checkAuthentication()) return;

    setIsGeneratingTemplates(true);
    clearNotifications();

    try {
      console.log('Generating AI email templates with data:', {
        name: campaignData.name,
        product: campaignData.offer?.product,
        keyBenefits: campaignData.offer?.keyBenefits
      });

      // Ensure we have benefits array (using keyBenefits from the state)
      const benefits = campaignData.offer?.keyBenefits && Array.isArray(campaignData.offer.keyBenefits)
        ? campaignData.offer.keyBenefits
        : ['Save time and money', 'Expert support', 'Flexible options'];

      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Generate sophisticated AI templates via backend
      const response = await fetch('/api/agents/email/generate-sequence', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          campaignName: campaignData.name || 'Outreach Campaign',
          context: campaignData.context || 'Reaching out to potential customers',
          product: campaignData.offer?.product || 'our product',
          benefits: benefits,
          priceAngle: campaignData.offer?.pricing || 'Competitive pricing available',
          urgency: campaignData.offer?.urgency || 'Limited time offer',
          disclaimer: campaignData.offer?.disclaimer || '',
          primaryCTA: campaignData.offer?.cta?.primary || 'Learn More',
          CTAurl: campaignData.offer?.cta?.link || '#'
        })
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        console.error('API response error:', response.status, errorMessage);
        throw new Error(errorMessage);
      }

      const { sequence } = await response.json();
      console.log('Received AI-generated sequence:', sequence);

      // Map the AI-generated sequence to our template format
      const templates = sequence.map((email: {subject: string; body: string; order?: number}, index: number) => ({
        id: `template-${index + 1}`,
        subject: email.subject,
        body: email.body,
        order: email.order || index + 1,
        daysSinceStart: index * campaignData.schedule.daysBetweenMessages + 1
      }));

      setCampaignData(prev => ({ ...prev, templates }));
      addNotification('success', 'Templates Generated', `Successfully generated ${templates.length} email templates using AI.`);
      console.log('Successfully set AI-generated templates');
    } catch (error) {
      console.error('Error generating AI templates, falling back to local:', error);
      addNotification('warning', 'AI Generation Failed', 'Falling back to local template generation.');
      // Fallback to local generation if API fails
      generateLocalTemplates();
    } finally {
      setIsGeneratingTemplates(false);
    }
  };

  const generateLocalTemplates = () => {
    // Keep the original local generation as fallback
    const templates: Array<{
      id: string;
      subject: string;
      body: string;
      order: number;
      daysSinceStart: number;
    }> = [];
    const totalEmails = campaignData.schedule.totalMessages;
    
    for (let i = 0; i < totalEmails; i++) {
      const template = {
        id: `template-${i + 1}`,
        subject: generateSubjectLine(i + 1),
        body: generateEmailBody(i + 1),
        order: i + 1,
        daysSinceStart: i * campaignData.schedule.daysBetweenMessages + 1
      };
      templates.push(template);
    }
    
    setCampaignData(prev => ({ ...prev, templates }));
  };

  const saveTemplate = async (template: EmailTemplate, templateName?: string) => {
    if (!checkAuthentication()) return;

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: templateName || template.subject.substring(0, 50),
          description: `Template from campaign: ${campaignData.name}`,
          channel: 'email',
          subject: template.subject,
          content: template.body,
          variables: ['firstName', 'product', 'cta', 'disclaimer'],
          category: 'campaign',
          active: true
        })
      });

      if (!response.ok) {
        const errorMessage = await parseApiError(response);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Template saved successfully:', result);

      addNotification('success', 'Template Saved', 'Email template saved successfully to your template library.');

      return result.template;
    } catch (error) {
      console.error('Error saving template:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      addNotification('error', 'Save Failed', `Failed to save template: ${errorMessage}`);
      throw error;
    }
  };

  const generateSubjectLine = (emailNumber: number) => {
    const product = campaignData.offer.product || 'our financing solution';
    const subjects = [
      `Interested in ${product}? Let's explore your options`,
      `Quick update on ${product} - rates still available`,
      `Don't miss out: ${product} application deadline approaching`,
      `Final reminder: ${product} offer expires soon`,
      `Last chance: ${product} - shall we proceed?`
    ];
    
    return subjects[Math.min(emailNumber - 1, subjects.length - 1)];
  };

  const generateEmailBody = (emailNumber: number) => {
    const { product, pricing, cta, disclaimer } = campaignData.offer;
    const context = campaignData.context;
    
    const intro = emailNumber === 1 
      ? `Hi {firstName},\n\nI hope this email finds you well! I wanted to reach out regarding ${product || 'our financing options'}.`
      : `Hi {firstName},\n\nI wanted to follow up on ${product || 'the financing opportunity'} I mentioned earlier.`;
    
    const body = emailNumber <= 3
      ? `${context ? 'Based on your interest, ' : ''}${product ? `Our ${product} offers` : 'We offer'} ${pricing || 'competitive rates'} that could save you money.\n\nWe're here to help you achieve your financial goals.`
      : `Time is running out! ${campaignData.offer.urgency || 'This offer won\'t last long'}, and I don\'t want you to miss this opportunity.\n\n${pricing ? `With rates starting at ${pricing}, ` : ''}${product || 'This solution'} could be exactly what you've been looking for.`;
    
    const ctaSection = cta.primary 
      ? `\n\n[${cta.primary}](${cta.link || '#'})\n\n${cta.secondary || 'Or reply to this email with any questions.'}`
      : '\n\nReply to this email or give me a call if you\'d like to discuss further.';
    
    const footer = disclaimer 
      ? `\n\nBest regards,\n{agentName}\n\n---\n${disclaimer}`
      : '\n\nBest regards,\n{agentName}';
    
    return intro + '\n\n' + body + ctaSection + footer;
  };

  const handleNext = () => {
    // Validate current step before proceeding
    let canProceed = true;

    switch (currentStep) {
      case 'basics':
        if (!campaignData.name.trim()) {
          addNotification('error', 'Validation Error', 'Campaign name is required.');
          canProceed = false;
        }
        if (!campaignData.context.trim()) {
          addNotification('error', 'Validation Error', 'Campaign context is required.');
          canProceed = false;
        }
        break;
      case 'audience':
        if (!campaignData.audience.contacts || campaignData.audience.contacts.length === 0) {
          addNotification('error', 'Validation Error', 'Please upload a contact list before proceeding.');
          canProceed = false;
        }
        break;
      case 'agent':
        if (!campaignData.agentId) {
          addNotification('error', 'Validation Error', 'Please select an AI agent.');
          canProceed = false;
        }
        break;
      case 'templates':
        if (!campaignData.templates || campaignData.templates.length === 0) {
          addNotification('warning', 'No Templates', 'Consider generating email templates for better campaign performance.');
        }
        break;
    }

    if (!canProceed) return;

    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1].id;
      console.log('Campaign Wizard: Moving from', currentStep, 'to', nextStep);
      setCurrentStep(nextStep);
      clearNotifications(); // Clear notifications when moving to next step
    }
  };

  const handlePrevious = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleComplete = async () => {
    // Pre-flight checks
    if (!checkAuthentication()) return;
    if (!validateCampaignData()) return;

    setIsSubmitting(true);
    clearNotifications();

    try {
      const token = localStorage.getItem('token')!;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 1) Create campaign
      addNotification('info', 'Creating Campaign', 'Setting up your campaign...');

      const createBody = {
        name: campaignData.name,
        context: campaignData.context,
        handoverGoals: campaignData.handoverGoals,
        targetAudience: campaignData.audience,
        schedule: campaignData.schedule,
        settings: {
          context: campaignData.context,
          handoverGoals: campaignData.handoverGoals
        }
      };

      const createRes = await fetch('/api/campaigns', {
        method: 'POST',
        headers,
        body: JSON.stringify(createBody)
      });

      if (!createRes.ok) {
        const errorMessage = await parseApiError(createRes);
        console.error('Failed to create campaign', createRes.status, errorMessage);
        throw new Error(`Campaign creation failed: ${errorMessage}`);
      }

      const createJson = await createRes.json();
      const campaign = createJson?.campaign;
      const campaignId: string | undefined = campaign?.id;
      if (!campaignId) {
        console.error('Create campaign response missing campaign.id', createJson);
        throw new Error('Invalid campaign creation response - missing campaign ID');
      }

      addNotification('success', 'Campaign Created', `Campaign "${campaignData.name}" created successfully.`);

      // 2) Execute campaign
      addNotification('info', 'Starting Execution', 'Launching your campaign...');

      const subjectFallback =
        campaignData.templates?.[0]?.subject || `Message from ${campaignData.name}`;
      const bodyFallback =
        campaignData.templates?.[0]?.body || campaignData.context;

      // Align audience contacts to execution contract
      const execAudience = {
        contacts: (campaignData.audience?.contacts || []).map((c) => ({
          email: c.email,
          firstName: c.name,
          name: c.name
        })),
        headerMapping: campaignData.audience?.headerMapping || {}
      };

      const executeBody = {
        campaignId,
        name: campaignData.name,
        contextForCampaign: campaignData.context,
        handoverGoals: campaignData.handoverGoals,
        audience: execAudience,
        schedule: campaignData.schedule,
        email: {
          subject: subjectFallback,
          body: bodyFallback
        }
      };

      const execRes = await fetch('/api/campaigns/execute', {
        method: 'POST',
        headers,
        body: JSON.stringify(executeBody)
      });

      if (!execRes.ok) {
        const errorMessage = await parseApiError(execRes);
        console.error('Failed to start execution', execRes.status, errorMessage);
        throw new Error(`Campaign execution failed: ${errorMessage}`);
      }

      const execJson = await execRes.json();
      const newExecutionId: string | undefined = execJson?.executionId;
      if (!newExecutionId) {
        console.error('Execute response missing executionId', execJson);
        throw new Error('Invalid execution response - missing execution ID');
      }

      setExecutionId(newExecutionId);
      addNotification('success', 'Campaign Launched!',
        `Campaign launched successfully with ${campaignData.audience.contacts.length} contacts. Execution ID: ${newExecutionId}`);

      // Pass executionId via a side channel without violating CampaignData typing
      (onComplete as unknown as (data: any) => void)({ ...campaignData, executionId: newExecutionId });

      // Don't close immediately - let user see the success message and execution link
      setTimeout(() => {
        onClose();
      }, 3000);

    } catch (err) {
      console.error('Error launching campaign from wizard:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      addNotification('error', 'Launch Failed', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Notification component
  const NotificationList = () => {
    if (notifications.length === 0) return null;

    return (
      <div className="space-y-2 mb-4">
        {notifications.map((notification) => (
          <Alert
            key={notification.id}
            variant={notification.type === 'error' ? 'destructive' : 'default'}
            className={`${
              notification.type === 'success' ? 'border-green-500 bg-green-50' :
              notification.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              notification.type === 'info' ? 'border-blue-500 bg-blue-50' :
              ''
            }`}
          >
            {notification.type === 'error' && <AlertCircle className="h-4 w-4" />}
            {notification.type === 'success' && <CheckCircle className="h-4 w-4" />}
            {notification.type === 'warning' && <AlertCircle className="h-4 w-4" />}
            {notification.type === 'info' && <AlertCircle className="h-4 w-4" />}
            <AlertTitle>{notification.title}</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{notification.message}</span>
              {executionId && notification.type === 'success' && notification.title === 'Campaign Launched!' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/campaigns/executions/${executionId}`, '_blank')}
                  className="ml-2"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Status
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeNotification(notification.id)}
                className="ml-2 h-6 w-6 p-0"
              >
                ×
              </Button>
            </AlertDescription>
          </Alert>
        ))}
      </div>
    );
  };

  const renderStepContent = () => {
    console.log('Campaign Wizard: Rendering step', currentStep);
    try {
      switch (currentStep) {
        case 'basics':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={campaignData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name"
                className="mt-1"
              />
            </div>


            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="context">Context for this Campaign</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => enhanceWithAI('context')}
                  className="h-7 px-2"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Generate
                </Button>
              </div>
              <Textarea
                id="context"
                value={campaignData.context}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampaignData((prev) => ({ ...prev, context: e.target.value }))}
                placeholder="Provide business context for the AI agent (e.g., 'This is a re-engagement campaign for leads who inquired about car loans but didn't complete their application. Focus on addressing common concerns about credit scores and down payments.')"
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This context helps the AI understand your business goals and tailor responses appropriately
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="handoverGoals">Handover Goals</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => enhanceWithAI('handoverGoals')}
                  className="h-7 px-2"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  AI Suggest
                </Button>
              </div>
              <Textarea
                id="handoverGoals"
                value={campaignData.handoverGoals}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampaignData((prev) => ({ ...prev, handoverGoals: e.target.value }))}
                placeholder="e.g., Qualify budget and timeline, confirm decision-making authority, schedule demo when ready"
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Define when and why the AI should hand over conversations to human agents
              </p>
            </div>
          </div>
        );

      case 'audience':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Upload Contact List</h4>
              </div>
              <p className="text-sm text-blue-700">
                Upload a CSV file with your contact list. The file must include "First Name" and "Email" columns.
              </p>
            </div>
            
            {campaignData.audience.contacts.length === 0 ? (
              <div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  {isDragActive ? (
                    <p className="text-sm text-blue-600">Drop the CSV file here...</p>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Drag and drop a CSV file here, or click to select
                      </p>
                      <p className="text-xs text-gray-500">
                        Only CSV files are accepted
                      </p>
                    </div>
                  )}
                </div>
                
                {csvError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{csvError}</p>
                  </div>
                )}
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">CSV Requirements:</h5>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Must include "First Name" and "Email" columns (auto-detected)</li>
                    <li>• Maximum 10 columns will be imported</li>
                    <li>• Common column variations are supported (e.g., "firstname", "email address")</li>
                    <li>• Empty rows will be automatically filtered out</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-green-900">CSV Uploaded Successfully</h5>
                    <Badge variant="outline" className="bg-green-100 text-green-700">
                      {campaignData.audience.contacts.length} contacts
                    </Badge>
                  </div>
                  <p className="text-sm text-green-700">File: {uploadedFileName}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Mapped Columns:</h5>
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">First Name:</span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                        {campaignData.audience.headerMapping.firstName}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-600 w-24">Email:</span>
                      <span className="font-mono text-xs bg-white px-2 py-1 rounded">
                        {campaignData.audience.headerMapping.email}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCampaignData(prev => ({
                        ...prev,
                        audience: {
                          ...prev.audience,
                          contacts: [],
                          headerMapping: {},
                          targetCount: 0
                        }
                      }));
                      setUploadedFileName('');
                      setCsvError('');
                    }}
                  >
                    Upload Different File
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'agent':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">Select AI Agent</h4>
              </div>
              <p className="text-sm text-purple-700">
                Choose the AI agent that will manage this campaign.
              </p>
            </div>
            <div className="space-y-3">
              {agents.length > 0 ? agents.map((agent: Agent) => (
                <div
                  key={agent.id}
                  className={`p-4 border rounded-lg cursor-pointer transition ${
                    campaignData.agentId === agent.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setCampaignData(prev => ({ ...prev, agentId: agent.id }))}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{agent.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{agent.role}</p>
                    </div>
                    {campaignData.agentId === agent.id && (
                      <Check className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500">
                  <Brain className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p>No agents available</p>
                  <Button variant="link" className="mt-2">Create an Agent</Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'offer':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Sparkles className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-900">Offer Details</h4>
              </div>
              <p className="text-sm text-green-700">
                Provide details about your offer so AI can create compelling email templates.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="product">Product/Service</Label>
                <Input
                  id="product"
                  value={campaignData.offer.product}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    offer: { ...prev.offer, product: e.target.value }
                  }))}
                  placeholder="e.g., Car loan refinancing, Personal loans"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="pricing">Pricing/Rates</Label>
                <Input
                  id="pricing"
                  value={campaignData.offer.pricing}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    offer: { ...prev.offer, pricing: e.target.value }
                  }))}
                  placeholder="e.g., Starting at 3.99% APR, No fees"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="urgency">Urgency/Timeline</Label>
                <Input
                  id="urgency"
                  value={campaignData.offer.urgency}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    offer: { ...prev.offer, urgency: e.target.value }
                  }))}
                  placeholder="e.g., Limited time offer, Apply by month end"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="primaryCta">Primary Call-to-Action</Label>
                <Input
                  id="primaryCta"
                  value={campaignData.offer.cta.primary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    offer: { 
                      ...prev.offer, 
                      cta: { ...prev.offer.cta, primary: e.target.value }
                    }
                  }))}
                  placeholder="e.g., Apply Now, Get Your Rate"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="ctaLink">CTA Link</Label>
                <Input
                  id="ctaLink"
                  value={campaignData.offer.cta.link}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    offer: { 
                      ...prev.offer, 
                      cta: { ...prev.offer.cta, link: e.target.value }
                    }
                  }))}
                  placeholder="https://your-site.com/apply"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="disclaimer">Disclaimers/Legal</Label>
                <Textarea
                  id="disclaimer"
                  value={campaignData.offer.disclaimer}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampaignData((prev) => ({
                    ...prev,
                    offer: { ...prev.offer, disclaimer: e.target.value }
                  }))}
                  placeholder="Required legal disclaimers, terms, conditions..."
                  rows={3}
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          </div>
        );

      case 'templates':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <h4 className="font-medium text-purple-900">AI Email Templates</h4>
              </div>
              <p className="text-sm text-purple-700">
                Generate email templates automatically based on your offer details and campaign goals.
              </p>
            </div>
            
            {campaignData.templates.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No templates generated yet</p>
                  <Button
                    onClick={() => generateEmailTemplates()}
                    disabled={isGeneratingTemplates}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingTemplates ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating Templates...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Generate {campaignData.schedule.totalMessages} Email Templates
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">How AI Templates Work</p>
                      <p className="text-blue-700 mt-1">
                        AI will create {campaignData.schedule.totalMessages} progressive emails based on your offer, 
                        each with unique subject lines and escalating urgency. When a lead replies to ANY email, 
                        the remaining templates are cancelled and AI takes over for personalized conversation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Generated Templates ({campaignData.templates.length})</h4>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateEmailTemplates()}
                    disabled={isGeneratingTemplates}
                  >
                    {isGeneratingTemplates ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3 mr-1" />
                        Regenerate
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {campaignData.templates.map((template: EmailTemplate, index: number) => {
                    const isExpanded = expandedTemplates.has(index);
                    return (
                      <Card key={index} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Email {index + 1}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Day {index * campaignData.schedule.daysBetweenMessages + 1}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => saveTemplate(template)}
                                className="h-7 w-7 p-0"
                                title="Save as Template"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <Label className="text-xs text-gray-500">Subject Line</Label>
                            <p className="text-sm font-medium">{template.subject}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Message</Label>
                            <div className={`text-sm text-gray-600 ${!isExpanded ? 'line-clamp-3' : ''}`}>
                              {isExpanded ? (
                                <pre className="whitespace-pre-wrap font-sans">{template.body}</pre>
                              ) : (
                                <p>{template.body.substring(0, 150)}...</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleTemplateExpansion(index)}
                              className="mt-2 h-8 text-xs flex items-center gap-1"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3 w-3" />
                                  Show Less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" />
                                  Show More
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <h4 className="font-medium text-orange-900">Campaign Schedule</h4>
              </div>
              <p className="text-sm text-orange-700">
                Configure your email sequence timing. If a lead replies, the AI takes over with personalized conversations.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Number of Messages</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={campaignData.schedule.totalMessages}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, totalMessages: parseInt(e.target.value) || 1 }
                  }))}
                  className="mt-1"
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-gray-500 mt-1">Number of templated emails to send (if no response)</p>
              </div>
              <div>
                <Label>Days Between Messages</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={campaignData.schedule.daysBetweenMessages}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCampaignData((prev) => ({
                    ...prev,
                    schedule: { ...prev.schedule, daysBetweenMessages: parseInt(e.target.value) || 1 }
                  }))}
                  className="mt-1"
                  placeholder="e.g., 3"
                />
                <p className="text-xs text-gray-500 mt-1">Wait time between each templated email</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">AI Response Mode</p>
                    <p className="text-blue-700 mt-1">
                      When a lead replies to any email, the remaining templated emails are cancelled. 
                      The AI agent takes over for personalized back-and-forth conversation until handover.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );


      case 'review':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Ready to Launch!</h4>
              </div>
              <p className="text-sm text-blue-700">
                Review your campaign settings before launching.
              </p>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Campaign Name</p>
                <p className="text-sm">{campaignData.name || 'Not set'}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Campaign Context</p>
                <p className="text-sm">{campaignData.context || 'Not set'}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Selected Agent</p>
                <p className="text-sm">
                  {agents.find(a => a.id === campaignData.agentId)?.name || 'No agent selected'}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Offer Details</p>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Product:</span> {campaignData.offer.product || 'Not set'}</p>
                  <p><span className="font-medium">Pricing:</span> {campaignData.offer.pricing || 'Not set'}</p>
                  <p><span className="font-medium">CTA:</span> {campaignData.offer.cta.primary || 'Not set'}</p>
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Email Templates</p>
                <div className="text-sm">
                  {campaignData.templates.length > 0 ? (
                    <div className="space-y-1">
                      <p>{campaignData.templates.length} templates generated</p>
                      <div className="text-xs text-gray-500">
                        {campaignData.templates.map((t: EmailTemplate, i: number) => (
                          <div key={i}>Email {i + 1}: {t.subject}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500">No templates generated</p>
                  )}
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Email Sequence</p>
                <p className="text-sm">
                  {campaignData.schedule.totalMessages} messages, {campaignData.schedule.daysBetweenMessages} days apart
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  AI takes over if lead replies to any email
                </p>
              </div>
            </div>
          </div>
        );

        default:
          return (
            <div className="p-4 text-center">
              <p>Step not implemented: {currentStep}</p>
            </div>
          );
      }
    } catch (error) {
      console.error('Campaign Wizard render error:', error);
      return (
        <div className="p-4 text-center text-red-600">
          <p>Error rendering step: {currentStep}</p>
          <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      );
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={o => !o && onClose()}>
      <SheetContent className="w-[600px] sm:max-w-[600px] h-full overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Create Campaign</SheetTitle>
          <SheetDescription>
            Follow the wizard to set up your AI-powered campaign
          </SheetDescription>
        </SheetHeader>

        {/* Notifications */}
        <div className="flex-shrink-0 mt-4">
          <NotificationList />
        </div>

        <div className="flex-1 overflow-hidden flex flex-col mt-6">
          {/* Progress Steps */}
          <div className="mb-6 flex-shrink-0">
            <div className="flex items-center justify-between relative">
              {steps.map((step: { id: WizardStep; label: string; icon: React.ReactNode }, index: number) => (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      index <= currentStepIndex
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {/* icon is already rendered with className above when building steps; just render node */}
                    {step.icon}
                  </div>
                  <span className="text-xs mt-1 text-center max-w-[50px] leading-tight">
                    {step.label}
                  </span>
                </div>
              ))}
              <div className="absolute top-4 left-0 right-0 h-[2px] bg-gray-200 -z-10">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-1 min-h-0">
            <div className="pb-4">
              {renderStepContent()}
            </div>
          </div>

          {/* Navigation - Fixed at bottom */}
          <div className="flex justify-between pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 'basics'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentStep === 'review' ? (
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Launching Campaign...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}