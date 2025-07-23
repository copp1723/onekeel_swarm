import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { 
  Mail, 
  Brain, 
  FileText, 
  Calendar,
  X,
  ChevronRight,
  Target,
  Clock,
  Settings
} from 'lucide-react';

interface CampaignEditorProps {
  campaign?: any;
  agents: any[];
  onSave: (campaign: any) => void;
  onCancel: () => void;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  category: string;
}

interface Schedule {
  id: string;
  name: string;
  attempts: any[];
}

export function CampaignEditor({ campaign, agents, onSave, onCancel }: CampaignEditorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    agentId: '',
    status: 'draft',
    templates: [] as string[],
    scheduleId: '',
    audience: {
      filters: [] as any[],
      targetCount: 0
    },
    settings: {
      sendTimeOptimization: true,
      conversationMode: true,
      handoverGoal: '',
      handoverKeywords: [] as string[],
      dailyLimit: 100,
      timezone: 'recipient',
      followUpSchedule: {
        totalEmails: 5,
        daysBetweenEmails: 3,
        enabled: true
      },
      handoverFollowUp: {
        enabled: false,
        daysAfterHandover: 7,
        maxAttempts: 2,
        daysBetweenAttempts: 3
      }
    }
  });

  useEffect(() => {
    loadData();
    if (campaign) {
      setFormData({
        ...campaign,
        settings: {
          sendTimeOptimization: campaign.settings?.sendTimeOptimization ?? true,
          conversationMode: campaign.settings?.conversationMode ?? true,
          handoverGoal: campaign.settings?.handoverGoal || '',
          handoverKeywords: campaign.settings?.handoverKeywords || [],
          dailyLimit: campaign.settings?.dailyLimit || 100,
          timezone: campaign.settings?.timezone || 'recipient',
          followUpSchedule: campaign.settings?.followUpSchedule || {
            totalEmails: 5,
            daysBetweenEmails: 3,
            enabled: true
          },
          handoverFollowUp: campaign.settings?.handoverFollowUp || {
            enabled: false,
            daysAfterHandover: 7,
            maxAttempts: 2,
            daysBetweenAttempts: 3
          }
        }
      });
    }
  }, [campaign]);

  const loadData = async () => {
    try {
      const [templatesRes, schedulesRes] = await Promise.all([
        fetch('/api/email/templates'),
        fetch('/api/email/schedules')
      ]);

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data || []);
      }

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleTemplateToggle = (templateId: string) => {
    setFormData(prev => ({
      ...prev,
      templates: prev.templates.includes(templateId)
        ? prev.templates.filter(id => id !== templateId)
        : [...prev.templates, templateId]
    }));
  };

  const selectedAgent = agents.find(a => a.id === formData.agentId);
  const selectedSchedule = schedules.find(s => s.id === formData.scheduleId);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>{campaign ? 'Edit' : 'Create'} Campaign</span>
          </CardTitle>
          <CardDescription>
            Configure your email campaign settings and content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Q4 Sales Outreach"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent">AI Agent</Label>
              <Select
                value={formData.agentId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, agentId: value }))}
              >
                <SelectTrigger id="agent">
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center space-x-2">
                        <Brain className="h-4 w-4" />
                        <span>{agent.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the campaign goals and target audience..."
              rows={3}
            />
          </div>

          {selectedAgent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">Agent Configuration</p>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>End Goal:</strong> {selectedAgent.endGoal}</p>
                <p><strong>Personality:</strong> {selectedAgent.personality?.style || 'Not set'} • {selectedAgent.tone} tone</p>
                <div className="flex items-start">
                  <strong className="mr-2">Expertise:</strong>
                  <div className="flex flex-wrap gap-1">
                    {selectedAgent.domainExpertise.map((expertise: string, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {expertise}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Email Templates</span>
          </CardTitle>
          <CardDescription>
            Select templates to use in this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => handleTemplateToggle(template.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  formData.templates.includes(template.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {template.category}
                  </Badge>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-2 text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No templates available. Create templates first.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Campaign Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Campaign Schedule</span>
          </CardTitle>
          <CardDescription>
            Choose when and how emails should be sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule">Sending Schedule</Label>
            <Select
              value={formData.scheduleId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, scheduleId: value }))}
            >
              <SelectTrigger id="schedule">
                <SelectValue placeholder="Select a schedule" />
              </SelectTrigger>
              <SelectContent>
                {schedules.map((schedule) => (
                  <SelectItem key={schedule.id} value={schedule.id}>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{schedule.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {schedule.attempts.length} attempts
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSchedule && (
            <div className="bg-gray-50 border rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Schedule Details</p>
              <div className="space-y-2">
                {selectedSchedule.attempts.map((attempt: any, idx: number) => (
                  <div key={idx} className="flex items-center text-sm">
                    <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                    <span>
                      Attempt {idx + 1}: After {attempt.delayDays} days, {attempt.delayHours} hours
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Campaign Settings</span>
          </CardTitle>
          <CardDescription>
            Fine-tune campaign behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Send Time Optimization</Label>
                <p className="text-sm text-gray-500">
                  Automatically send emails at optimal times for each recipient
                </p>
              </div>
              <Switch
                checked={formData.settings.sendTimeOptimization}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, sendTimeOptimization: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Conversation Mode</Label>
                <p className="text-sm text-gray-500">
                  Enable back-and-forth conversations until handover goal is met
                </p>
              </div>
              <Switch
                checked={formData.settings.conversationMode}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, conversationMode: checked }
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Daily Send Limit</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={formData.settings.dailyLimit}
                onChange={(e) => 
                  setFormData(prev => ({
                    ...prev,
                    settings: { ...prev.settings, dailyLimit: parseInt(e.target.value) }
                  }))
                }
                min="1"
                max="1000"
              />
              <p className="text-sm text-gray-500">
                Maximum emails to send per day from this campaign
              </p>
            </div>
          </div>

          {/* Handover Configuration */}
          {formData.settings.conversationMode && (
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium flex items-center space-x-2">
                <Target className="h-4 w-4" />
                <span>Handover Configuration</span>
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="handoverGoal">Handover Goal</Label>
                <Textarea
                  id="handoverGoal"
                  value={formData.settings.handoverGoal}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      settings: { ...prev.settings, handoverGoal: e.target.value }
                    }))
                  }
                  placeholder="e.g., Qualify they are ready to buy, Schedule a demo, Express strong interest"
                  rows={2}
                />
                <p className="text-sm text-gray-500">
                  Describe when the AI should hand over to a human agent
                </p>
              </div>

              <div className="space-y-2">
                <Label>Handover Keywords</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.settings.handoverKeywords.map((keyword, idx) => (
                    <Badge key={idx} variant="secondary" className="pr-1">
                      {keyword}
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
                              handoverKeywords: prev.settings.handoverKeywords.filter((_, i) => i !== idx)
                            }
                          }));
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="newKeyword"
                    placeholder="Add keyword (e.g., 'ready to buy', 'pricing', 'demo')"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        if (input.value.trim()) {
                          setFormData(prev => ({
                            ...prev,
                            settings: {
                              ...prev.settings,
                              handoverKeywords: [...prev.settings.handoverKeywords, input.value.trim()]
                            }
                          }));
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  Keywords that trigger immediate handover to human agent
                </p>
              </div>
            </div>
          )}

          {/* Follow-up Schedule */}
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Follow-up Schedule</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalEmails">Total Campaign Emails</Label>
                <Input
                  id="totalEmails"
                  type="number"
                  value={formData.settings.followUpSchedule.totalEmails}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        followUpSchedule: {
                          ...prev.settings.followUpSchedule,
                          totalEmails: parseInt(e.target.value)
                        }
                      }
                    }))
                  }
                  min="1"
                  max="10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="daysBetween">Days Between Emails</Label>
                <Input
                  id="daysBetween"
                  type="number"
                  value={formData.settings.followUpSchedule.daysBetweenEmails}
                  onChange={(e) => 
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        followUpSchedule: {
                          ...prev.settings.followUpSchedule,
                          daysBetweenEmails: parseInt(e.target.value)
                        }
                      }
                    }))
                  }
                  min="1"
                  max="30"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Schedule for follow-up emails if no reply is received
            </p>
          </div>

          {/* Handover Follow-up */}
          <div className="border-t pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Follow-up After Handover</Label>
                <p className="text-sm text-gray-500">
                  Check if lead was helped by human agent after handover
                </p>
              </div>
              <Switch
                checked={formData.settings.handoverFollowUp.enabled}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({
                    ...prev,
                    settings: {
                      ...prev.settings,
                      handoverFollowUp: {
                        ...prev.settings.handoverFollowUp,
                        enabled: checked
                      }
                    }
                  }))
                }
              />
            </div>
            
            {formData.settings.handoverFollowUp.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="daysAfter">Days After Handover</Label>
                  <Input
                    id="daysAfter"
                    type="number"
                    value={formData.settings.handoverFollowUp.daysAfterHandover}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          handoverFollowUp: {
                            ...prev.settings.handoverFollowUp,
                            daysAfterHandover: parseInt(e.target.value)
                          }
                        }
                      }))
                    }
                    min="1"
                    max="30"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maxAttempts">Max Attempts</Label>
                  <Input
                    id="maxAttempts"
                    type="number"
                    value={formData.settings.handoverFollowUp.maxAttempts}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          handoverFollowUp: {
                            ...prev.settings.handoverFollowUp,
                            maxAttempts: parseInt(e.target.value)
                          }
                        }
                      }))
                    }
                    min="1"
                    max="3"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="daysBetweenAttempts">Days Between Attempts</Label>
                  <Input
                    id="daysBetweenAttempts"
                    type="number"
                    value={formData.settings.handoverFollowUp.daysBetweenAttempts}
                    onChange={(e) => 
                      setFormData(prev => ({
                        ...prev,
                        settings: {
                          ...prev.settings,
                          handoverFollowUp: {
                            ...prev.settings.handoverFollowUp,
                            daysBetweenAttempts: parseInt(e.target.value)
                          }
                        }
                      }))
                    }
                    min="1"
                    max="14"
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {campaign ? 'Update' : 'Create'} Campaign
        </Button>
      </div>
    </form>
  );
}