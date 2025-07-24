import React from 'react';
import { AgentTemplate } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, X, Zap } from 'lucide-react';
import { formatAgentType } from '@/utils/agentUtils';

interface AgentTemplateDetailsProps {
  template: AgentTemplate;
  onClose: () => void;
  onUse: (template: AgentTemplate) => void;
  onClone: (template: AgentTemplate) => void;
}

export function AgentTemplateDetails({ template, onClose, onUse, onClone }: AgentTemplateDetailsProps) {
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center space-x-2">
              <CardTitle>{template.name}</CardTitle>
              {template.isDefault && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Default
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1">{template.description}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="capitalize">
            {template.category}
          </Badge>
          <Badge variant="outline">
            {formatAgentType(template.type)}
          </Badge>
          <Badge variant="outline" className="bg-gray-50">
            Temperature: {template.temperature / 10}
          </Badge>
          <Badge variant="outline" className="bg-gray-50">
            Max Tokens: {template.maxTokens}
          </Badge>
        </div>
        
        {template.configurableParams.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Configurable Parameters</h3>
            <div className="flex flex-wrap gap-2">
              {template.configurableParams.map(param => (
                <Badge key={param} variant="outline">
                  {param}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div>
          <h3 className="text-sm font-medium mb-2">System Prompt</h3>
          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-80">
            <pre className="text-sm whitespace-pre-wrap">{template.systemPrompt}</pre>
          </div>
        </div>
        
        {template.contextNote && (
          <div>
            <h3 className="text-sm font-medium mb-2">Context Note</h3>
            <p className="text-sm text-gray-700">{template.contextNote}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => onClone(template)}>
          <Copy className="h-4 w-4 mr-2" />
          Clone Template
        </Button>
        <Button onClick={() => onUse(template)}>
          <Zap className="h-4 w-4 mr-2" />
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
}

export default AgentTemplateDetails;