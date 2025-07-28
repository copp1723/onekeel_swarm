import React from 'react';
import { useFeatureFlag } from '../hooks/useFeatureFlag';

// Props for the FeatureGate component
interface FeatureGateProps {
  flagKey: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loading?: React.ReactNode;
  showUpgrade?: boolean;
  upgradeText?: string;
  upgradeCallback?: () => void;
}

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
  </div>
);

// Upgrade prompt component
interface UpgradePromptProps {
  text?: string;
  onUpgrade?: () => void;
}

const UpgradePrompt: React.FC<UpgradePromptProps> = ({ 
  text = "This feature requires an upgrade", 
  onUpgrade 
}) => (
  <div className="border border-dashed border-gray-300 rounded-lg p-4 text-center bg-gray-50">
    <div className="text-gray-600 mb-2">
      <svg 
        className="mx-auto h-8 w-8 text-gray-400 mb-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
        />
      </svg>
      <p className="text-sm font-medium text-gray-900">{text}</p>
    </div>
    {onUpgrade && (
      <button
        onClick={onUpgrade}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Upgrade Now
      </button>
    )}
  </div>
);

// Main FeatureGate component
export const FeatureGate: React.FC<FeatureGateProps> = ({
  flagKey,
  children,
  fallback = null,
  loading = <LoadingSkeleton />,
  showUpgrade = false,
  upgradeText,
  upgradeCallback
}) => {
  const { enabled, loading: isLoading, error } = useFeatureFlag(flagKey);

  // Show loading state
  if (isLoading) {
    return <>{loading}</>;
  }

  // Handle errors by showing fallback
  if (error) {
    console.warn(`Feature flag error for ${flagKey}:`, error);
    return <>{fallback}</>;
  }

  // Show content if feature is enabled
  if (enabled) {
    return <>{children}</>;
  }

  // Show upgrade prompt if requested
  if (showUpgrade) {
    return (
      <UpgradePrompt 
        text={upgradeText} 
        onUpgrade={upgradeCallback}
      />
    );
  }

  // Show fallback content
  return <>{fallback}</>;
};

// Specialized component for admin-only features
interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showMessage?: boolean;
  message?: string;
}

export const AdminGate: React.FC<AdminGateProps> = ({
  children,
  fallback = null,
  showMessage = true,
  message = "This feature is only available to administrators"
}) => {
  return (
    <FeatureGate
      flagKey="admin.access"
      fallback={showMessage ? <div className="text-sm text-gray-500 italic">{message}</div> : (fallback as any)}
      upgradeText="Admin Access Required"
      upgradeCallback={() => {}}
    >
      {children}
    </FeatureGate>
  );
};

// Component for progressive disclosure based on user role
interface RoleBasedGateProps {
  roles: ('admin' | 'manager' | 'agent' | 'viewer')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export const RoleBasedGate: React.FC<RoleBasedGateProps> = ({
  roles,
  children,
  fallback = null,
  showUpgrade = false
}) => {
  // Create a flag key based on roles
  const flagKey = `role.${roles.join('_or_')}`;
  
  return (
    <FeatureGate
      flagKey={flagKey}
      fallback={fallback}
      showUpgrade={showUpgrade}
      upgradeText="Upgrade Required"
      upgradeCallback={() => {}}
    >
      {children}
    </FeatureGate>
  );
};

// Component for environment-based features
interface EnvironmentGateProps {
  environments: ('development' | 'staging' | 'production')[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const EnvironmentGate: React.FC<EnvironmentGateProps> = ({
  environments,
  children,
  fallback = null
}) => {
  const currentEnv = (import.meta as any).env?.VITE_ENVIRONMENT || 'development';
  const shouldShow = environments.includes(currentEnv as any);
  
  return shouldShow ? <>{children}</> : <>{fallback}</>;
};

// Higher-order component for feature gating
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  flagKey: string,
  options: {
    fallback?: React.ComponentType<P>;
    showUpgrade?: boolean;
    upgradeText?: string;
  } = {}
) {
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <FeatureGate
        flagKey={flagKey}
        fallback={options.fallback ? <options.fallback {...props} /> : (null as any)}
        showUpgrade={options.showUpgrade}
        upgradeText={options.upgradeText || "Upgrade Required"}
        upgradeCallback={() => {}}
      >
        <Component {...props} />
      </FeatureGate>
    );
  };

  WrappedComponent.displayName = `withFeatureFlag(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Utility component for A/B testing
interface ABTestProps {
  flagKey: string;
  variantA: React.ReactNode;
  variantB: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ABTest: React.FC<ABTestProps> = ({
  flagKey,
  variantA,
  variantB,
  fallback = null
}) => {
  const { enabled, loading } = useFeatureFlag(flagKey);

  if (loading) {
    return <>{fallback}</>;
  }

  return enabled ? <>{variantB}</> : <>{variantA}</>;
};

// Component for conditional rendering based on multiple flags
interface MultiGateProps {
  conditions: Array<{
    flagKey: string;
    required: boolean; // true = must be enabled, false = must be disabled
  }>;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  operator?: 'AND' | 'OR';
}

export const MultiGate: React.FC<MultiGateProps> = ({
  conditions,
  children,
  fallback = null,
  operator = 'AND'
}) => {
  const [shouldShow, setShouldShow] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const checkConditions = async () => {
      setIsLoading(true);
      
      // This is a simplified implementation
      // In a real scenario, you'd want to batch these API calls
      const results = await Promise.all(
        conditions.map(async (condition) => {
          // For now, just return the required value
          // This would need to be implemented with actual flag checking
          return condition.required;
        })
      );

      let result: boolean;
      if (operator === 'AND') {
        result = results.every(Boolean);
      } else {
        result = results.some(Boolean);
      }

      setShouldShow(result);
      setIsLoading(false);
    };

    checkConditions();
  }, [conditions, operator]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return shouldShow ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGate;