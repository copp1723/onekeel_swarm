import { useCallback } from 'react';
import { AgentFormData } from '../types';

/**
 * Custom hook for managing agent domain expertise
 */
export function useDomainExpertise(
  formData: AgentFormData,
  setFormData: React.Dispatch<React.SetStateAction<AgentFormData>>
) {
  
  /**
   * Add a new domain expertise area
   */
  const addDomainExpertise = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: [...(prev.domainExpertise || []), '']
    }));
  }, [setFormData]);

  /**
   * Update an existing domain expertise area
   */
  const updateDomainExpertise = useCallback((index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: prev.domainExpertise?.map((item, i) => 
        i === index ? value : item
      ) || []
    }));
  }, [setFormData]);

  /**
   * Remove a domain expertise area
   */
  const removeDomainExpertise = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: prev.domainExpertise?.filter((_, i) => i !== index) || []
    }));
  }, [setFormData]);

  /**
   * Get current domain expertise areas
   */
  const getCurrentExpertise = useCallback(() => {
    return formData.domainExpertise || [];
  }, [formData.domainExpertise]);

  /**
   * Validate domain expertise
   */
  const validateExpertise = useCallback(() => {
    const expertise = getCurrentExpertise();
    const errors: string[] = [];

    // Check for empty expertise areas
    const emptyAreas = expertise.filter(item => !item.trim()).length;
    if (emptyAreas > 0) {
      errors.push(`${emptyAreas} empty expertise area(s) found`);
    }

    // Check for duplicates
    const uniqueAreas = new Set(expertise.map(item => item.trim().toLowerCase()));
    if (uniqueAreas.size !== expertise.length) {
      errors.push('Duplicate expertise areas found');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [getCurrentExpertise]);

  /**
   * Clear all domain expertise
   */
  const clearExpertise = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: []
    }));
  }, [setFormData]);

  /**
   * Set expertise from predefined list
   */
  const setExpertiseFromTemplate = useCallback((expertiseList: string[]) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: [...expertiseList]
    }));
  }, [setFormData]);

  /**
   * Add multiple expertise areas at once
   */
  const addMultipleExpertise = useCallback((expertiseList: string[]) => {
    setFormData(prev => ({
      ...prev,
      domainExpertise: [...(prev.domainExpertise || []), ...expertiseList]
    }));
  }, [setFormData]);

  /**
   * Get expertise count
   */
  const getExpertiseCount = useCallback(() => {
    return getCurrentExpertise().length;
  }, [getCurrentExpertise]);

  /**
   * Check if expertise area exists
   */
  const hasExpertise = useCallback((expertise: string) => {
    return getCurrentExpertise().some(item => 
      item.trim().toLowerCase() === expertise.trim().toLowerCase()
    );
  }, [getCurrentExpertise]);

  return {
    getCurrentExpertise,
    addDomainExpertise,
    updateDomainExpertise,
    removeDomainExpertise,
    validateExpertise,
    clearExpertise,
    setExpertiseFromTemplate,
    addMultipleExpertise,
    getExpertiseCount,
    hasExpertise
  };
}
