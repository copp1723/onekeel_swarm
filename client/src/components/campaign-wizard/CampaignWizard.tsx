import { useState, useCallback } from 'react';
import * as React from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
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
  UserCheck
} from 'lucide-react';

interface CampaignWizardProps {
  isOpen: boolean;
  onClose(): void;
  onComplete(data: any): void;
  agents?: any[];
}

type WizardStep = 'basics' | 'audience' | 'agent' | 'offer' | 'templates' | 'schedule' | 'handover' | 'review';

export function CampaignWizard({ isOpen, onClose, onComplete, agents = [] }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [csvError, setCsvError] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [expandedTemplates, setExpandedTemplates] = useState<Set<number>>(new Set());
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    goal: '',
    context: '',
    audience: {
      filters: [],
      targetCount: 0,
      datasetId: '',
      contacts: [] as any[],
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
    templates: [] as any[],
    schedule: {
      startDate: '',
      totalEmails: 5,
      daysBetweenEmails: 3,
      timezone: 'America/New_York',
      sendTimeOptimization: true
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
    { id: 'handover', label: 'Handover Rules', icon: <UserCheck className="h-4 w-4" /> },
    { id: 'review', label: 'Review & Launch', icon: <Check className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

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
        const contacts = results.data.map((row: any) => {
          const contact: any = {};
          limitedHeaders.forEach((header: string) => {
            let value = row[header];
            
            // Sanitize CSV injection attempts
            if (typeof value === 'string') {
              value = value.trim();
              // Prevent formula injection
              if (/^[=+\-@]/.test(value)) {
                value = "'" + value;
              }
              // Limit string length
              value = value.substring(0, 255);
            }
            
            contact[header] = value;
          });
          return contact;
        }).slice(0, 10000) // Limit to 10k rows
        .filter((contact: any) => {
          // Filter out empty rows
          return contact[headerMapping['email']] && contact[headerMapping['firstName']];
        });
        
        // Update campaign data
        setCampaignData(prev => ({
          ...prev,
          audience: {
            ...prev.audience,
            contacts: contacts,
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
    if (field === 'description') {
      const productInfo = campaignData.offer?.product ? ` for ${campaignData.offer.product}` : '';
      setCampaignData(prev => ({
        ...prev,
        description: `${prev.description || `Strategic outreach campaign${productInfo}`}\n\nThis campaign leverages AI-powered personalization to maximize engagement and conversion rates. Our intelligent agents will adapt messaging based on recipient behavior and preferences, ensuring each interaction feels personal and timely.`
      }));
    } else if (field === 'goal') {
      const targetCount = campaignData.audience?.targetCount || 50;
      setCampaignData(prev => ({
        ...prev,
        goal: `Achieve 25% open rate, 10% click-through rate, and generate ${Math.max(50, Math.floor(targetCount * 0.05))}+ qualified leads through personalized multi-touch email sequences optimized by AI.`
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
      
      // Generate sophisticated AI templates via backend
      const response = await fetch('/api/agents/email/generate-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaignData.name || 'Outreach Campaign',
          goal: campaignData.goal || 'Increase conversions and engage leads',
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
        const errorData = await response.text();
        console.error('API response error:', response.status, errorData);
        throw new Error(`Failed to generate templates: ${response.status}`);
      }
      
      const { sequence } = await response.json();
      console.log('Received AI-generated sequence:', sequence);
      
      // Map the AI-generated sequence to our template format
      const templates = sequence.map((email: any, index: number) => ({
        id: `template-${index + 1}`,
        subject: email.subject,
        body: email.body,
        order: email.order || index + 1,
        daysSinceStart: index * campaignData.schedule.daysBetweenEmails + 1
      }));
      
      setCampaignData(prev => ({ ...prev, templates }));
      console.log('Successfully set AI-generated templates');
    } catch (error) {
      console.error('Error generating AI templates, falling back to local:', error);
      // Fallback to local generation if API fails
      generateLocalTemplates();
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
    const totalEmails = campaignData.schedule.totalEmails;
    
    for (let i = 0; i < totalEmails; i++) {
      const template = {
        id: `template-${i + 1}`,
        subject: generateSubjectLine(i + 1),
        body: generateEmailBody(i + 1),
        order: i + 1,
        daysSinceStart: i * campaignData.schedule.daysBetweenEmails + 1
      };
      templates.push(template);
    }
    
    setCampaignData(prev => ({ ...prev, templates }));
  };

  const saveTemplate = async (template: any, templateName?: string) => {
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error('Failed to save template');
      }

      const result = await response.json();
      console.log('Template saved successfully:', result);
      
      // Show success message (could add a toast notification here)
      alert('Template saved successfully!');
      
      return result.template;
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template. Please try again.');
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
      ? `${context ? 'Based on your interest, ' : ''}${product ? `Our ${product} offers` : 'We offer'} ${pricing || 'competitive rates'} that could save you money.\n\n${campaignData.goal ? `Our goal is simple: ${campaignData.goal}` : 'We\'re here to help you achieve your financial goals.'}`
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
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      const nextStep = steps[stepIndex + 1].id;
      console.log('Campaign Wizard: Moving from', currentStep, 'to', nextStep);
      setCurrentStep(nextStep);
    }
  };

  const handlePrevious = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].id);
    }
  };

  const handleComplete = () => {
    onComplete(campaignData);
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
                onChange={(e) => setCampaignData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter campaign name"
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="description">Description</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => enhanceWithAI('description')}
                  className="h-7 px-2"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Enhance
                </Button>
              </div>
              <Textarea
                id="description"
                value={campaignData.description}
                onChange={(e) => setCampaignData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe your campaign objectives"
                rows={4}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="goal">Campaign Goal</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => enhanceWithAI('goal')}
                  className="h-7 px-2"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  AI Suggest
                </Button>
              </div>
              <Input
                id="goal"
                value={campaignData.goal}
                onChange={(e) => setCampaignData(prev => ({ ...prev, goal: e.target.value }))}
                placeholder="e.g., Generate 50 qualified leads"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="context">Campaign Context</Label>
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
                onChange={(e) => setCampaignData(prev => ({ ...prev, context: e.target.value }))}
                placeholder="Provide business context for the AI agent (e.g., 'This is a re-engagement campaign for leads who inquired about car loans but didn't complete their application. Focus on addressing common concerns about credit scores and down payments.')"
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                This context helps the AI understand your business goals and tailor responses appropriately
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
              {agents.length > 0 ? agents.map((agent) => (
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
                  onChange={(e) => setCampaignData(prev => ({
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
                  onChange={(e) => setCampaignData(prev => ({
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
                  onChange={(e) => setCampaignData(prev => ({
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
                  onChange={(e) => setCampaignData(prev => ({
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
                  onChange={(e) => setCampaignData(prev => ({
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
                  onChange={(e) => setCampaignData(prev => ({
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
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate {campaignData.schedule.totalEmails} Email Templates
                  </Button>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-blue-900">How AI Templates Work</p>
                      <p className="text-blue-700 mt-1">
                        AI will create {campaignData.schedule.totalEmails} progressive emails based on your offer, 
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
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Regenerate
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {campaignData.templates.map((template: any, index: number) => {
                    const isExpanded = expandedTemplates.has(index);
                    return (
                      <Card key={index} className="border">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Email {index + 1}</CardTitle>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Day {index * campaignData.schedule.daysBetweenEmails + 1}</Badge>
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
                <Label>Campaign Start Date</Label>
                <Input
                  type="date"
                  value={campaignData.schedule.startDate}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, startDate: e.target.value }
                  }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Total Emails in Sequence</Label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={campaignData.schedule.totalEmails}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, totalEmails: parseInt(e.target.value) || 1 }
                  }))}
                  className="mt-1"
                  placeholder="e.g., 5"
                />
                <p className="text-xs text-gray-500 mt-1">Number of templated emails to send (if no response)</p>
              </div>
              <div>
                <Label>Days Between Emails</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={campaignData.schedule.daysBetweenEmails}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, daysBetweenEmails: parseInt(e.target.value) || 1 }
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
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendTimeOptimization"
                  checked={campaignData.schedule.sendTimeOptimization}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule, sendTimeOptimization: e.target.checked }
                  }))}
                  className="rounded"
                />
                <Label htmlFor="sendTimeOptimization" className="cursor-pointer">
                  Enable AI send time optimization
                </Label>
              </div>
            </div>
          </div>
        );

      case 'handover':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Handover Rules</h4>
              </div>
              <p className="text-sm text-blue-700">
                Define when the AI should hand over conversations to human agents based on lead behavior and intent.
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Qualification Score Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={campaignData.handoverRules.qualificationScore}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    handoverRules: { ...prev.handoverRules, qualificationScore: parseInt(e.target.value) || 0 }
                  }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Hand over when lead reaches this qualification score</p>
              </div>

              <div>
                <Label>Maximum Conversation Length</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={campaignData.handoverRules.conversationLength}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    handoverRules: { ...prev.handoverRules, conversationLength: parseInt(e.target.value) || 10 }
                  }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Hand over after this many messages</p>
              </div>

              <div>
                <Label>Time Threshold (minutes)</Label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={campaignData.handoverRules.timeThreshold}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    handoverRules: { ...prev.handoverRules, timeThreshold: parseInt(e.target.value) || 30 }
                  }))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Hand over after this many minutes of conversation</p>
              </div>

              <div>
                <Label>Buying Signals</Label>
                <Textarea
                  value={campaignData.handoverRules.buyingSignals.join(', ')}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    handoverRules: { 
                      ...prev.handoverRules, 
                      buyingSignals: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    }
                  }))}
                  placeholder="interested, ready to buy, pricing, how much"
                  className="mt-1"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated phrases indicating purchase intent</p>
              </div>

              <div>
                <Label>Escalation Phrases</Label>
                <Textarea
                  value={campaignData.handoverRules.escalationPhrases.join(', ')}
                  onChange={(e) => setCampaignData(prev => ({
                    ...prev,
                    handoverRules: { 
                      ...prev.handoverRules, 
                      escalationPhrases: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                    }
                  }))}
                  placeholder="speak to human, agent, representative, help"
                  className="mt-1"
                  rows={2}
                />
                <p className="text-xs text-gray-500 mt-1">Comma-separated phrases requesting human assistance</p>
              </div>

              <div>
                <Label>Handover Recipients</Label>
                <div className="space-y-2 mt-1">
                  {campaignData.handoverRules.handoverRecipients.map((recipient, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Name"
                        value={recipient.name}
                        onChange={(e) => {
                          const newRecipients = [...campaignData.handoverRules.handoverRecipients];
                          newRecipients[index].name = e.target.value;
                          setCampaignData(prev => ({
                            ...prev,
                            handoverRules: { ...prev.handoverRules, handoverRecipients: newRecipients }
                          }));
                        }}
                      />
                      <Input
                        placeholder="Email"
                        type="email"
                        value={recipient.email}
                        onChange={(e) => {
                          const newRecipients = [...campaignData.handoverRules.handoverRecipients];
                          newRecipients[index].email = e.target.value;
                          setCampaignData(prev => ({
                            ...prev,
                            handoverRules: { ...prev.handoverRules, handoverRecipients: newRecipients }
                          }));
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newRecipients = campaignData.handoverRules.handoverRecipients.filter((_, i) => i !== index);
                          setCampaignData(prev => ({
                            ...prev,
                            handoverRules: { ...prev.handoverRules, handoverRecipients: newRecipients }
                          }));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCampaignData(prev => ({
                        ...prev,
                        handoverRules: { 
                          ...prev.handoverRules, 
                          handoverRecipients: [...prev.handoverRules.handoverRecipients, { name: '', email: '' }]
                        }
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Recipient
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-1">People to notify when handover occurs</p>
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
                <p className="text-sm font-medium text-gray-600">Goal</p>
                <p className="text-sm">{campaignData.goal || 'Not set'}</p>
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
                        {campaignData.templates.map((t: any, i: number) => (
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
                  {campaignData.schedule.totalEmails} emails, {campaignData.schedule.daysBetweenEmails} days apart
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  AI takes over if lead replies to any email
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm font-medium text-gray-600">Start Date</p>
                <p className="text-sm">{campaignData.schedule.startDate || 'Not set'}</p>
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

        <div className="flex-1 overflow-hidden flex flex-col mt-6">
          {/* Progress Steps */}
          <div className="mb-6 flex-shrink-0">
            <div className="flex items-center justify-between relative">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      index <= currentStepIndex
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {React.cloneElement(step.icon as React.ReactElement, { className: 'h-3 w-3' })}
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
              <Button onClick={handleComplete} className="bg-purple-600 hover:bg-purple-700">
                <Zap className="h-4 w-4 mr-2" />
                Launch Campaign
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