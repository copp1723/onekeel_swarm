import { useState, useMemo, useCallback, memo, Suspense, lazy } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Brain, LogOut } from 'lucide-react';
import { LeadImport } from '@/components/lead-import';

const EnhancedDashboardView = lazy(() => import('@/views/EnhancedDashboardView'));

// Wire up real components from the existing codebase
const LeadsView = lazy(() => import('@/components/lead-import/index').then(mod => ({ default: mod.LeadImport })));
const ConversationsView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">Conversations view coming soon</div> }));
const BrandingManagementView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">Branding management coming soon</div> }));
const AgentsView = lazy(() => import('@/components/shared/AgentManagementDemo').then(mod => ({ default: mod.AgentManagementDemo })));
const CampaignsView = lazy(async () => {
  const { CampaignWizardWrapper } = await import('@/components/campaign-wizard');
  const { Button } = await import('@/components/ui/button');
  const { Plus, Zap, Users, Mail } = await import('lucide-react');
  
  const CampaignsViewComponent = () => {
    const [showWizard, setShowWizard] = useState(false);
    const [agents] = useState([
      {
        id: 'email-agent-1',
        name: 'Email Marketing Agent',
        role: 'Email specialist for lead nurturing and conversion',
        type: 'email',
        active: true
      },
      {
        id: 'general-agent-1',
        name: 'General Sales Agent',
        role: 'Multi-channel sales and customer engagement',
        type: 'overlord',
        active: true
      }
    ]);

    const handleWizardComplete = (campaignData: any) => {
      console.log('Campaign created:', campaignData);
      setShowWizard(false);
      // Here you could refresh campaigns list, show success notification, etc.
    };

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Campaign Management</h2>
            <p className="text-gray-600">Create and manage your AI-powered marketing campaigns</p>
          </div>
          <Button
            onClick={() => setShowWizard(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Active Campaigns</h3>
              <Zap className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">0</p>
            <p className="text-sm text-gray-500">Currently running</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Total Contacts</h3>
              <Users className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">0</p>
            <p className="text-sm text-gray-500">In all campaigns</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Messages Sent</h3>
              <Mail className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600">0</p>
            <p className="text-sm text-gray-500">This month</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Campaigns</h3>
          </div>
          <div className="p-6">
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first AI-powered campaign</p>
              <Button
                onClick={() => setShowWizard(true)}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Campaign</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Campaign Wizard Modal */}
        <CampaignWizardWrapper
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
          agents={agents}
        />
      </div>
    );
  };
  
  return { default: CampaignsViewComponent };
});
const ClientManagementView = lazy(() => import('@/components/WhiteLabelRouter').then(mod => ({ default: mod.WhiteLabelRouter })));
const TemplateLibraryView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">Template library coming soon</div> }));
const AgentTemplatesView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">Agent templates coming soon</div> }));
const UsersView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">User management coming soon</div> }));
const EmailSettingsView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">Email settings coming soon</div> }));
const CampaignIntelligenceView = lazy(() => Promise.resolve({ default: () => <div className="p-6 text-center text-gray-500">Campaign intelligence coming soon</div> }));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/ui/LoginForm';
import type { ViewType } from '@/types/index';
import { DEFAULT_BRANDING } from '../../shared/config/branding-config';
import NavigationBar from '@/components/navigation/NavigationBar';

const BrandingLogo = ({ branding }: { branding: any }) => (
  <div className="flex items-center space-x-3">
    {branding?.logoUrl ? (
      <img src={branding.logoUrl} alt={`${branding.companyName} logo`} className="h-8 w-8 object-contain rounded-lg" />
    ) : (
      <div
        className="h-8 w-8 rounded-lg flex items-center justify-center"
        style={{ background: `linear-gradient(to right, ${branding?.primaryColor || '#2563eb'}, ${branding?.secondaryColor || '#06b6d4'})` }}
      >
        <Brain className="h-5 w-5 text-white" />
      </div>
    )}
    <div>
      <h1 className="text-2xl font-bold text-gray-900">{branding?.companyName || 'OneKeel'}</h1>
      <p className="text-sm text-gray-600">AI Marketing Automation Platform</p>
    </div>
  </div>
);

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

const ViewRenderer = memo(function ViewRenderer({ activeView }: { activeView: ViewType }) {
  switch (activeView) {
    case 'dashboard': return <EnhancedDashboardView />;
    case 'conversations': return <ConversationsView />;
    case 'leads': return <LeadsView />;
    case 'branding': return <BrandingManagementView />;
    case 'agents': return <AgentsView />;
    case 'agent-templates': return <AgentTemplatesView />;
    case 'campaigns': return <CampaignsView />;
    case 'clients': return <ClientManagementView />;
    case 'templates': return <TemplateLibraryView />;
    case 'users': return <UsersView />;
    case 'email-settings': return <EmailSettingsView />;
    case 'intelligence': return <CampaignIntelligenceView />;
    default: return <EnhancedDashboardView />;
  }
});

const AppContent = memo(function AppContent() {
  const [showImport, setShowImport] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [wsConnected] = useState(true);
  const { isAuthenticated, user, logout } = useAuth();

  // Brand config fallback (since ClientContext is not wired in this trimmed repo)
  const branding = useMemo(() => DEFAULT_BRANDING, []);

  const handleShowImportToggle = useCallback(() => setShowImport(prev => !prev), []);
  const handleViewChange = useCallback((view: ViewType) => setActiveView(view), []);
  const handleLogout = useCallback(() => logout(), [logout]);

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
              <BrandingLogo branding={branding} />
              <Badge className={`ml-4 ${wsConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {wsConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {/* Optional: import toggle for CSV */}
              <Button variant="outline" onClick={handleShowImportToggle}>Import Leads</Button>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Welcome, {user?.username || 'User'}</span>
              <Button variant="outline" onClick={handleLogout} className="flex items-center space-x-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-6">
        <NavigationBar activeView={activeView} setActiveView={handleViewChange} brandingColor={branding.primaryColor} />
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Suspense fallback={<ViewLoadingFallback />}>
          <ViewRenderer activeView={activeView} />
        </Suspense>
      </div>
    </div>
  );
});

const App = memo(function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
});

export default App;