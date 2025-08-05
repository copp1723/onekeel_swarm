import { UnifiedAgentConfig, AgentType } from '@/types';

/**
 * Core types for agent configurator system
 */

export interface AgentConfiguratorProps {
  agent?: UnifiedAgentConfig | null;
  onSave: (agent: UnifiedAgentConfig) => Promise<void>;
  onCancel: () => void;
  allowTypeChange?: boolean;
}

export interface AgentFormData extends Partial<UnifiedAgentConfig> {
  name: string;
  type: AgentType;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationErrors;
}

export interface InstructionsData {
  dos: string[];
  donts: string[];
}

export interface SectionProps {
  formData: AgentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AgentFormData>>;
  errors: ValidationErrors;
}

export interface InstructionsSectionProps extends SectionProps {
  onAddInstruction: (type: 'dos' | 'donts') => void;
  onUpdateInstruction: (type: 'dos' | 'donts', index: number, value: string) => void;
  onRemoveInstruction: (type: 'dos' | 'donts', index: number) => void;
}

export interface DomainExpertiseSectionProps extends SectionProps {
  onAddExpertise: () => void;
  onUpdateExpertise: (index: number, value: string) => void;
  onRemoveExpertise: (index: number) => void;
}

export interface AgentTypeOption {
  value: AgentType;
  label: string;
  description: string;
  capabilities: {
    email?: boolean;
    sms?: boolean;
    chat?: boolean;
  };
}

export interface PersonalityOption {
  value: string;
  label: string;
  description?: string;
}

export interface ToneOption {
  value: string;
  label: string;
  description?: string;
}

export interface ResponseLengthOption {
  value: string;
  label: string;
  description?: string;
}

export interface FormSubmissionState {
  isSubmitting: boolean;
  hasChanges: boolean;
  lastSaved?: Date;
}

export interface AgentConfigHookReturn {
  formData: AgentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AgentFormData>>;
  errors: ValidationErrors;
  setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  submissionState: FormSubmissionState;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleTypeChange: (newType: AgentType) => void;
  resetForm: () => void;
  validateForm: () => ValidationResult;
}
