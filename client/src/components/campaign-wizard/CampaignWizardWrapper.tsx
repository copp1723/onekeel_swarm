import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { CampaignWizard } from './CampaignWizard';

interface CampaignWizardWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (campaign: any) => void;
  agents?: any[];
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class CampaignWizardErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Campaign Wizard Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 space-y-4">
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="h-5 w-5" />
                <span>Campaign Wizard Error</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-700">
                The campaign wizard encountered an error and couldn't load properly.
              </p>
              <div className="bg-red-100 p-3 rounded text-sm text-red-600 font-mono">
                {this.state.error?.message || 'Unknown error occurred'}
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: null });
                    this.props.onReset();
                  }}
                  variant="outline"
                  className="flex items-center space-x-2"
                >
                  <RefreshCcw className="h-4 w-4" />
                  <span>Try Again</span>
                </Button>
                <Button
                  onClick={this.props.onReset}
                  variant="outline"
                >
                  Use Classic Editor Instead
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export function CampaignWizardWrapper({ isOpen, onClose, onComplete, agents }: CampaignWizardWrapperProps) {
  const [key, setKey] = React.useState(0);

  const handleReset = () => {
    setKey(prev => prev + 1);
    onClose();
  };

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <CampaignWizardErrorBoundary onReset={handleReset}>
      <CampaignWizard
        key={key}
        isOpen={isOpen}
        onClose={onClose}
        onComplete={onComplete}
        agents={agents || []}
      />
    </CampaignWizardErrorBoundary>
  );
}