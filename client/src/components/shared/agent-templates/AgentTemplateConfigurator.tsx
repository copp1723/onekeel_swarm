import React, { useState, useEffect } from 'react';
import type { AgentTemplate } from '@/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Save, X } from 'lucide-react';

interface AgentTemplateConfiguratorProps {
  template: AgentTemplate;
  onClose: () => void;
  onSave: (name: string, paramValues: Record<string, string>) => Promise<void>;
}

export function AgentTemplateConfigurator({ template, onClose, onSave }: AgentTemplateConfiguratorProps) {
  const [name, setName] = useState(template.name);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize param values with defaults
  useEffect(() => {
    if (template.defaultParams) {
      setParamValues(template.defaultParams);
    }
  }, [template]);
  
  const handleParamChange = (param: string, value: string) => {
    setParamValues(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      await onSave(name, paramValues);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Preview system prompt with parameter values
  const previewSystemPrompt = () => {
    let preview = template.systemPrompt;
    
    Object.entries(paramValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      preview = preview.replace(regex, value);
    });
    
    return preview;
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Configure Agent from Template</CardTitle>
              <CardDescription className="mt-1">
                Customize the template parameters to create your agent
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} type="button">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 p-3 rounded-md text-red-600 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="agent-name">Agent Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a name for your agent"
              required
            />
          </div>
          
          {template.configurableParams.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Template Parameters</h3>
              
              {template.configurableParams.map(param => (
                <div key={param} className="space-y-2">
                  <Label htmlFor={`param-${param}`}>{param.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Label>
                  {param.includes('info') || param.includes('voice') || param.includes('approach') || param.includes('audience') ? (
                    <Textarea
                      id={`param-${param}`}
                      value={paramValues[param] || ''}
                      onChange={(e) => handleParamChange(param, e.target.value)}
                      placeholder={`Enter ${param.replace(/_/g, ' ')}`}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={`param-${param}`}
                      value={paramValues[param] || ''}
                      onChange={(e) => handleParamChange(param, e.target.value)}
                      placeholder={`Enter ${param.replace(/_/g, ' ')}`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Preview System Prompt</Label>
            <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-80">
              <pre className="text-sm whitespace-pre-wrap">{previewSystemPrompt()}</pre>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Agent
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export default AgentTemplateConfigurator;