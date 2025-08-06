import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wand2 } from 'lucide-react';
import type { WizardContext } from '../types';

export const BasicsStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
  const enhanceWithAI = (field: string) => {
    // Generate contextual AI enhancements based on campaign data
    if (field === 'handoverGoals') {
      ctx.setData((prev) => ({
        ...prev,
        handoverGoals: `Qualify the lead's budget and timeline, confirm decision-making authority, and schedule a demo or consultation call when they express strong interest or ask specific pricing questions.`
      }));
    } else if (field === 'context') {
      const campaignName = ctx.data.name || 'This campaign';
      const product = ctx.data.offer?.product || 'our solution';
      const benefits = ctx.data.offer?.keyBenefits?.length > 0 
        ? ctx.data.offer.keyBenefits.join(', ') 
        : 'competitive advantages and exclusive benefits';
      
      ctx.setData((prev) => ({
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

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Campaign Name</Label>
        <Input
          id="name"
          value={ctx.data.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Enter campaign name"
          className="mt-1"
        />
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
          value={ctx.data.handoverGoals}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => ctx.setData((prev) => ({ ...prev, handoverGoals: e.target.value }))}
          placeholder="e.g., Qualify budget and timeline, confirm decision-making authority, schedule demo when ready"
          rows={3}
          className="text-sm"
        />
        <p className="text-xs text-gray-500 mt-1">
          Define when and why the AI should hand over conversations to human agents
        </p>
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
          value={ctx.data.context}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => ctx.setData((prev) => ({ ...prev, context: e.target.value }))}
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
};