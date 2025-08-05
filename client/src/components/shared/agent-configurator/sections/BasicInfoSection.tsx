import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Brain, AlertCircle } from 'lucide-react';
import { AGENT_TYPES } from '@/utils/agentUtils';
import { SectionProps } from '../types';
import { AgentType } from '@/types';

interface BasicInfoSectionProps extends SectionProps {
  allowTypeChange?: boolean;
  onTypeChange: (newType: AgentType) => void;
  isEditing?: boolean;
}

/**
 * Basic Information Section Component
 * Handles agent name, type, role, status, and end goal
 */
export function BasicInfoSection({ 
  formData, 
  setFormData, 
  errors, 
  allowTypeChange = true,
  onTypeChange,
  isEditing = false
}: BasicInfoSectionProps) {
  
  const selectedAgentType = AGENT_TYPES.find(type => type.value === formData.type);

  const handleTypeChange = (value: AgentType) => {
    onTypeChange(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5" />
          <span>{isEditing ? 'Edit' : 'Create'} AI Agent</span>
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
          {/* Agent Name */}
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

          {/* Agent Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Agent Type *</Label>
            <Select
              value={formData.type}
              onValueChange={handleTypeChange}
              disabled={!allowTypeChange && isEditing}
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
          {/* Agent Role */}
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

          {/* Status */}
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

        {/* End Goal */}
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
  );
}
