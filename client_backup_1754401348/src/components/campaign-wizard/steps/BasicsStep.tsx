import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wand2 } from 'lucide-react';
import { WizardContext } from '../types';

export const BasicsStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
  const enhanceWithAI = (field: string) => {
    // Generate contextual AI enhancements based on campaign data
    if (field === 'description') {
      const productInfo = ctx.data.offer?.product ? ` for ${ctx.data.offer.product}` : '';
      ctx.setData((prev) => ({
        ...prev,
        description: `${prev.description || `Strategic outreach campaign${productInfo}`}\n\nThis campaign leverages AI-powered personalization to maximize engagement and conversion rates. Our intelligent agents will adapt messaging based on recipient behavior and preferences, ensuring each interaction feels personal and timely.`
      }));
    } else if (field === 'goal') {
      const targetCount = ctx.data.audience?.targetCount || 50;
      ctx.setData((prev) => ({
        ...prev,
        goal: `Achieve 25% open rate, 10% click-through rate, and generate ${Math.max(50, Math.floor(targetCount * 0.05))}+ qualified leads through personalized multi-touch email sequences optimized by AI.`
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
          value={ctx.data.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => ctx.setData((prev) => ({ ...prev, description: e.target.value }))}
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
          value={ctx.data.goal}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({ ...prev, goal: e.target.value }))}
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