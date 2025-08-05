import { useState, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  LogOut
} from 'lucide-react';
import { LeadImport } from '@/components/lead-import';

// Lazy load view components for code splitting
const EnhancedDashboardView = lazy(() => import('@/views/EnhancedDashboardView'));
const LeadsView = lazy(() => import('@/views/LeadsView'));
const ConversationsView = lazy(() => import('@/views/ConversationsView'));
const BrandingManagementView = lazy(() => import('@/views/BrandingManagementView'));
const AgentsView = lazy(() => import('@/views/AgentsView'));
const CampaignsView = lazy(() => import('@/views/CampaignsView'));
const ClientManagementView = lazy(() => import('@/views/ClientManagementView'));
const TemplateLibraryView = lazy(() => import('@/views/TemplateLibraryView'));
const AgentTemplatesView = lazy(() => import('@/views/AgentTemplatesView'));
const UsersView = lazy(() => import('@/views/UsersView'));

const EmailSettingsView = lazy(() => import('@/views/EmailSettingsView'));

import { ClientProvider, useClient } from '@/contexts/ClientContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/ui/LoginForm';
import { ViewType } from '@/types';
import { ClientSwitcher } from '@/components/client-management/ClientSwitcher';
import { NavigationBar } from '@/components/navigation/NavigationBar';

import { DEFAULT_BRANDING } from '../../shared/config/branding-config';

const AppContent = memo(function AppContent() {
  const [showImport, setShowImport] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [wsConnected] = useState(true);
  const { activeClient } = useClient();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  
  // Memoize branding configuration to prevent unnecessary re-renders
  const branding = useMemo(() => {
    return activeClient?.brand_config || DEFAULT_BRANDING;
  }, [activeClient?.brand_config]);
  
  // Memoize callbacks to prevent child re-renders
  const handleShowImportToggle = useCallback(() => {
    setShowImport(prev => !prev);
  }, []);
  
  const handleViewChange = useCallback((view: ViewType) => {
    setActiveView(view);
  }, []);
  
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  if (showImport) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Import Leads</h1>
                <p className="text-gray-600">Upload and map your CSV data</p>
              </div>
              <Button variant="outline" onClick={handleShowImportToggle}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
        <LeadImport />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {branding.logoUrl ? (
                  <img
                    src={branding.logoUrl}
                    alt={`${branding.companyName} logo`}
                    className="h-8 w-8 object-contain rounded-lg"
                  />
                ) : (
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: `linear-gradient(to right, ${branding.primaryColor}, ${branding.secondaryColor})`
                    }}
                  >
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{branding.companyName}</h1>
                  <p className="text-sm text-gray-600">AI Marketing Automation Platform</p>
                </div>
              </div>
              <Badge variant={wsConnected ? 'default' : 'destructive'} className="ml-4">
                {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </Badge>
              <ClientSwitcher />
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                Welcome, {user?.firstName || user?.username}
              </span>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <NavigationBar 
        activeView={activeView}
        setActiveView={handleViewChange}
        brandingColor={branding.primaryColor}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ViewRenderer activeView={activeView} />
        </Suspense>
      </div>
    </div>
  );
});

// Memoized view renderer to prevent unnecessary component mounting/unmounting
const ViewRenderer = memo(function ViewRenderer({ activeView }: { activeView: ViewType }) {
  // Use a switch statement for better performance than multiple conditionals
  switch (activeView) {
    case 'dashboard':
      return <EnhancedDashboardView />;
    case 'conversations':
      return <ConversationsView />;
    case 'leads':
      return <LeadsView />;
    case 'branding':
      return <BrandingManagementView />;
    case 'agents':
      return <AgentsView />;
    case 'agent-templates':
      return <AgentTemplatesView />;
    case 'campaigns':
      return <CampaignsView />;
    case 'clients':
      return <ClientManagementView />;
    case 'templates':
      return <TemplateLibraryView />;
    case 'users':
      return <UsersView />;

    case 'email-settings':
      return <EmailSettingsView />;
    default:
      return <EnhancedDashboardView />;
  }
});

// Memoized main App component
const App = memo(function App() {
  return (
    <AuthProvider>
      <ClientProvider>
        <AppContent />
      </ClientProvider>
    </AuthProvider>
  );
});

// Loading fallback component for Suspense
const ViewLoadingFallback = memo(function ViewLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Loading view...</p>
      </div>
    </div>
  );
});

export default App;