import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calendar,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface Schedule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  attempts: {
    templateId: string;
    delayDays: number;
    delayHours: number;
    conditions?: any;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface Template {
  id: string;
  name: string;
  category: string;
}

export function CampaignScheduler() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    attempts: [{
      templateId: '',
      delayDays: 0,
      delayHours: 0
    }]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [schedulesRes, templatesRes] = await Promise.all([
        fetch('/api/email/schedules'),
        fetch('/api/email/templates')
      ]);

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData.data || []);
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSave = async () => {
    try {
      const url = selectedSchedule 
        ? `/api/email/schedules/${selectedSchedule.id}`
        : '/api/email/schedules';
      
      const method = selectedSchedule ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadData();
        setShowForm(false);
        setSelectedSchedule(null);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const response = await fetch(`/api/email/schedules/${scheduleId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error deleting schedule:', error);
    }
  };

  const handleToggle = async (scheduleId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/email/schedules/${scheduleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Error toggling schedule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      attempts: [{
        templateId: '',
        delayDays: 0,
        delayHours: 0
      }]
    });
  };

  const addAttempt = () => {
    setFormData(prev => ({
      ...prev,
      attempts: [...prev.attempts, {
        templateId: '',
        delayDays: 0,
        delayHours: 0
      }]
    }));
  };

  const removeAttempt = (index: number) => {
    setFormData(prev => ({
      ...prev,
      attempts: prev.attempts.filter((_, i) => i !== index)
    }));
  };

  const updateAttempt = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      attempts: prev.attempts.map((attempt, i) => 
        i === index ? { ...attempt, [field]: value } : attempt
      )
    }));
  };

  const editSchedule = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description,
      attempts: schedule.attempts
    });
    setShowForm(true);
  };

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{selectedSchedule ? 'Edit' : 'Create'} Email Schedule</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setSelectedSchedule(null);
                resetForm();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            Define when follow-up emails should be sent
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Schedule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Standard Follow-up Sequence"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe when this schedule should be used"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Email Attempts</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAttempt}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Attempt
              </Button>
            </div>

            <div className="space-y-4">
              {formData.attempts.map((attempt, index) => (
                <Card key={index} className="p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Attempt {index + 1}</h4>
                      {formData.attempts.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttempt(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Email Template</Label>
                      <Select
                        value={attempt.templateId}
                        onValueChange={(value) => updateAttempt(index, 'templateId', value)}
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

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Days Delay</Label>
                        <Input
                          type="number"
                          value={attempt.delayDays}
                          onChange={(e) => updateAttempt(index, 'delayDays', parseInt(e.target.value))}
                          min="0"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Hours Delay</Label>
                        <Input
                          type="number"
                          value={attempt.delayHours}
                          onChange={(e) => updateAttempt(index, 'delayHours', parseInt(e.target.value))}
                          min="0"
                          max="23"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {index === 0 && (
                      <p className="text-sm text-gray-500">
                        First email will be sent after this delay from enrollment
                      </p>
                    )}
                    {index > 0 && (
                      <p className="text-sm text-gray-500">
                        Sent after previous email if no response received
                      </p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setSelectedSchedule(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {selectedSchedule ? 'Update' : 'Create'} Schedule
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Email Schedules</h3>
          <p className="text-sm text-gray-500">
            Manage multi-step email sequences and follow-up timing
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Schedule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schedules.map((schedule) => (
          <Card key={schedule.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{schedule.name}</CardTitle>
                  <CardDescription>{schedule.description}</CardDescription>
                </div>
                <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                  {schedule.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Email Sequence</p>
                  {schedule.attempts.map((attempt, idx) => {
                    const template = templates.find(t => t.id === attempt.templateId);
                    return (
                      <div key={idx} className="flex items-center text-sm">
                        <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="flex-1">
                          {template?.name || 'Unknown Template'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {attempt.delayDays}d {attempt.delayHours}h
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editSchedule(schedule)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggle(schedule.id, schedule.isActive)}
                    >
                      {schedule.isActive ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Pause
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Activate
                        </>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(schedule.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schedules.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules yet</h3>
            <p className="text-gray-500 mb-6">
              Create your first email schedule to automate follow-ups.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Schedule
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}