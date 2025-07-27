import React from 'react';
import { Zap } from 'lucide-react';
import { WizardContext } from '../types';

export const ReviewStep: React.FC<{ctx: WizardContext; agents: any[]}> = ({ ctx, agents }) => {
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
          <p className="text-sm">{ctx.data.name || 'Not set'}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Goal</p>
          <p className="text-sm">{ctx.data.goal || 'Not set'}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Campaign Context</p>
          <p className="text-sm">{ctx.data.context || 'Not set'}</p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Selected Agent</p>
          <p className="text-sm">
            {agents.find(a => a.id === ctx.data.agentId)?.name || 'No agent selected'}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Offer Details</p>
          <div className="text-sm space-y-1">
            <p><span className="font-medium">Product:</span> {ctx.data.offer.product || 'Not set'}</p>
            <p><span className="font-medium">Pricing:</span> {ctx.data.offer.pricing || 'Not set'}</p>
            <p><span className="font-medium">CTA:</span> {ctx.data.offer.cta.primary || 'Not set'}</p>
          </div>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Email Templates</p>
          <div className="text-sm">
            {ctx.data.templates.length > 0 ? (
              <div className="space-y-1">
                <p>{ctx.data.templates.length} templates generated</p>
                <div className="text-xs text-gray-500">
                  {ctx.data.templates.map((t: any, i: number) => (
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
            {ctx.data.schedule.totalEmails} emails, {ctx.data.schedule.daysBetweenEmails} days apart
          </p>
          <p className="text-xs text-gray-500 mt-1">
            AI takes over if lead replies to any email
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded">
          <p className="text-sm font-medium text-gray-600">Start Date</p>
          <p className="text-sm">{ctx.data.schedule.startDate || 'Not set'}</p>
        </div>
      </div>
    </div>
  );
};