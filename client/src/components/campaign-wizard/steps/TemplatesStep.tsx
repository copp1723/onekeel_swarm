import React, { useState } from 'react';
import { Brain, Mail, Wand2, Library, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateTemplates } from '../hooks/useEmailTemplates';
import { WizardContext, EmailTemplate } from '../types';
import { TemplateSelector } from '@/components/templates/TemplateSelector';
import { useNavigate } from 'react-router-dom';

export const TemplatesStep: React.FC<{ctx: WizardContext}> = ({ ctx }) => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<'generate' | 'library'>('generate');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const handleTemplatesFromLibrary = (templates: any[]) => {
    // Convert library templates to campaign templates format
    const campaignTemplates: EmailTemplate[] = templates.map((template, index) => ({
      id: template.id,
      subject: template.subject || '',
      body: template.content,
      order: index,
      daysSinceStart: index * ctx.data.schedule.daysBetweenEmails,
      previewText: template.description,
      personalizationTokens: template.variables
    }));

    ctx.setData(prev => ({
      ...prev,
      templates: campaignTemplates
    }));
  };

  const openTemplateLibrary = () => {
    // Open template library in a new tab/window
    window.open('/templates', '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h4 className="font-medium text-purple-900">Campaign Templates</h4>
        </div>
        <p className="text-sm text-purple-700">
          Choose how to create your campaign templates - generate with AI or select from your library.
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={(value: 'generate' | 'library') => setSelectedTab(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate" className="flex items-center space-x-2">
            <Wand2 className="h-4 w-4" />
            <span>AI Generate</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="flex items-center space-x-2">
            <Library className="h-4 w-4" />
            <span>Template Library</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
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
                  Generate {ctx.data.schedule.totalEmails} Email Templates
                </Button>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Brain className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">How AI Templates Work</p>
                    <p className="text-blue-700 mt-1">
                      AI will create {ctx.data.schedule.totalEmails} progressive emails based on your offer, 
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
                        <Badge variant="outline">Day {index * ctx.data.schedule.daysBetweenEmails + 1}</Badge>
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
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">
              Select templates from your library to use in this campaign
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={openTemplateLibrary}
            >
              <Plus className="h-4 w-4 mr-2" />
              Manage Library
            </Button>
          </div>

          <TemplateSelector
            channel={ctx.data.channels.includes('email') ? 'email' : 'sms'}
            selectedTemplates={selectedTemplateIds}
            onTemplateSelect={setSelectedTemplateIds}
            onTemplatesApply={handleTemplatesFromLibrary}
            maxSelection={ctx.data.schedule.totalEmails}
            allowMultiple={true}
          />

          {ctx.data.templates.length > 0 && selectedTab === 'library' && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <span className="font-medium">{ctx.data.templates.length} templates</span> selected from library
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Template Summary */}
      {ctx.data.templates.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Template Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Templates:</span>
              <span className="font-medium">{ctx.data.templates.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Campaign Duration:</span>
              <span className="font-medium">
                {(ctx.data.templates.length - 1) * ctx.data.schedule.daysBetweenEmails} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Template Source:</span>
              <Badge variant="outline" className="text-xs">
                {selectedTab === 'generate' ? 'AI Generated' : 'Template Library'}
              </Badge>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};