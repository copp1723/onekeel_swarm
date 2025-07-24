import React, { useState } from 'react';
import { AgentTemplate } from '@/types';
import { useAgentTemplates } from '@/hooks/useAgentTemplates';
import { useAgents } from '@/hooks/useAgents';
import { AgentTemplateList, AgentTemplateDetails, AgentTemplateConfigurator } from '@/components/shared/agent-templates';
import { Button } from '@/components/ui/button';
import { Brain, Loader2 } from 'lucide-react';

export function AgentTemplatesView() {
  const { templates, loading, error, cloneTemplate } = useAgentTemplates();
  const { createAgent } = useAgents();
  
  const [selectedTemplate, setSelectedTemplate] = useState<AgentTemplate | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'configure'>('list');
  
  const handleUseTemplate = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setViewMode('configure');
  };
  
  const handleViewDetails = (template: AgentTemplate) => {
    setSelectedTemplate(template);
    setViewMode('details');
  };
  
  const handleCloneTemplate = async (template: AgentTemplate) => {
    try {
      const clonedTemplate = await cloneTemplate(template.id);
      if (clonedTemplate) {
        // Show success message or notification
      }
    } catch (err) {
      console.error('Failed to clone template:', err);
    }
  };
  
  const handleCreateAgent = async (name: string, paramValues: Record<string, string>) => {
    if (!selectedTemplate) return;
    
    try {
      await createAgent({
        name,
        type: selectedTemplate.type,
        systemPrompt: selectedTemplate.systemPrompt,
        temperature: selectedTemplate.temperature,
        maxTokens: selectedTemplate.maxTokens,
        metadata: {
          createdFromTemplate: selectedTemplate.id,
          templateParams: paramValues
        }
      });
      
      // Reset view
      setViewMode('list');
      setSelectedTemplate(null);
    } catch (err) {
      console.error('Failed to create agent:', err);
      throw err;
    }
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="bg-red-50 p-4 rounded-md text-red-600">
          <p>Error loading templates: {error}</p>
          <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      );
    }
    
    switch (viewMode) {
      case 'details':
        return selectedTemplate ? (
          <AgentTemplateDetails
            template={selectedTemplate}
            onClose={() => {
              setViewMode('list');
              setSelectedTemplate(null);
            }}
            onUse={handleUseTemplate}
            onClone={handleCloneTemplate}
          />
        ) : null;
        
      case 'configure':
        return selectedTemplate ? (
          <AgentTemplateConfigurator
            template={selectedTemplate}
            onClose={() => {
              setViewMode('list');
              setSelectedTemplate(null);
            }}
            onSave={handleCreateAgent}
          />
        ) : null;
        
      case 'list':
      default:
        return (
          <AgentTemplateList
            templates={templates}
            onUseTemplate={handleUseTemplate}
            onCloneTemplate={handleCloneTemplate}
            onViewTemplateDetails={handleViewDetails}
          />
        );
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Brain className="mr-2 h-6 w-6" />
            Agent Templates
          </h1>
          <p className="text-gray-500">
            Preconfigured agent templates with sophisticated system prompts
          </p>
        </div>
        
        {viewMode !== 'list' && (
          <Button
            variant="outline"
            onClick={() => {
              setViewMode('list');
              setSelectedTemplate(null);
            }}
          >
            Back to Templates
          </Button>
        )}
      </div>
      
      {renderContent()}
    </div>
  );
}

export default AgentTemplatesView;