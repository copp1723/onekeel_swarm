import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Clock, Mail, MessageSquare, Phone, ArrowDown } from 'lucide-react';

interface TouchPoint {
  id: string;
  templateId: string;
  channel: 'email' | 'sms' | 'chat';
  delayDays: number;
  delayHours: number;
  conditions?: any;
}

interface DynamicSequenceEditorProps {
  sequence: TouchPoint[];
  templates: any[];
  onSave: (sequence: TouchPoint[]) => void;
}

export function DynamicSequenceEditor({ sequence, templates, onSave }: DynamicSequenceEditorProps) {
  const [touchPoints, setTouchPoints] = useState<TouchPoint[]>(sequence);

  const addTouchPoint = () => {
    const newTouchPoint: TouchPoint = {
      id: `touch-${Date.now()}`,
      templateId: '',
      channel: 'email',
      delayDays: 1,
      delayHours: 0
    };
    setTouchPoints([...touchPoints, newTouchPoint]);
  };

  const removeTouchPoint = (id: string) => {
    setTouchPoints(touchPoints.filter(tp => tp.id !== id));
  };

  const updateTouchPoint = (id: string, updates: Partial<TouchPoint>) => {
    setTouchPoints(touchPoints.map(tp => 
      tp.id === id ? { ...tp, ...updates } : tp
    ));
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'email': return <Mail className="h-4 w-4" />;
      case 'sms': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageSquare className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Campaign Sequence Builder</h3>
          <p className="text-sm text-gray-600">Create multi-step, AI-adaptive follow-up sequences</p>
        </div>
        <Button onClick={addTouchPoint} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Touch Point
        </Button>
      </div>

      <div className="space-y-4">
        {touchPoints.map((touchPoint, index) => (
          <div key={touchPoint.id} className="relative">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Step {index + 1}
                    </Badge>
                    {getChannelIcon(touchPoint.channel)}
                    {touchPoint.channel.toUpperCase()}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeTouchPoint(touchPoint.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`channel-${touchPoint.id}`}>Channel</Label>
                    <Select
                      value={touchPoint.channel}
                      onValueChange={(value: 'email' | 'sms' | 'chat') => 
                        updateTouchPoint(touchPoint.id, { channel: value })
                      }
                    >
                      <SelectTrigger id={`channel-${touchPoint.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email
                          </div>
                        </SelectItem>
                        <SelectItem value="sms">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="chat">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            Chat
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`template-${touchPoint.id}`}>Template</Label>
                    <Select
                      value={touchPoint.templateId}
                      onValueChange={(value) => 
                        updateTouchPoint(touchPoint.id, { templateId: value })
                      }
                    >
                      <SelectTrigger id={`template-${touchPoint.id}`}>
                        <SelectValue placeholder="Select template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.filter(t => t.type === touchPoint.channel).map(template => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor={`delay-days-${touchPoint.id}`}>Days</Label>
                      <Input
                        id={`delay-days-${touchPoint.id}`}
                        type="number"
                        min="0"
                        value={touchPoint.delayDays}
                        onChange={(e) => 
                          updateTouchPoint(touchPoint.id, { delayDays: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor={`delay-hours-${touchPoint.id}`}>Hours</Label>
                      <Input
                        id={`delay-hours-${touchPoint.id}`}
                        type="number"
                        min="0"
                        max="23"
                        value={touchPoint.delayHours}
                        onChange={(e) => 
                          updateTouchPoint(touchPoint.id, { delayHours: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                </div>

                {touchPoint.delayDays > 0 || touchPoint.delayHours > 0 ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <Clock className="h-4 w-4" />
                    <span>
                      Sends {touchPoint.delayDays > 0 && `${touchPoint.delayDays} day${touchPoint.delayDays > 1 ? 's' : ''}`}
                      {touchPoint.delayDays > 0 && touchPoint.delayHours > 0 && ' and '}
                      {touchPoint.delayHours > 0 && `${touchPoint.delayHours} hour${touchPoint.delayHours > 1 ? 's' : ''}`}
                      {' '}after previous step
                    </span>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            
            {index < touchPoints.length - 1 && (
              <div className="flex justify-center py-2">
                <ArrowDown className="h-5 w-5 text-gray-400" />
              </div>
            )}
          </div>
        ))}
      </div>

      {touchPoints.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sequence steps yet</h3>
            <p className="text-gray-500 mb-4">Add touch points to create your campaign sequence</p>
            <Button onClick={addTouchPoint}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Step
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={() => setTouchPoints(sequence)}>
          Reset
        </Button>
        <Button onClick={() => onSave(touchPoints)}>
          Save Sequence
        </Button>
      </div>
    </div>
  );
}