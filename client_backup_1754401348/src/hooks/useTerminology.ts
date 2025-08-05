import { useMemo } from 'react';

interface TerminologyConfig {
  singular: string;
  plural: string;
  singularCapitalized: string;
  pluralCapitalized: string;
  addNew: string;
  importBulk: string;
  totalCount: string;
  noItemsFound: string;
}

/**
 * Hook that provides terminology configuration for the application.
 * Can be extended to support different terminology based on branding or client configuration.
 */
export function useTerminology(): TerminologyConfig {
  const terminology = useMemo(() => {
    // Default lead terminology - can be extended to support different clients/brandings
    return {
      singular: 'lead',
      plural: 'leads',
      singularCapitalized: 'Lead',
      pluralCapitalized: 'Leads',
      addNew: 'Add New Lead',
      importBulk: 'Import Leads',
      totalCount: 'Total Leads',
      noItemsFound: 'No leads found'
    };
  }, []);

  return terminology;
}

export default useTerminology;