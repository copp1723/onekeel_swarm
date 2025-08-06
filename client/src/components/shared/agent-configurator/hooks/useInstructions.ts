import { useCallback } from 'react';
import type { AgentFormData, InstructionsData } from '../types';

/**
 * Custom hook for managing agent instructions (dos and don'ts)
 */
export function useInstructions(
  formData: AgentFormData,
  setFormData: React.Dispatch<React.SetStateAction<AgentFormData>>
) {
  
  /**
   * Helper function to get instructions as object
   */
  const getInstructionsAsObject = useCallback((
    instructions: string[] | { dos?: string[]; donts?: string[]; } | undefined
  ): InstructionsData => {
    if (!instructions) return { dos: [], donts: [] };
    if (Array.isArray(instructions)) return { dos: [], donts: [] };
    return { dos: instructions.dos || [], donts: instructions.donts || [] };
  }, []);

  /**
   * Add a new instruction
   */
  const addInstruction = useCallback((type: 'dos' | 'donts') => {
    setFormData(prev => {
      const currentInstructions = getInstructionsAsObject(prev.instructions);
      return {
        ...prev,
        instructions: {
          ...currentInstructions,
          [type]: [...currentInstructions[type], '']
        }
      };
    });
  }, [setFormData, getInstructionsAsObject]);

  /**
   * Update an existing instruction
   */
  const updateInstruction = useCallback((type: 'dos' | 'donts', index: number, value: string) => {
    setFormData(prev => {
      const currentInstructions = getInstructionsAsObject(prev.instructions);
      return {
        ...prev,
        instructions: {
          ...currentInstructions,
          [type]: currentInstructions[type].map((item: string, i: number) => 
            i === index ? value : item
          )
        }
      };
    });
  }, [setFormData, getInstructionsAsObject]);

  /**
   * Remove an instruction
   */
  const removeInstruction = useCallback((type: 'dos' | 'donts', index: number) => {
    setFormData(prev => {
      const currentInstructions = getInstructionsAsObject(prev.instructions);
      return {
        ...prev,
        instructions: {
          ...currentInstructions,
          [type]: currentInstructions[type].filter((_: string, i: number) => i !== index)
        }
      };
    });
  }, [setFormData, getInstructionsAsObject]);

  /**
   * Get current instructions as object
   */
  const getCurrentInstructions = useCallback(() => {
    return getInstructionsAsObject(formData.instructions);
  }, [formData.instructions, getInstructionsAsObject]);

  /**
   * Validate instructions
   */
  const validateInstructions = useCallback(() => {
    const instructions = getCurrentInstructions();
    const errors: string[] = [];

    // Check if at least one instruction exists
    if (instructions.dos.length === 0 && instructions.donts.length === 0) {
      errors.push('At least one instruction (do or don\'t) is required');
    }

    // Check for empty instructions
    const emptyDos = instructions.dos.filter(item => !item.trim()).length;
    const emptyDonts = instructions.donts.filter(item => !item.trim()).length;

    if (emptyDos > 0) {
      errors.push(`${emptyDos} empty "do" instruction(s) found`);
    }

    if (emptyDonts > 0) {
      errors.push(`${emptyDonts} empty "don't" instruction(s) found`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [getCurrentInstructions]);

  /**
   * Clear all instructions
   */
  const clearInstructions = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      instructions: { dos: [], donts: [] }
    }));
  }, [setFormData]);

  /**
   * Set instructions from template
   */
  const setInstructionsFromTemplate = useCallback((template: InstructionsData) => {
    setFormData(prev => ({
      ...prev,
      instructions: { ...template }
    }));
  }, [setFormData]);

  return {
    getCurrentInstructions,
    addInstruction,
    updateInstruction,
    removeInstruction,
    validateInstructions,
    clearInstructions,
    setInstructionsFromTemplate
  };
}
