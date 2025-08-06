import { useState, useEffect, useContext, createContext } from 'react';
import type { ReactNode } from 'react';

interface BrandingConfig {
  companyName: string;
  primaryColor: string;
  secondaryColor: string;
  emailFromName: string;
  supportEmail: string;
  logoUrl?: string;
  websiteUrl?: string;
  favicon?: string;
  customCss?: string;
}

interface BrandingContextType {
  branding: BrandingConfig | null;
  loading: boolean;
  error: string | null;
  refreshBranding: () => Promise<void>;
}

const defaultBranding: BrandingConfig = {
  companyName: 'CCL3 Platform',
  primaryColor: '#2563eb',
  secondaryColor: '#1d4ed8',
  emailFromName: 'CCL3 Support',
  supportEmail: 'support@ccl3-platform.com'
};

const BrandingContext = createContext<BrandingContextType>({
  branding: defaultBranding,
  loading: false,
  error: null,
  refreshBranding: async () => {}
});

interface BrandingProviderProps {
  children: ReactNode;
}

export const BrandingProvider: React.FC<BrandingProviderProps> = ({ children }) => {
  const [branding, setBranding] = useState<BrandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBranding = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to get branding from current domain/subdomain
      const hostname = window.location.hostname;
      const response = await fetch(`/api/branding?domain=${hostname}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBranding(data.branding || defaultBranding);
      } else {
        // Fall back to default branding
        setBranding(defaultBranding);
      }
    } catch (err) {
      console.error('Failed to load branding:', err);
      setError('Failed to load branding configuration');
      setBranding(defaultBranding);
    } finally {
      setLoading(false);
    }
  };

  const refreshBranding = async () => {
    await loadBranding();
  };

  useEffect(() => {
    loadBranding();
  }, []);

  // Apply custom CSS if available
  useEffect(() => {
    if (branding?.customCss) {
      const styleElement = document.createElement('style');
      styleElement.textContent = branding.customCss;
      styleElement.id = 'white-label-custom-css';
      
      // Remove existing custom CSS
      const existingStyle = document.getElementById('white-label-custom-css');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      document.head.appendChild(styleElement);
      
      return () => {
        styleElement.remove();
      };
    }
    return undefined;
  }, [branding?.customCss]);

  // Apply favicon if available
  useEffect(() => {
    if (branding?.favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [branding?.favicon]);

  // Apply page title
  useEffect(() => {
    if (branding?.companyName) {
      document.title = branding.companyName;
    }
  }, [branding?.companyName]);

  return (
    <BrandingContext.Provider value={{ branding, loading, error, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
};

// Hook for applying branding styles to components
export const useBrandingStyles = () => {
  const { branding } = useBranding();
  
  if (!branding) {
    return {
      primaryColor: defaultBranding.primaryColor,
      secondaryColor: defaultBranding.secondaryColor,
      companyName: defaultBranding.companyName
    };
  }

  return {
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    companyName: branding.companyName,
    logoUrl: branding.logoUrl,
    websiteUrl: branding.websiteUrl
  };
};
