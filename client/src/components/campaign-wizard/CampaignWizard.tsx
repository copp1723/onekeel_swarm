import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  Target, 
  Users, 
  Mail, 
  Brain, 
  Sparkles, 
  Check,
  ArrowLeft,
  ArrowRight,
  Wand2,
  Settings,
  Clock,
  Zap,
  Plus
} from 'lucide-react';

interface CampaignWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (campaign: any) => void;
  agents?: any[];
}

type WizardStep = 'basics' | 'audience' | 'agent' | 'templates' | 'schedule' | 'review';

export function CampaignWizard({ isOpen, onClose, onComplete, agents = [] }: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    goal: '',
    audience: {
      filters: [],
      targetCount: 0
    },
    agentId: '',
    templates: [],
    schedule: {
      startDate: '',
      totalEmails: 5,
      daysBetweenEmails: 3,
      timezone: 'America/New_York',
      sendTimeOptimization: true
    }
  });

  const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
    { id: 'basics', label: 'Campaign Basics', icon: <Target className="h-4 w-4" /> },
    { id: 'audience', label: 'Target Audience', icon: <Users className="h-4 w-4" /> },
    { id: 'agent', label: 'Select Agent', icon: <Brain className="h-4 w-4" /> },
    { id: 'templates', label: 'Email Templates', icon: <Mail className="h-4 w-4" /> },
    { id: 'schedule', label: 'Schedule', icon: <Clock className="h-4 w-4" /> },
    { id: 'review', label: 'Review & Launch', icon: <Check className="h-4 w-4" /> }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const enhanceWithAI = (field: string) => {
    // Simulate AI enhancement
    if (field === 'description') {
      setCampaignData(prev => ({
        ...prev,
        description: prev.description + '\n\nThis campaign leverages AI-powered personalization to maximize engagement and conversion rates. Our intelligent agents will adapt messaging based on recipient behavior and preferences.'
      }));
    } else if (field === 'goal') {
      setCampaignData(prev => ({
        ...prev,
        goal: 'Achieve 25% open rate, 10% click-through rate, and generate 50+ qualified leads through personalized multi-touch email sequences optimized by AI.'
      }));
    }
  };

  const handleNext = () => {
    const stepIndex = steps.findIndex(s => s.id === currentStep);
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].id);
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
          </div>
        );

      case 'audience':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-blue-900">Audience Selection</h4>
              </div>
              <p className="text-sm text-blue-700">
                Select your target audience based on tags, engagement, or custom filters.
              </p>
            </div>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
              <div className="text-center py-8 text-gray-500">
                No filters applied. All contacts will be included.
              </div>
            </div>
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

      case 'templates':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Mail className="h-5 w-5 text-green-600" />
                <h4 className="font-medium text-green-900">Email Templates</h4>
              </div>
              <p className="text-sm text-green-700">
                Select templates for your email sequence.
              </p>
            </div>
            <Button variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
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
                <p className="text-sm font-medium text-gray-600">Selected Agent</p>
                <p className="text-sm">
                  {agents.find(a => a.id === campaignData.agentId)?.name || 'No agent selected'}
                </p>
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
        return null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>Create Campaign</SheetTitle>
          <SheetDescription>
            Follow the wizard to set up your AI-powered campaign
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      index <= currentStepIndex
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs mt-2 text-center max-w-[60px]">
                    {step.label}
                  </span>
                </div>
              ))}
              <div className="absolute top-5 left-0 right-0 h-[2px] bg-gray-200 -z-10">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[300px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
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