import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Zap, Target, Users, Brain, Sparkles, Mail, Clock, Check } from 'lucide-react';
import { useCampaignWizard } from './hooks/useCampaignWizard';
import { WizardStep } from './types';
import { BasicsStep } from './steps/BasicsStep';
import { AudienceStep } from './steps/AudienceStep';
import { AgentStep } from './steps/AgentStep';
import { OfferStep } from './steps/OfferStep';
import { TemplatesStep } from './steps/TemplatesStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { ReviewStep } from './steps/ReviewStep';

interface Props {
  isOpen: boolean;
  onClose(): void;
  onComplete(data: any): void;
  agents?: any[];
}

const STEP_COMPONENT: Record<WizardStep, React.FC<any>> = {
  basics: BasicsStep,
  audience: AudienceStep,
  agent: AgentStep,
  offer: OfferStep,
  templates: TemplatesStep,
  schedule: ScheduleStep,
  review: ReviewStep,
};

const steps: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Campaign Basics', icon: <Target className="h-4 w-4" /> },
  { id: 'audience', label: 'Target Audience', icon: <Users className="h-4 w-4" /> },
  { id: 'agent', label: 'Select Agent', icon: <Brain className="h-4 w-4" /> },
  { id: 'offer', label: 'Offer Details', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'templates', label: 'Email Templates', icon: <Mail className="h-4 w-4" /> },
  { id: 'schedule', label: 'Schedule', icon: <Clock className="h-4 w-4" /> },
  { id: 'review', label: 'Review & Launch', icon: <Check className="h-4 w-4" /> }
];

export function CampaignWizard({ isOpen, onClose, onComplete, agents = [] }: Props) {
  const wiz = useCampaignWizard(onComplete);
  const Current = STEP_COMPONENT[wiz.step];
  const currentStepIndex = steps.findIndex(s => s.id === wiz.step);

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
              <Current ctx={wiz} agents={agents} />
            </div>
          </div>

          {/* Navigation - Fixed at bottom */}
          <div className="flex justify-between pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={wiz.prev}
              disabled={wiz.step === 'basics'}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {wiz.step === 'review' ? (
              <Button onClick={wiz.complete} className="bg-purple-600 hover:bg-purple-700">
                <Zap className="h-4 w-4 mr-2" />
                Launch Campaign
              </Button>
            ) : (
              <Button onClick={wiz.next}>
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