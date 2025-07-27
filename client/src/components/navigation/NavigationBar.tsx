import React, { useState, useEffect } from 'react';
import {
  Users,
  Target,
  Settings,
  ChevronDown,
  Activity,
  Brain,
  Copy,
  Building,
  UserCog,
  Flag,
  Sparkles,
  Mail,
  Palette
} from 'lucide-react';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { useAuth } from '@/contexts/AuthContext';
import { ViewType } from '@/types';

interface NavigationBarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  brandingColor?: string;
}

interface NavigationItem {
  id: ViewType | 'settings-group' | 'people-group' | 'agents-group';
  label: string;
  icon: React.ElementType;
  views?: ViewType[];
  children?: {
    id: ViewType;
    label: string;
    icon: React.ElementType;
    adminOnly?: boolean;
  }[];
}

export const NavigationBar: React.FC<NavigationBarProps> = ({ 
  activeView, 
  setActiveView, 
  brandingColor = '#3B82F6' 
}) => {
  const { user } = useAuth();
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showAgentsDropdown, setShowAgentsDropdown] = useState(false);
  
  // Feature flags
  const { enabled: useNewNavigation } = useFeatureFlag('ui.new-navigation');
  const { enabled: useContactsTerminology } = useFeatureFlag('ui.contacts-terminology');
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const settingsDropdown = document.getElementById('settings-dropdown');
      const settingsButton = document.getElementById('settings-button');
      const agentsDropdown = document.getElementById('agents-dropdown');
      const agentsButton = document.getElementById('agents-button');
      
      if (settingsDropdown && settingsButton && 
          !settingsDropdown.contains(event.target as Node) && 
          !settingsButton.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
      
      if (agentsDropdown && agentsButton && 
          !agentsDropdown.contains(event.target as Node) && 
          !agentsButton.contains(event.target as Node)) {
        setShowAgentsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define navigation structures
  const legacyNavigation: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'intelligence', label: 'Intelligence Hub', icon: Sparkles },
    { id: 'conversations', label: 'Communication', icon: Brain },
    { id: 'agents', label: 'Agents', icon: Brain },
    {
      id: 'settings-group',
      label: 'Settings',
      icon: Settings,
      children: [
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'email-settings', label: 'Email Settings', icon: Mail },
        { id: 'users', label: 'Users', icon: Users, adminOnly: true },
        { id: 'feature-flags', label: 'Feature Flags', icon: Flag, adminOnly: true }
      ]
    }
  ];

  const modernNavigation: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'intelligence', label: 'Intelligence Hub', icon: Sparkles },
    { id: 'conversations', label: 'Communication', icon: Brain },
    { 
      id: 'agents-group', 
      label: 'Agents', 
      icon: Brain,
      children: [
        { id: 'agents', label: 'My Agents', icon: UserCog },
        { id: 'agent-templates', label: 'Agent Templates', icon: Copy }
      ]
    },
    {
      id: 'settings-group',
      label: 'Settings',
      icon: Settings,
      children: [
        { id: 'branding', label: 'Branding', icon: Palette },
        { id: 'email-settings', label: 'Email Settings', icon: Mail },
        { id: 'users', label: 'Users', icon: Users, adminOnly: true },
        { id: 'feature-flags', label: 'Feature Flags', icon: Flag, adminOnly: true }
      ]
    }
  ];

  const navigation = useNewNavigation ? modernNavigation : legacyNavigation;
  
  // Helper to check if a navigation item is active
  const isActive = (item: NavigationItem): boolean => {
    if (item.views) {
      return item.views.includes(activeView);
    }
    return item.id === activeView;
  };

  // Handle navigation click
  const handleNavigationClick = (item: NavigationItem) => {
    if (item.id === 'settings-group') {
      setShowSettingsDropdown(!showSettingsDropdown);
      setShowAgentsDropdown(false);
    } else if (item.id === 'agents-group') {
      setShowAgentsDropdown(!showAgentsDropdown);
      setShowSettingsDropdown(false);
    } else if (item.id === 'people-group') {
      // Default to leads/contacts view when clicking people tab
      setActiveView('leads');
    } else if (item.id && !item.views) {
      setActiveView(item.id as ViewType);
    }
  };

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex space-x-8" role="navigation" aria-label="Main navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            
            return (
              <div key={item.id} className="relative">
                <button
                  id={item.id === 'settings-group' ? 'settings-button' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNavigationClick(item);
                  }}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 transition-colors ${
                    active
                      ? 'border-current'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={active ? {
                    color: brandingColor,
                    borderColor: brandingColor
                  } : {}}
                  aria-label={`${item.label}${item.children ? ' menu' : ''}`}
                  aria-expanded={item.id === 'settings-group' ? showSettingsDropdown : undefined}
                  aria-haspopup={item.children ? "menu" : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{item.label}</span>
                  {item.children && <ChevronDown className="h-4 w-4" />}
                </button>
                
                {/* Dropdown for settings */}
                {item.id === 'settings-group' && showSettingsDropdown && (
                  <div 
                    id="settings-dropdown"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50"
                    role="menu"
                    aria-labelledby="settings-button"
                  >
                    {item.children?.filter(child => !child.adminOnly || user?.role === 'admin').map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <button
                          key={child.id}
                          onClick={() => {
                            setActiveView(child.id);
                            setShowSettingsDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-2 ${
                            activeView === child.id ? 'bg-gray-50 text-gray-900' : 'text-gray-700'
                          }`}
                          role="menuitem"
                        >
                          <ChildIcon className="h-4 w-4" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default NavigationBar;