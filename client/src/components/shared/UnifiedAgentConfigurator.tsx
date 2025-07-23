import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { UnifiedAgentConfig, AgentType } from '@/types';
import { 
  AGENT_TYPES, 
  PERSONALITY_OPTIONS, 
  TONE_OPTIONS, 
  RESPONSE_LENGTH_OPTIONS,
  getDefaultConfigForType,
  validateAgentConfig,
  cleanAgentConfig
} from '@/utils/agentUtils';
import {
  Brain,
  User,
  Target,
  BookOpen,
  MessageSquare,
  Zap,
  Settings,
  Plus,
  X,
  Info,
  Save,
  AlertCircle
} from 'lucide-react';

interface UnifiedAgentConfiguratorProps {
  agent?: UnifiedAgentConfig | null;
  onSave: (agent: UnifiedAgentConfig) => Promise<void>;
  onCancel: () => void;
  allowTypeChange?: boolean;
}

export function UnifiedAgentConfigurator({ 
  agent, 
  onSave, 
  onCancel, 
  allowTypeChange = true 
}: UnifiedAgentConfiguratorProps) {
  const [formData, setFormData] = useState<Partial<UnifiedAgentConfig>>(() => {
    if (agent) return agent;
    return {
      name: '',
      type: 'email',
      ...getDefaultConfigForType('email')
    };
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to get instructions as object
  const getInstructionsAsObject = (instructions: string[] | { dos?: string[]; donts?: string[]; } | undefined): { dos: string[]; donts: string[]; } => {
    if (!instructions) return { dos: [], donts: [] };
    if (Array.isArray(instructions)) return { dos: [], donts: [] };
    return { dos: instructions.dos || [], donts: instructions.donts || [] };
  };

  useEffect(() => {
    if (agent) {
      setFormData(agent);
    }
  }, [agent]);

  const handleTypeChange = (newType: AgentType) => {
    const defaultConfig = getDefaultConfigForType(newType);
    setFormData(prev => ({
      ...prev,
      type: newType,
      ...defaultConfig,
      // Preserve user-entered basic info
      name: prev.name,
      // Reset type-specific fields to defaults
      role: defaultConfig.role,
      endGoal: defaultConfig.endGoal,
      instructions: defaultConfig.instructions,
      domainExpertise: defaultConfig.domainExpertise,
      personality: defaultConfig.personality,
      tone: defaultConfig.tone,
      responseLength: defaultConfig.responseLength,
      temperature: defaultConfig.temperature,
      maxTokens: defaultConfig.maxTokens
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateAgentConfig(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    
    try {
      const cleanedData = cleanAgentConfig(formData);
      await onSave(cleanedData);
    } catch (error) {
      console.error('Failed to save agent:', error);
      setErrors({ submit: 'Failed to save agent. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addInstruction = (type: 'dos' | 'donts') => {
    setFormData(prev => {
      const currentInstructions = getInstructionsAsObject(prev.instructions);
      return {
        ...prev,
        instructions: {
          ...currentInstructions,
          [type]: [...currentInstructions[type], '']
        }
      };
    });
  };

  const updateInstruction = (type: 'dos' | 'donts', index: number, value: string) => {
    setFormData(prev => {
      const currentInstructions = getInstructionsAsObject(prev.instructions);
      return {
        ...prev,
        instructions: {
          ...currentInstructions,
          [type]: currentInstructions[type].map((item: string, i: number) => i === index ? value : item)
        }
      };
    });
  };

  const removeInstruction = (type: 'dos' | 'donts', index: number) => {
    setFormData(prev => {
      const currentInstructions = getInstructionsAsObject(prev.instructions);
      return {
        ...prev,
        instructions: {
          ...currentInstructions,
          [type]: currentInstructions[type].filter((_: string, i: number) => i !== index)
        }
      };
    });
  };

  const addDomainExpertise = () => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: [...(prev.domainExpertise || []), '']
    }));
  };

  const updateDomainExpertise = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: prev.domainExpertise!.map((item, i) => i === index ? value : item)
    }));
  };

  const removeDomainExpertise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: prev.domainExpertise!.filter((_, i) => i !== index)
    }));
  };

  const selectedAgentType = AGENT_TYPES.find(type => type.value === formData.type);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>{agent ? 'Edit' : 'Create'} AI Agent</span>
          </CardTitle>
          <CardDescription>
            Configure your AI agent's basic information and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errors.submit && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errors.submit}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Professional Sales Agent"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Agent Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: AgentType) => handleTypeChange(value)}
                disabled={!allowTypeChange && !!agent}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select agent type" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-gray-500">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedAgentType && (
                <p className="text-xs text-gray-600">{selectedAgentType.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Input
                id="role"
                value={formData.role || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                placeholder="e.g., Sales Specialist"
                className={errors.role ? 'border-red-500' : ''}
              />
              {errors.role && (
                <p className="text-sm text-red-600 flex items-center space-x-1">
                  <AlertCircle className="h-3 w-3" />
                  <span>{errors.role}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="active">Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active || false}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                />
                <span className="text-sm text-gray-600">
                  {formData.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="endGoal">End Goal *</Label>
            <Textarea
              id="endGoal"
              value={formData.endGoal || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, endGoal: e.target.value }))}
              placeholder="Describe what this agent should ultimately achieve..."
              rows={2}
              className={errors.endGoal ? 'border-red-500' : ''}
            />
            {errors.endGoal && (
              <p className="text-sm text-red-600 flex items-center space-x-1">
                <AlertCircle className="h-3 w-3" />
                <span>{errors.endGoal}</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personality & Behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Personality & Behavior</span>
          </CardTitle>
          <CardDescription>
            Define how your agent communicates and responds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="personality">Personality</Label>
              <Select
                value={typeof formData.personality === 'object' ? formData.personality?.style : formData.personality}
                onValueChange={(value) => setFormData(prev => ({ ...prev, personality: { tone: value, style: value, traits: [] } }))}
              >
                <SelectTrigger id="personality">
                  <SelectValue placeholder="Select personality" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PERSONALITY_OPTIONS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <div className="flex flex-col">
                        <span>{label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tone: value as any }))}
              >
                <SelectTrigger id="tone">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseLength">Response Length</Label>
              <Select
                value={formData.responseLength}
                onValueChange={(value) => setFormData(prev => ({ ...prev, responseLength: value as any }))}
              >
                <SelectTrigger id="responseLength">
                  <SelectValue placeholder="Select length" />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSE_LENGTH_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Instructions</span>
          </CardTitle>
          <CardDescription>
            Define what your agent should and shouldn't do
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errors.instructions && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errors.instructions}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Do's */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-green-600" />
                <Label className="text-green-700 font-medium">Do's</Label>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  {getInstructionsAsObject(formData.instructions).dos.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {getInstructionsAsObject(formData.instructions).dos.map((instruction: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={instruction}
                      onChange={(e) => updateInstruction('dos', index, e.target.value)}
                      placeholder="What should the agent do?"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstruction('dos', index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addInstruction('dos')}
                  className="w-full text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Do
                </Button>
              </div>
            </div>

            {/* Don'ts */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <X className="h-4 w-4 text-red-600" />
                <Label className="text-red-700 font-medium">Don'ts</Label>
                <Badge variant="outline" className="text-red-600 border-red-200">
                  {getInstructionsAsObject(formData.instructions).donts.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {getInstructionsAsObject(formData.instructions).donts.map((instruction: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={instruction}
                      onChange={(e) => updateInstruction('donts', index, e.target.value)}
                      placeholder="What should the agent avoid?"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstruction('donts', index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addInstruction('donts')}
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Don't
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Domain Expertise */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Domain Expertise</span>
          </CardTitle>
          <CardDescription>
            Areas of knowledge and specialization for this agent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label>Expertise Areas</Label>
              <Badge variant="outline">
                {formData.domainExpertise?.length || 0}
              </Badge>
            </div>

            <div className="space-y-2">
              {formData.domainExpertise?.map((expertise, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={expertise}
                    onChange={(e) => updateDomainExpertise(index, e.target.value)}
                    placeholder="e.g., Email Marketing, Lead Generation"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDomainExpertise(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDomainExpertise}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expertise Area
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Advanced Settings</span>
          </CardTitle>
          <CardDescription>
            Fine-tune AI model parameters and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature: {formData.temperature}%
                </Label>
                <Slider
                  id="temperature"
                  min={0}
                  max={100}
                  step={5}
                  value={[formData.temperature || 70]}
                  onValueChange={([value]: number[]) => setFormData(prev => ({ ...prev, temperature: value }))}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Lower = more focused, Higher = more creative
                </p>
                {errors.temperature && (
                  <p className="text-sm text-red-600">{errors.temperature}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min={50}
                  max={4000}
                  value={formData.maxTokens || 500}
                  onChange={(e) => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 500 }))}
                  className={errors.maxTokens ? 'border-red-500' : ''}
                />
                <p className="text-xs text-gray-500">
                  Maximum response length (50-4000 tokens)
                </p>
                {errors.maxTokens && (
                  <p className="text-sm text-red-600">{errors.maxTokens}</p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="apiModel">API Model (Optional)</Label>
                <Select
                  value={formData.apiModel || 'default'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, apiModel: value === 'default' ? undefined : value }))}
                >
                  <SelectTrigger id="apiModel">
                    <SelectValue placeholder="Use default model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Use default model</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Override the default AI model for this agent
                </p>
              </div>

              {selectedAgentType && (
                <div className="space-y-2">
                  <Label>Capabilities</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedAgentType.capabilities.email && (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <span>📧</span>
                        <span>Email</span>
                      </Badge>
                    )}
                    {selectedAgentType.capabilities.sms && (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <span>📱</span>
                        <span>SMS</span>
                      </Badge>
                    )}
                    {selectedAgentType.capabilities.chat && (
                      <Badge variant="outline" className="flex items-center space-x-1">
                        <span>💬</span>
                        <span>Chat</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    Communication channels this agent can use
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {agent ? 'Update' : 'Create'} Agent
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
