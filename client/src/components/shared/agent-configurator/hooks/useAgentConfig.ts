import { useState, useEffect } from 'react';
import { UnifiedAgentConfig, AgentType } from '@/types';
import { 
  getDefaultConfigForType,
  validateAgentConfig,
  cleanAgentConfig
} from '@/utils/agentUtils';
import { 
  AgentFormData, 
  ValidationErrors, 
  FormSubmissionState, 
  AgentConfigHookReturn,
  ValidationResult
} from '../types';

/**
 * Custom hook for managing agent configuration form state and logic
 */
export function useAgentConfig(
  agent: UnifiedAgentConfig | null | undefined,
  onSave: (agent: UnifiedAgentConfig) => Promise<void>
): AgentConfigHookReturn {
  
  // Initialize form data
  const [formData, setFormData] = useState<AgentFormData>(() => {
    if (agent) return agent as AgentFormData;
    return {
      name: '',
      type: 'email',
      ...getDefaultConfigForType('email')
    } as AgentFormData;
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submissionState, setSubmissionState] = useState<FormSubmissionState>({
    isSubmitting: false,
    hasChanges: false
  });

  // Update form data when agent prop changes
  useEffect(() => {
    if (agent) {
      setFormData(agent as AgentFormData);
      setSubmissionState(prev => ({ ...prev, hasChanges: false }));
    }
  }, [agent]);

  // Track changes
  useEffect(() => {
    setSubmissionState(prev => ({ ...prev, hasChanges: true }));
  }, [formData]);

  /**
   * Handle agent type change with default config reset
   */
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

  /**
   * Validate the current form data
   */
  const validateForm = (): ValidationResult => {
    return validateAgentConfig(formData);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSubmissionState(prev => ({ ...prev, isSubmitting: true }));
    setErrors({});
    
    try {
      const cleanedData = cleanAgentConfig(formData);
      await onSave(cleanedData);
      setSubmissionState(prev => ({ 
        ...prev, 
        hasChanges: false, 
        lastSaved: new Date() 
      }));
    } catch (error) {
      console.error('Failed to save agent:', error);
      setErrors({ submit: 'Failed to save agent. Please try again.' });
    } finally {
      setSubmissionState(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    if (agent) {
      setFormData(agent as AgentFormData);
    } else {
      setFormData({
        name: '',
        type: 'email',
        ...getDefaultConfigForType('email')
      } as AgentFormData);
    }
    setErrors({});
    setSubmissionState({
      isSubmitting: false,
      hasChanges: false
    });
  };

  return {
    formData,
    setFormData,
    errors,
    setErrors,
    submissionState,
    handleSubmit,
    handleTypeChange,
    resetForm,
    validateForm
  };
}
