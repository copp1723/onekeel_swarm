import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentTemplate, AgentType } from '@/types';
import { Copy, Zap, Settings } from 'lucide-react';
import { getAgentTypeIcon, getAgentTypeColor } from '@/utils/agentUtils';

interface AgentTemplateCardProps {
  template: AgentTemplate;
  onUse: (template: AgentTemplate) => void;
  onClone: (template: AgentTemplate) => void;
  onViewDetails: (template: AgentTemplate) => void;
}

export function AgentTemplateCard({ template, onUse, onClone, onViewDetails }: AgentTemplateCardProps) {
  const agentTypeIcon = getAgentTypeIcon(template.type as AgentType);
  const agentTypeColorClass = getAgentTypeColor(template.type as AgentType);
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="text-xl">{agentTypeIcon}</span>
            <CardTitle className="text-lg">{template.name}</CardTitle>
          </div>
          {template.isDefault && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              Default
            </Badge>
          )}
        </div>
        <CardDescription className="line-clamp-2">{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {template.category}
            </Badge>
            <Badge variant="outline" className={agentTypeColorClass}>
              {template.type}
            </Badge>
          </div>
          
          {template.configurableParams.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">Configurable Parameters:</p>
              <div className="flex flex-wrap gap-1">
                {template.configurableParams.map((param) => (
                  <Badge key={param} variant="outline" className="text-xs">
                    {param}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" onClick={() => onClone(template)}>
          <Copy className="h-4 w-4 mr-1" />
          Clone
        </Button>
        <div className="space-x-2">
          <Button variant="outline" size="sm" onClick={() => onViewDetails(template)}>
            <Settings className="h-4 w-4 mr-1" />
            Details
          </Button>
          <Button size="sm" onClick={() => onUse(template)}>
            <Zap className="h-4 w-4 mr-1" />
            Use
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default AgentTemplateCard;