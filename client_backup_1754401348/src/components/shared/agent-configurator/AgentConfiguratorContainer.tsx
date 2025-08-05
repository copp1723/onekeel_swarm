import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { AgentConfiguratorProps } from './types';
import { useAgentConfig } from './hooks/useAgentConfig';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { PersonalitySection } from './sections/PersonalitySection';
import { InstructionsSection } from './sections/InstructionsSection';
import { DomainExpertiseSection } from './sections/DomainExpertiseSection';
import { AdvancedSettingsSection } from './sections/AdvancedSettingsSection';

/**
 * Main Agent Configurator Container
 * Orchestrates all configuration sections and manages form state
 */
export function AgentConfiguratorContainer({ 
  agent, 
  onSave, 
  onCancel, 
  allowTypeChange = true 
}: AgentConfiguratorProps) {
  
  const {
    formData,
    setFormData,
    errors,
    submissionState,
    handleSubmit,
    handleTypeChange
  } = useAgentConfig(agent, onSave);

  const isEditing = !!agent;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      {/* Basic Information */}
      <BasicInfoSection
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        allowTypeChange={allowTypeChange}
        onTypeChange={handleTypeChange}
        isEditing={isEditing}
      />

      {/* Personality & Behavior */}
      <PersonalitySection
        formData={formData}
        setFormData={setFormData}
        errors={errors}
      />

      {/* Instructions */}
      <InstructionsSection
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        onAddInstruction={() => {}} // Handled by useInstructions hook
        onUpdateInstruction={() => {}} // Handled by useInstructions hook
        onRemoveInstruction={() => {}} // Handled by useInstructions hook
      />

      {/* Domain Expertise */}
      <DomainExpertiseSection
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        onAddExpertise={() => {}} // Handled by useDomainExpertise hook
        onUpdateExpertise={() => {}} // Handled by useDomainExpertise hook
        onRemoveExpertise={() => {}} // Handled by useDomainExpertise hook
      />

      {/* Advanced Settings */}
      <AdvancedSettingsSection
        formData={formData}
        setFormData={setFormData}
        errors={errors}
      />

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submissionState.isSubmitting}>
          {submissionState.isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? 'Update' : 'Create'} Agent
            </>
          )}
        </Button>
      </div>

      {/* Form Status */}
      {submissionState.hasChanges && !submissionState.isSubmitting && (
        <div className="text-center">
          <p className="text-sm text-amber-600">
            You have unsaved changes
          </p>
        </div>
      )}

      {submissionState.lastSaved && (
        <div className="text-center">
          <p className="text-sm text-green-600">
            Last saved: {submissionState.lastSaved.toLocaleTimeString()}
          </p>
        </div>
      )}
    </form>
  );
}
