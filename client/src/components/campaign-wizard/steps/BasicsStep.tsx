import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Wand2 } from 'lucide-react';
import { WizardContext } from '../types';

export const BasicsStep: React.FC<{ ctx: WizardContext }> = ({ ctx }) => {
  const enhanceWithAI = (field: string) => {
    // Generate practical, authentic context for real conversations
    if (field === 'description') {
      const productInfo = ctx.data.offer?.product
        ? ` for ${ctx.data.offer.product}`
        : '';
      ctx.setData(prev => ({
        ...prev,
        description: `${prev.description || `Outreach campaign${productInfo}`}\n\nStraight-talking approach. No BS. Help people figure out what they actually need.`,
      }));
    } else if (field === 'goal') {
      ctx.setData(prev => ({
        ...prev,
        goal: `Have real conversations that help people make good decisions. Build trust, not just leads.`,
      }));
    } else if (field === 'context') {
      const campaignName = ctx.data.name || 'This campaign';
      const product = ctx.data.offer?.product || 'our solution';

      ctx.setData(prev => ({
        ...prev,
        context: `Campaign: ${campaignName}
Product/Service: ${product}

Email Tone: Conversational and helpful, like talking to a colleague
Approach: Focus on the prospect's needs and challenges
Value: Share insights, tips, or resources that are genuinely useful

Avoid: Sales-y language, made-up urgency, corporate buzzwords
Include: Real benefits, honest timelines, authentic personality`,
      }));
    }
  };

  return (
    <div className='space-y-4'>
      <div>
        <Label htmlFor='name'>Campaign Name</Label>
        <Input
          id='name'
          value={ctx.data.name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            ctx.setData(prev => ({ ...prev, name: e.target.value }))
          }
          placeholder='Enter campaign name'
          className='mt-1'
        />
      </div>
      <div>
        <div className='flex items-center justify-between mb-1'>
          <Label htmlFor='description'>Description</Label>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => enhanceWithAI('description')}
            className='h-7 px-2'
          >
            <Wand2 className='h-3 w-3 mr-1' />
            Add Context
          </Button>
        </div>
        <Textarea
          id='description'
          value={ctx.data.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            ctx.setData(prev => ({ ...prev, description: e.target.value }))
          }
          placeholder='Describe your campaign objectives'
          rows={4}
        />
      </div>
      <div>
        <div className='flex items-center justify-between mb-1'>
          <Label htmlFor='goal'>Campaign Goal</Label>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => enhanceWithAI('goal')}
            className='h-7 px-2'
          >
            <Wand2 className='h-3 w-3 mr-1' />
            Suggest Goal
          </Button>
        </div>
        <Input
          id='goal'
          value={ctx.data.goal}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            ctx.setData(prev => ({ ...prev, goal: e.target.value }))
          }
          placeholder='e.g., Generate 50 qualified leads'
        />
      </div>
      <div>
        <div className='flex items-center justify-between mb-1'>
          <Label htmlFor='context'>Campaign Context</Label>
          <Button
            variant='ghost'
            size='sm'
            onClick={() => enhanceWithAI('context')}
            className='h-7 px-2'
          >
            <Wand2 className='h-3 w-3 mr-1' />
            Add Template Context
          </Button>
        </div>
        <Textarea
          id='context'
          value={ctx.data.context}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            ctx.setData(prev => ({ ...prev, context: e.target.value }))
          }
          placeholder="Describe your business context to help create better email templates (e.g., 'Re-engaging leads who showed interest but didn't buy. Common concerns: pricing, timing, trust. Keep it friendly and helpful, not pushy.')"
          rows={3}
          className='text-sm'
        />
        <p className='text-xs text-gray-500 mt-1'>
          This context helps create more relevant and effective email templates
        </p>
      </div>
    </div>
  );
};
