import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  X, 
  Brain, 
  Target, 
  MessageSquare, 
  Sparkles,
  CheckCircle,
  XCircle,
  Info,
  Wand2
} from 'lucide-react';

interface AgentConfiguratorProps {
  agent?: any;
  onSave: (agent: any) => void;
  onCancel: () => void;
}

export function AgentConfigurator({ agent, onSave, onCancel }: AgentConfiguratorProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    endGoal: '',
    instructions: {
      dos: [''],
      donts: ['']
    },
    domainExpertise: [''],
    personality: 'professional',
    tone: 'friendly',
    isActive: true,
    settings: {
      maxEmailsPerDay: 100,
      followUpDelay: 24,
      enableAutoResponse: true,
      workingHours: {
        start: '09:00',
        end: '17:00',
        timezone: 'America/New_York'
      },
      handoverRules: {
        buyingSignals: [
          'ready to purchase',
          'what is the price',
          'can we schedule a demo',
          'I want to buy',
          'how much does it cost'
        ],
        escalationPhrases: [
          'speak to a human',
          'talk to someone',
          'not a bot',
          'real person',
          'manager'
        ]
      }
    }
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        ...agent,
        instructions: {
          dos: agent.instructions?.dos || [''],
          donts: agent.instructions?.donts || ['']
        },
        domainExpertise: agent.domainExpertise || [''],
        settings: {
          maxEmailsPerDay: agent.settings?.maxEmailsPerDay || 100,
          followUpDelay: agent.settings?.followUpDelay || 24,
          enableAutoResponse: agent.settings?.enableAutoResponse ?? true,
          workingHours: agent.settings?.workingHours || {
            start: '09:00',
            end: '17:00',
            timezone: 'America/New_York'
          },
          handoverRules: agent.settings?.handoverRules || {
            buyingSignals: [
              'ready to purchase',
              'what is the price',
              'can we schedule a demo',
              'I want to buy',
              'how much does it cost'
            ],
            escalationPhrases: [
              'speak to a human',
              'talk to someone',
              'not a bot',
              'real person',
              'manager'
            ]
          }
        }
      });
    }
  }, [agent]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value
      }
    }));
  };

  const handleWorkingHoursChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        workingHours: {
          ...prev.settings.workingHours,
          [field]: value
        }
      }
    }));
  };

  const handleInstructionChange = (type: 'dos' | 'donts', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      instructions: {
        ...prev.instructions,
        [type]: prev.instructions[type].map((item, i) => i === index ? value : item)
      }
    }));
  };

  const addInstruction = (type: 'dos' | 'donts') => {
    setFormData(prev => ({
      ...prev,
      instructions: {
        ...prev.instructions,
        [type]: [...prev.instructions[type], '']
      }
    }));
  };

  const removeInstruction = (type: 'dos' | 'donts', index: number) => {
    setFormData(prev => ({
      ...prev,
      instructions: {
        ...prev.instructions,
        [type]: prev.instructions[type].filter((_, i) => i !== index)
      }
    }));
  };

  const handleExpertiseChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: prev.domainExpertise.map((item, i) => i === index ? value : item)
    }));
  };

  const addExpertise = () => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: [...prev.domainExpertise, '']
    }));
  };

  const removeExpertise = (index: number) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: prev.domainExpertise.filter((_, i) => i !== index)
    }));
  };

  const enhancePrompt = (field: string) => {
    // AI-powered prompt enhancement
    if (field === 'role') {
      const enhancedRole = formData.role + (formData.role ? '\n\n' : '') + 
        'Expert Sales Development Representative specializing in personalized outreach, ' +
        'relationship building, and converting cold leads into qualified opportunities ' +
        'through intelligent conversation and value-driven messaging.';
      handleInputChange('role', enhancedRole);
    } else if (field === 'endGoal') {
      const enhancedGoal = 
        'Schedule qualified demo calls with decision-makers who have expressed genuine interest ' +
        'in our solution. Focus on quality over quantity, ensuring each handover represents ' +
        'a real opportunity with budget, authority, need, and timeline clearly identified.';
      handleInputChange('endGoal', enhancedGoal);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clean up empty instructions and expertise
    const cleanedData = {
      ...formData,
      instructions: {
        dos: formData.instructions.dos.filter(d => d.trim() !== ''),
        donts: formData.instructions.donts.filter(d => d.trim() !== '')
      },
      domainExpertise: formData.domainExpertise.filter(e => e.trim() !== '')
    };

    onSave(cleanedData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>{agent ? 'Edit' : 'Create'} Email Agent</span>
          </CardTitle>
          <CardDescription>
            Configure an AI agent with specific goals, instructions, and expertise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Agent Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Sales Specialist"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="role">Role/Title</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => enhancePrompt('role')}
                  className="h-7 px-2"
                >
                  <Wand2 className="h-3 w-3 mr-1" />
                  Enhance
                </Button>
              </div>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="e.g., Senior Account Executive"
                required
              />
            </div>
          </div>

          {/* End Goal */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="endGoal" className="flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Campaign End Goal</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => enhancePrompt('endGoal')}
                className="h-7 px-2"
              >
                <Wand2 className="h-3 w-3 mr-1" />
                AI Suggest
              </Button>
            </div>
            <Textarea
              id="endGoal"
              value={formData.endGoal}
              onChange={(e) => handleInputChange('endGoal', e.target.value)}
              placeholder="e.g., Schedule qualified leads for product demos and convert them into paying customers"
              rows={3}
              required
            />
            <p className="text-sm text-gray-500">
              Define the specific outcome this agent should achieve through email conversations
            </p>
          </div>

          {/* Instructions - Do's */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Instructions - Do's</span>
            </Label>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Common examples:</p>
              <div className="flex flex-wrap gap-2">
                {['Personalize emails with customer name', 'Focus on benefits, not features', 'Ask open-ended questions', 'Follow up within 24 hours', 'Use friendly, professional tone'].map((suggestion) => (
                  <Badge 
                    key={suggestion}
                    variant="outline" 
                    className="cursor-pointer hover:bg-green-50 text-xs"
                    onClick={() => {
                      if (!formData.instructions.dos.includes(suggestion)) {
                        setFormData(prev => ({
                          ...prev,
                          instructions: {
                            ...prev.instructions,
                            dos: [...prev.instructions.dos.filter(d => d), suggestion]
                          }
                        }));
                      }
                    }}
                  >
                    + {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {formData.instructions.dos.map((instruction, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={instruction}
                    onChange={(e) => handleInstructionChange('dos', index, e.target.value)}
                    placeholder="e.g., Personalize emails based on lead's industry"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction('dos', index)}
                    disabled={formData.instructions.dos.length === 1}
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
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Do Instruction
              </Button>
            </div>
          </div>

          {/* Instructions - Don'ts */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>Instructions - Don'ts</span>
            </Label>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Common examples:</p>
              <div className="flex flex-wrap gap-2">
                {['Use aggressive sales tactics', 'Send more than 3 follow-ups', 'Ignore customer objections', 'Use industry jargon', 'Push for immediate decisions'].map((suggestion) => (
                  <Badge 
                    key={suggestion}
                    variant="outline" 
                    className="cursor-pointer hover:bg-red-50 text-xs"
                    onClick={() => {
                      if (!formData.instructions.donts.includes(suggestion)) {
                        setFormData(prev => ({
                          ...prev,
                          instructions: {
                            ...prev.instructions,
                            donts: [...prev.instructions.donts.filter(d => d), suggestion]
                          }
                        }));
                      }
                    }}
                  >
                    + {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {formData.instructions.donts.map((instruction, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={instruction}
                    onChange={(e) => handleInstructionChange('donts', index, e.target.value)}
                    placeholder="e.g., Don't use aggressive sales tactics"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction('donts', index)}
                    disabled={formData.instructions.donts.length === 1}
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
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Don't Instruction
              </Button>
            </div>
          </div>

          {/* Domain Expertise */}
          <div className="space-y-2">
            <Label className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4" />
              <span>Domain Expertise</span>
            </Label>
            <div className="mb-3">
              <p className="text-sm text-gray-500 mb-2">Quick suggestions:</p>
              <div className="flex flex-wrap gap-2">
                {['Auto Financing', 'Subprime Credit', 'Vehicle Sales', 'Customer Service', 'Lead Qualification', 'B2B Sales', 'Credit Analysis'].map((suggestion) => (
                  <Badge 
                    key={suggestion}
                    variant="outline" 
                    className="cursor-pointer hover:bg-blue-50 text-xs"
                    onClick={() => {
                      if (!formData.domainExpertise.includes(suggestion)) {
                        setFormData(prev => ({
                          ...prev,
                          domainExpertise: [...prev.domainExpertise.filter(e => e), suggestion]
                        }));
                      }
                    }}
                  >
                    + {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {formData.domainExpertise.map((expertise, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={expertise}
                    onChange={(e) => handleExpertiseChange(index, e.target.value)}
                    placeholder="e.g., Auto Financing, Credit Analysis, Customer Service"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeExpertise(index)}
                    disabled={formData.domainExpertise.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExpertise}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expertise Area
              </Button>
            </div>
          </div>

          {/* Personality & Tone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="personality">Personality</Label>
              <Select
                value={formData.personality}
                onValueChange={(value) => handleInputChange('personality', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="consultative">Consultative</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Communication Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(value) => handleInputChange('tone', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Advanced Settings</span>
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxEmailsPerDay">Max Emails per Day</Label>
                  <Input
                    id="maxEmailsPerDay"
                    type="number"
                    value={formData.settings.maxEmailsPerDay}
                    onChange={(e) => handleSettingsChange('maxEmailsPerDay', parseInt(e.target.value))}
                    min="1"
                    max="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="followUpDelay">Follow-up Delay (hours)</Label>
                  <Input
                    id="followUpDelay"
                    type="number"
                    value={formData.settings.followUpDelay}
                    onChange={(e) => handleSettingsChange('followUpDelay', parseInt(e.target.value))}
                    min="1"
                    max="168"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.settings.enableAutoResponse}
                  onCheckedChange={(checked) => handleSettingsChange('enableAutoResponse', checked)}
                />
                <Label>Enable automatic responses to replies</Label>
              </div>

              <div className="space-y-2">
                <Label>Working Hours</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="text-sm">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.settings.workingHours.start}
                      onChange={(e) => handleWorkingHoursChange('start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="text-sm">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.settings.workingHours.end}
                      onChange={(e) => handleWorkingHoursChange('end', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm">Timezone</Label>
                    <Select
                      value={formData.settings.workingHours.timezone}
                      onValueChange={(value) => handleWorkingHoursChange('timezone', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern</SelectItem>
                        <SelectItem value="America/Chicago">Central</SelectItem>
                        <SelectItem value="America/Denver">Mountain</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => handleInputChange('isActive', checked)}
                />
                <Label>Agent is active</Label>
              </div>
            </div>

            {/* Handover Rules */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Handover Rules</span>
              </h4>
              <p className="text-sm text-gray-500">
                Define phrases that indicate when to hand over the conversation to a human agent
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Buying Signals</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Phrases that indicate the lead is ready to make a purchase
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.settings.handoverRules.buyingSignals.map((signal, idx) => (
                      <Badge key={idx} variant="secondary" className="pr-1">
                        {signal}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                handoverRules: {
                                  ...prev.settings.handoverRules,
                                  buyingSignals: prev.settings.handoverRules.buyingSignals.filter((_, i) => i !== idx)
                                }
                              }
                            }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add buying signal phrase..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              handoverRules: {
                                ...prev.settings.handoverRules,
                                buyingSignals: [...prev.settings.handoverRules.buyingSignals, input.value.trim()]
                              }
                            }
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Escalation Phrases</Label>
                  <p className="text-xs text-gray-500 mb-2">
                    Phrases that indicate the lead wants to speak with a human
                  </p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.settings.handoverRules.escalationPhrases.map((phrase, idx) => (
                      <Badge key={idx} variant="secondary" className="pr-1">
                        {phrase}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                handoverRules: {
                                  ...prev.settings.handoverRules,
                                  escalationPhrases: prev.settings.handoverRules.escalationPhrases.filter((_, i) => i !== idx)
                                }
                              }
                            }));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  <Input
                    placeholder="Add escalation phrase..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              handoverRules: {
                                ...prev.settings.handoverRules,
                                escalationPhrases: [...prev.settings.handoverRules.escalationPhrases, input.value.trim()]
                              }
                            }
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    When these phrases are detected, the agent will stop the campaign and notify the human team for immediate follow-up.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {agent ? 'Update' : 'Create'} Agent
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}