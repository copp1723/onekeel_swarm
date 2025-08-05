import React from 'react';
import { Brain, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WizardContext } from '../types';

export const ScheduleStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
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
            value={ctx.data.schedule.totalMessages}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
            value={ctx.data.schedule.daysBetweenMessages}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => ctx.setData((prev) => ({
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
};