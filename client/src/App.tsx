import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  LogOut
} from 'lucide-react';
import { LeadImport } from '@/components/lead-import';
import { EnhancedDashboardView } from '@/views/EnhancedDashboardView';
import { EnhancedLeadsView } from '@/views/EnhancedLeadsView';
import { ConversationsView } from '@/views/ConversationsView';
import { BrandingManagementView } from '@/views/BrandingManagementView';
import { AgentManagementView } from '@/views/AgentManagementView';
import { CampaignsView } from '@/views/CampaignsView';
import { CampaignIntelligenceView } from '@/views/CampaignIntelligenceView';
import { ClientManagementView } from '@/views/ClientManagementView';
import { TemplateLibraryView } from '@/views/TemplateLibraryView';
import { AgentTemplatesView } from '@/views/AgentTemplatesView';
import { UsersView } from '@/views/UsersView';
import { SystemHealthView } from '@/views/SystemHealthView';
import { ServiceConfigView } from '@/views/ServiceConfigView';
import { FeatureFlagDashboard } from '@/components/FeatureFlagDashboard';
import { EmailSettingsView } from '@/views/EmailSettingsView';

import { ClientProvider, useClient } from '@/contexts/ClientContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/ui/LoginForm';
import { ViewType } from '@/types';
import { ClientSwitcher } from '@/components/client-management/ClientSwitcher';
import { NavigationBar } from '@/components/navigation/NavigationBar';
import { useTerminology } from '@/hooks/useTerminology';
import { DEFAULT_BRANDING } from '../../shared/config/branding-config';
import { RegistrationView } from '@/views/RegistrationView';

function AppContent() {
  const [showImport, setShowImport] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [wsConnected] = useState(true);
  const { activeClient } = useClient();
  const branding = activeClient?.brand_config || DEFAULT_BRANDING;
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const terminology = useTerminology();
  
  // Check if we're on the registration page
  const isRegistrationPage = window.location.pathname === '/register';

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
  
  // Show registration page if on /register route
  if (isRegistrationPage) {
    return <RegistrationView />;
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
                <h1 className="text-2xl font-bold text-gray-900">{terminology.importBulk}</h1>
                <p className="text-gray-600">Upload and map your CSV data</p>
              </div>
              <Button variant="outline" onClick={() => setShowImport(false)}>
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
              <Button variant="outline" onClick={logout} className="flex items-center space-x-2">
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
        setActiveView={setActiveView}
        brandingColor={branding.primaryColor}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'dashboard' && <EnhancedDashboardView />}
        {activeView === 'intelligence' && <CampaignIntelligenceView onNavigateToCampaigns={() => setActiveView('campaigns')} />}
        {activeView === 'conversations' && <ConversationsView />}
        {activeView === 'leads' && <EnhancedLeadsView />}
        {activeView === 'branding' && <BrandingManagementView />}
        {activeView === 'agents' && <AgentManagementView />}
        {activeView === 'agent-templates' && <AgentTemplatesView />}
        {activeView === 'campaigns' && <CampaignsView />}
        {activeView === 'clients' && <ClientManagementView />}
        {activeView === 'templates' && <TemplateLibraryView />}
        {activeView === 'users' && <UsersView />}
        {activeView === 'system-health' && <SystemHealthView />}
        {activeView === 'service-config' && <ServiceConfigView />}
        {activeView === 'feature-flags' && <FeatureFlagDashboard />}
        {activeView === 'email-settings' && <EmailSettingsView />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ClientProvider>
        <AppContent />
      </ClientProvider>
    </AuthProvider>
  );
}