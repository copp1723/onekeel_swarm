import React from 'react';
import { Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { WizardContext } from '../types';

export const OfferStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
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
            value={ctx.data.offer.product}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
            value={ctx.data.offer.pricing}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
            value={ctx.data.offer.urgency}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
            value={ctx.data.offer.cta.primary}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
            value={ctx.data.offer.cta.link}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
            value={ctx.data.offer.disclaimer}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => ctx.setData((prev) => ({
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
};