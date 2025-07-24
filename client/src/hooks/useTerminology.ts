import { useMemo } from 'react';
import { useFeatureFlag } from './useFeatureFlag';

export interface TerminologyLabels {
  singular: string;
  plural: string;
  singularCapitalized: string;
  pluralCapitalized: string;
  // Common phrases
  addNew: string;
  viewAll: string;
  importBulk: string;
  noItemsFound: string;
  totalCount: string;
}

export const useTerminology = (): TerminologyLabels => {
  const { enabled: useContactsTerminology } = useFeatureFlag('ui.contacts-terminology');

  const labels = useMemo(() => {
    if (useContactsTerminology) {
      return {
        singular: 'contact',
        plural: 'contacts',
        singularCapitalized: 'Contact',
        pluralCapitalized: 'Contacts',
        addNew: 'Add New Contact',
        viewAll: 'View All Contacts',
        importBulk: 'Import Contacts',
        noItemsFound: 'No contacts found',
        totalCount: 'Total Contacts'
      };
    }

    return {
      singular: 'lead',
      plural: 'leads',
      singularCapitalized: 'Lead',
      pluralCapitalized: 'Leads',
      addNew: 'Add New Lead',
      viewAll: 'View All Leads',
      importBulk: 'Import Leads',
      noItemsFound: 'No leads found',
      totalCount: 'Total Leads'
    };
  }, [useContactsTerminology]);

  return labels;
};

// Hook to get API endpoint based on terminology
export const useApiEndpoint = () => {
  const { enabled: useContactsTerminology } = useFeatureFlag('ui.contacts-terminology');
  
  return useMemo(() => ({
    base: useContactsTerminology ? '/api/contacts' : '/api/leads',
    getAll: useContactsTerminology ? '/api/contacts' : '/api/leads',
    getById: (id: string) => useContactsTerminology ? `/api/contacts/${id}` : `/api/leads/${id}`,
    create: useContactsTerminology ? '/api/contacts' : '/api/leads',
    update: (id: string) => useContactsTerminology ? `/api/contacts/${id}` : `/api/leads/${id}`,
    delete: (id: string) => useContactsTerminology ? `/api/contacts/${id}` : `/api/leads/${id}`,
    import: useContactsTerminology ? '/api/contacts/import' : '/api/leads/import',
    updateStatus: (id: string) => useContactsTerminology ? `/api/contacts/${id}/status` : `/api/leads/${id}/status`
  }), [useContactsTerminology]);
};