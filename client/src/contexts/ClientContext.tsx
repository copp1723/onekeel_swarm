import React, { createContext, useContext, useState, ReactNode } from 'react';

// Default branding configuration
const DEFAULT_BRANDING = {
  companyName: 'OneKeel Swarm',
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  emailFromName: 'OneKeel Swarm',
  supportEmail: 'support@oneswarm.ai'
};

interface BrandConfig {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
}

interface Client {
  id: string;
  name: string;
  brand_config: BrandConfig;
  active: boolean;
}

interface ClientContextType {
  activeClient: Client | null;
  clients: Client[];
  setActiveClient: (client: Client | null) => void;
  isLoading: boolean;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
};

interface ClientProviderProps {
  children: ReactNode;
}

export const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  const [activeClient, setActiveClient] = useState<Client | null>({
    id: 'default',
    name: 'OneKeel Swarm',
    brand_config: DEFAULT_BRANDING,
    active: true
  });

  const [clients] = useState<Client[]>([
    {
      id: 'default',
      name: 'OneKeel Swarm',
      brand_config: DEFAULT_BRANDING,
      active: true
    }
  ]);

  const value: ClientContextType = {
    activeClient,
    clients,
    setActiveClient,
    isLoading: false
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
}; 