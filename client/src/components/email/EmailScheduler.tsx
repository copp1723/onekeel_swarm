import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Edit2, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { format, addDays, addHours, startOfDay, setHours, setMinutes } from 'date-fns';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
}

interface ScheduleAttempt {
  attemptNumber: number;
  templateId: string;
  delayDays: number;
  delayHours: number;
  skipConditions?: {
    ifReplied?: boolean;
    ifOpened?: boolean;
    ifClicked?: boolean;
  };
}

interface EmailSchedule {
  id: string;
  name: string;
  attempts: ScheduleAttempt[];
  createdAt: string;
  updatedAt: string;
}

interface ScheduledEmail {
  id: string;
  to: string;
  templateId: string;
  scheduledFor: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  variables?: Record<string, string>;
}

export function EmailScheduler() {
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [scheduledEmails, setScheduledEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<EmailSchedule | null>(null);
  
  // Form state for creating schedules
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleAttempts, setScheduleAttempts] = useState<ScheduleAttempt[]>([
    { attemptNumber: 1, templateId: '', delayDays: 0, delayHours: 0 }
  ]);
  
  // Form state for scheduling individual emails
  const [emailTo, setEmailTo] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');

  // Fetch schedules and templates
  useEffect(() => {
    fetchSchedules();
    fetchTemplates();
    fetchScheduledEmails();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/email/schedules');
      const data = await response.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchScheduledEmails = async () => {
    try {
      // This endpoint would need to be implemented to fetch scheduled emails
      // For now, we'll use mock data
      setScheduledEmails([]);
    } catch (error) {
      console.error('Error fetching scheduled emails:', error);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleName || scheduleAttempts.some(a => !a.templateId)) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/email/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scheduleName,
          attempts: scheduleAttempts
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Email schedule created successfully'
        });
        setShowCreateDialog(false);
        resetScheduleForm();
        fetchSchedules();
      } else {
        throw new Error(data.error?.message || 'Failed to create schedule');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create schedule',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`/api/email/schedules/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Schedule deleted successfully'
        });
        fetchSchedules();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive'
      });
    }
  };

  const handleScheduleEmail = async () => {
    if (!emailTo || !selectedTemplateId || !scheduleDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailTo,
          templateId: selectedTemplateId,
          scheduledFor: scheduledDateTime.toISOString()
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Email scheduled successfully'
        });
        setShowScheduleDialog(false);
        resetEmailForm();
        fetchScheduledEmails();
      } else {
        throw new Error(data.error?.message || 'Failed to schedule email');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule email',
        variant: 'destructive'
      });
    }
  };

  const addScheduleAttempt = () => {
    const newAttempt: ScheduleAttempt = {
      attemptNumber: scheduleAttempts.length + 1,
      templateId: '',
      delayDays: scheduleAttempts.length > 0 ? scheduleAttempts[scheduleAttempts.length - 1].delayDays + 1 : 1,
      delayHours: 0
    };
    setScheduleAttempts([...scheduleAttempts, newAttempt]);
  };

  const updateScheduleAttempt = (index: number, updates: Partial<ScheduleAttempt>) => {
    const updated = [...scheduleAttempts];
    updated[index] = { ...updated[index], ...updates };
    setScheduleAttempts(updated);
  };

  const removeScheduleAttempt = (index: number) => {
    const updated = scheduleAttempts.filter((_, i) => i !== index);
    // Renumber attempts
    updated.forEach((attempt, i) => {
      attempt.attemptNumber = i + 1;
    });
    setScheduleAttempts(updated);
  };

  const resetScheduleForm = () => {
    setScheduleName('');
    setScheduleAttempts([
      { attemptNumber: 1, templateId: '', delayDays: 0, delayHours: 0 }
    ]);
  };

  const resetEmailForm = () => {
    setEmailTo('');
    setSelectedTemplateId('');
    setScheduleDate('');
    setScheduleTime('09:00');
  };

  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.name || 'Unknown Template';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="schedules" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedules">Email Sequences</TabsTrigger>
          <TabsTrigger value="individual">Individual Emails</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="space-y-4">
          {/* Email Sequences */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Email Sequences</CardTitle>
                  <CardDescription>
                    Create multi-touch email sequences with automated follow-ups
                  </CardDescription>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Sequence
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-500">Loading schedules...</p>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No email sequences created yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{schedule.name}</h4>
                            <p className="text-sm text-gray-500 mt-1">
                              {schedule.attempts.length} email{schedule.attempts.length !== 1 ? 's' : ''} in sequence
                            </p>
                            <div className="mt-3 space-y-2">
                              {schedule.attempts.map((attempt, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm">
                                  <Badge variant="outline">Email {attempt.attemptNumber}</Badge>
                                  <span className="text-gray-600">
                                    {getTemplateName(attempt.templateId)}
                                  </span>
                                  {(attempt.delayDays > 0 || attempt.delayHours > 0) && (
                                    <span className="text-gray-500">
                                      • After {attempt.delayDays > 0 && `${attempt.delayDays} day${attempt.delayDays !== 1 ? 's' : ''}`}
                                      {attempt.delayDays > 0 && attempt.delayHours > 0 && ' and '}
                                      {attempt.delayHours > 0 && `${attempt.delayHours} hour${attempt.delayHours !== 1 ? 's' : ''}`}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingSchedule(schedule);
                                setScheduleName(schedule.name);
                                setScheduleAttempts(schedule.attempts);
                                setShowCreateDialog(true);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          {/* Individual Scheduled Emails */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Scheduled Emails</CardTitle>
                  <CardDescription>
                    Schedule individual emails to be sent at a specific time
                  </CardDescription>
                </div>
                <Button onClick={() => setShowScheduleDialog(true)}>
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Email
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {scheduledEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">No scheduled emails</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {scheduledEmails.map((email) => (
                    <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{email.to}</p>
                        <p className="text-sm text-gray-500">
                          {getTemplateName(email.templateId)} • Scheduled for {format(new Date(email.scheduledFor), 'PPp')}
                        </p>
                      </div>
                      <Badge variant={
                        email.status === 'sent' ? 'default' :
                        email.status === 'failed' ? 'destructive' :
                        email.status === 'cancelled' ? 'secondary' :
                        'outline'
                      }>
                        {email.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Sequence Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Edit Email Sequence' : 'Create Email Sequence'}
            </DialogTitle>
            <DialogDescription>
              Set up a multi-touch email sequence with automated follow-ups
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="scheduleName">Sequence Name</Label>
              <Input
                id="scheduleName"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
                placeholder="e.g., Welcome Series, Follow-up Sequence"
              />
            </div>

            <div>
              <Label>Email Sequence</Label>
              <div className="space-y-3 mt-2">
                {scheduleAttempts.map((attempt, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-medium">Email {attempt.attemptNumber}</h4>
                        {scheduleAttempts.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeScheduleAttempt(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label>Template</Label>
                          <Select
                            value={attempt.templateId}
                            onValueChange={(value) => updateScheduleAttempt(index, { templateId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {index > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>Delay (Days)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={attempt.delayDays}
                                onChange={(e) => updateScheduleAttempt(index, { delayDays: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                            <div>
                              <Label>Delay (Hours)</Label>
                              <Input
                                type="number"
                                min="0"
                                max="23"
                                value={attempt.delayHours}
                                onChange={(e) => updateScheduleAttempt(index, { delayHours: parseInt(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={addScheduleAttempt}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Follow-up Email
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetScheduleForm();
              setEditingSchedule(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule}>
              {editingSchedule ? 'Update Sequence' : 'Create Sequence'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Individual Email Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Email</DialogTitle>
            <DialogDescription>
              Schedule an email to be sent at a specific date and time
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="emailTo">Recipient Email</Label>
              <Input
                id="emailTo"
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>

            <div>
              <Label htmlFor="template">Email Template</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger id="template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduleDate">Date</Label>
                <Input
                  id="scheduleDate"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div>
                <Label htmlFor="scheduleTime">Time</Label>
                <Input
                  id="scheduleTime"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowScheduleDialog(false);
              resetEmailForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleScheduleEmail}>
              Schedule Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}