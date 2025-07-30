import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Save, User, Mail, Phone, Building, Tag, Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Lead {
  id?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  source: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected';
  qualificationScore?: number;
  assignedChannel?: 'email' | 'sms' | 'chat';
  campaignId?: string;
  creditScore?: number;
  income?: number;
  employer?: string;
  jobTitle?: string;
  metadata?: Record<string, any>;
  notes?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface LeadFormProps {
  lead?: Lead;
  campaigns?: Campaign[];
  onSave: (leadData: Omit<Lead, 'id'>) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function LeadForm({ lead, campaigns = [], onSave, onCancel, loading = false }: LeadFormProps) {
  const [formData, setFormData] = useState<Omit<Lead, 'id'>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    source: 'manual',
    status: 'new',
    qualificationScore: 0,
    assignedChannel: undefined,
    campaignId: undefined,
    creditScore: undefined,
    income: undefined,
    employer: '',
    jobTitle: '',
    metadata: {},
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);

  useEffect(() => {
    if (lead) {
      setFormData({
        firstName: lead.firstName || '',
        lastName: lead.lastName || '',
        email: lead.email,
        phone: lead.phone || '',
        source: lead.source,
        status: lead.status,
        qualificationScore: lead.qualificationScore || 0,
        assignedChannel: lead.assignedChannel,
        campaignId: lead.campaignId,
        creditScore: lead.creditScore,
        income: lead.income,
        employer: lead.employer || '',
        jobTitle: lead.jobTitle || '',
        metadata: lead.metadata || {},
        notes: lead.notes || ''
      });

      // Extract custom fields from metadata
      if (lead.metadata) {
        const customFieldsArray = Object.entries(lead.metadata)
          .filter(([key]) => !['createdAt', 'updatedAt', 'source'].includes(key))
          .map(([key, value]) => ({ key, value: String(value) }));
        setCustomFields(customFieldsArray);
      }
    }
  }, [lead]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.qualificationScore && (formData.qualificationScore < 0 || formData.qualificationScore > 100)) {
      newErrors.qualificationScore = 'Score must be between 0 and 100';
    }

    if (formData.creditScore && (formData.creditScore < 300 || formData.creditScore > 850)) {
      newErrors.creditScore = 'Credit score must be between 300 and 850';
    }

    if (formData.income && formData.income < 0) {
      newErrors.income = 'Income must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Merge custom fields into metadata
    const metadata = { ...formData.metadata };
    customFields.forEach(({ key, value }) => {
      if (key.trim()) {
        metadata[key.trim()] = value;
      }
    });

    const leadData = {
      ...formData,
      metadata,
      qualificationScore: formData.qualificationScore || undefined,
      creditScore: formData.creditScore || undefined,
      income: formData.income || undefined
    };

    try {
      await onSave(leadData);
    } catch (error) {
      console.error('Error saving lead:', error);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addCustomField = () => {
    setCustomFields(prev => [...prev, { key: '', value: '' }]);
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    setCustomFields(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const sourceOptions = [
    'manual', 'website', 'referral', 'social_media', 'email_campaign', 
    'phone_call', 'trade_show', 'advertisement', 'partner', 'other'
  ];

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>{lead ? 'Edit Lead' : 'Create New Lead'}</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address"
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-500 mt-1">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Lead Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="source">Source</Label>
              <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map(source => (
                    <SelectItem key={source} value={source}>
                      {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignedChannel">Assigned Channel</Label>
              <Select 
                value={formData.assignedChannel || ''} 
                onValueChange={(value) => handleInputChange('assignedChannel', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="chat">Chat</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campaign Assignment */}
          {campaigns.length > 0 && (
            <div>
              <Label htmlFor="campaignId">Campaign</Label>
              <Select 
                value={formData.campaignId || ''} 
                onValueChange={(value) => handleInputChange('campaignId', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Campaign</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Scoring and Financial Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="qualificationScore">Qualification Score (0-100)</Label>
              <Input
                id="qualificationScore"
                type="number"
                min="0"
                max="100"
                value={formData.qualificationScore || ''}
                onChange={(e) => handleInputChange('qualificationScore', parseInt(e.target.value) || 0)}
                placeholder="0"
                className={errors.qualificationScore ? 'border-red-500' : ''}
              />
              {errors.qualificationScore && (
                <p className="text-sm text-red-500 mt-1">{errors.qualificationScore}</p>
              )}
            </div>
            <div>
              <Label htmlFor="creditScore">Credit Score (300-850)</Label>
              <Input
                id="creditScore"
                type="number"
                min="300"
                max="850"
                value={formData.creditScore || ''}
                onChange={(e) => handleInputChange('creditScore', parseInt(e.target.value) || undefined)}
                placeholder="Credit score"
                className={errors.creditScore ? 'border-red-500' : ''}
              />
              {errors.creditScore && (
                <p className="text-sm text-red-500 mt-1">{errors.creditScore}</p>
              )}
            </div>
            <div>
              <Label htmlFor="income">Annual Income</Label>
              <Input
                id="income"
                type="number"
                min="0"
                value={formData.income || ''}
                onChange={(e) => handleInputChange('income', parseInt(e.target.value) || undefined)}
                placeholder="Annual income"
                className={errors.income ? 'border-red-500' : ''}
              />
              {errors.income && (
                <p className="text-sm text-red-500 mt-1">{errors.income}</p>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employer">Employer</Label>
              <Input
                id="employer"
                value={formData.employer}
                onChange={(e) => handleInputChange('employer', e.target.value)}
                placeholder="Company name"
              />
            </div>
            <div>
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                placeholder="Job title"
              />
            </div>
          </div>

          {/* Custom Fields */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Custom Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                <Tag className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
            {customFields.map((field, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <Input
                  placeholder="Field name"
                  value={field.key}
                  onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Field value"
                  value={field.value}
                  onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomField(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this lead..."
              rows={3}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {lead ? 'Update Lead' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
