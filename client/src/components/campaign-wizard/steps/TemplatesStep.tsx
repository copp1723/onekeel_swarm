import React from 'react';
import { Brain, Mail, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { generateTemplates } from '../hooks/useEmailTemplates';
import type { WizardContext, EmailTemplate } from '../types';

export const TemplatesStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
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
      
      {ctx.data.templates.length === 0 ? (
        <div className="space-y-4">
          <div className="text-center py-8">
            <Mail className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No templates generated yet</p>
            <Button 
              onClick={() => generateTemplates(ctx.data, ctx.setData)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Generate {ctx.data.schedule.totalMessages} Email Templates
            </Button>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-start space-x-2">
              <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900">How AI Templates Work</p>
                <p className="text-blue-700 mt-1">
                  AI will create {ctx.data.schedule.totalMessages} progressive emails based on your offer, 
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
            <h4 className="font-medium">Generated Templates ({ctx.data.templates.length})</h4>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => generateTemplates(ctx.data, ctx.setData)}
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>
          
          <div className="space-y-3">
            {ctx.data.templates.map((template: EmailTemplate, index: number) => (
              <Card key={index} className="border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Email {index + 1}</CardTitle>
                    <Badge variant="outline">Day {index * ctx.data.schedule.daysBetweenMessages + 1}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">Subject Line</Label>
                    <p className="text-sm font-medium">{template.subject}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Preview</Label>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {template.body.substring(0, 150)}...
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};