import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Mail,
  Upload,
  Users,
  Activity,
  Settings,
  MessageSquare,
  Palette,
  Target,
  LogOut,
  Building,
  Copy,
  BarChart3,
  ChevronDown,
  MessageCircle
} from 'lucide-react';
import { LeadImport } from '@/components/lead-import';
import { DashboardView } from '@/views/DashboardView';
import { LeadsView } from '@/views/LeadsView';
import { ConversationsView } from '@/views/ConversationsView';
import { BrandingManagementView } from '@/views/BrandingManagementView';
import { AgentsView } from '@/views/AgentsView';
import { CampaignsView } from '@/views/CampaignsView';
import { ClientManagementView } from '@/views/ClientManagementView';
import { TemplateLibraryView } from '@/views/TemplateLibraryView';
import { CampaignIntelligenceView } from '@/views/CampaignIntelligenceView';
import { AgentManagementView } from '@/views/AgentManagementView';
import { MultiAgentCampaignView } from '@/views/MultiAgentCampaignView';

import { ClientProvider, useClient } from '@/contexts/ClientContext';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/ui/LoginForm';
import { ViewType } from '@/types';
import { ClientSwitcher } from '@/components/client-management/ClientSwitcher';
import { DEFAULT_BRANDING } from '../../shared/config/branding-config';

function AppContent() {
  const [showImport, setShowImport] = useState(false);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [wsConnected] = useState(true);
  const [showCommunicationDropdown, setShowCommunicationDropdown] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const { activeClient } = useClient();
  const branding = activeClient?.brand_config || DEFAULT_BRANDING;
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowCommunicationDropdown(false);
      setShowSettingsDropdown(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

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
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {/* Dashboard */}
            <button
              onClick={() => setActiveView('dashboard')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                activeView === 'dashboard'
                  ? 'border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeView === 'dashboard' ? {
                color: branding.primaryColor,
                borderColor: branding.primaryColor
              } : {}}
            >
              <Activity className="h-4 w-4" />
              <span className="font-medium">Dashboard</span>
            </button>

            {/* Communication Hub */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCommunicationDropdown(!showCommunicationDropdown);
                }}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                  ['leads', 'conversations', 'templates'].includes(activeView)
                    ? 'border-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={['leads', 'conversations', 'templates'].includes(activeView) ? {
                  color: branding.primaryColor,
                  borderColor: branding.primaryColor
                } : {}}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="font-medium">Communication Hub</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showCommunicationDropdown && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                >
                  <button
                    onClick={() => {
                      setActiveView('leads');
                      setShowCommunicationDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Users className="h-4 w-4" />
                    <span>Leads</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('conversations');
                      setShowCommunicationDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Conversations</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('templates');
                      setShowCommunicationDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Templates</span>
                  </button>
                </div>
              )}
            </div>

            {/* Agents */}
            <button
              onClick={() => setActiveView('agents')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                activeView === 'agents'
                  ? 'border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeView === 'agents' ? {
                color: branding.primaryColor,
                borderColor: branding.primaryColor
              } : {}}
            >
              <Brain className="h-4 w-4" />
              <span className="font-medium">Agents</span>
            </button>

            {/* Campaigns */}
            <button
              onClick={() => setActiveView('campaigns')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                activeView === 'campaigns'
                  ? 'border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeView === 'campaigns' ? {
                color: branding.primaryColor,
                borderColor: branding.primaryColor
              } : {}}
            >
              <Target className="h-4 w-4" />
              <span className="font-medium">Campaigns</span>
            </button>

            {/* Intelligence Hub - Advanced Features */}
            <button
              onClick={() => setActiveView('intelligence')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                activeView === 'intelligence'
                  ? 'border-current'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={activeView === 'intelligence' ? {
                color: branding.primaryColor,
                borderColor: branding.primaryColor
              } : {}}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="font-medium">Intelligence</span>
            </button>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSettingsDropdown(!showSettingsDropdown);
                }}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                  ['clients', 'branding'].includes(activeView)
                    ? 'border-current'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                style={['clients', 'branding'].includes(activeView) ? {
                  color: branding.primaryColor,
                  borderColor: branding.primaryColor
                } : {}}
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">Settings</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {showSettingsDropdown && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                >
                  <button
                    onClick={() => {
                      setActiveView('clients');
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Building className="h-4 w-4" />
                    <span>Clients</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveView('branding');
                      setShowSettingsDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <Palette className="h-4 w-4" />
                    <span>Branding</span>
                  </button>
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'clients' && <ClientManagementView />}
        {activeView === 'leads' && <LeadsView onImportLeads={() => setShowImport(true)} />}
        {activeView === 'agents' && <AgentsView />}
        {activeView === 'campaigns' && <CampaignsView />}
        {activeView === 'templates' && <TemplateLibraryView />}
        {activeView === 'intelligence' && <CampaignIntelligenceView />}
        {activeView === 'conversations' && <ConversationsView />}
        {activeView === 'branding' && <BrandingManagementView />}
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