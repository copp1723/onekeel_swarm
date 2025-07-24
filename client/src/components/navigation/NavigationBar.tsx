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
  Flag
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
  id: ViewType | 'settings-group' | 'people-group';
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
  
  // Feature flags
  const { enabled: useNewNavigation } = useFeatureFlag('ui.new-navigation');
  const { enabled: useContactsTerminology } = useFeatureFlag('ui.contacts-terminology');
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('settings-dropdown');
      const button = document.getElementById('settings-button');
      
      if (dropdown && button && 
          !dropdown.contains(event.target as Node) && 
          !button.contains(event.target as Node)) {
        setShowSettingsDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Define navigation structures
  const legacyNavigation: NavigationItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'leads', label: useContactsTerminology ? 'Contacts' : 'Leads', icon: Users },
    { id: 'conversations', label: 'Conversations', icon: Brain },
    { id: 'agents', label: 'Agents', icon: Brain },
    { id: 'campaigns', label: 'Campaigns', icon: Target },
    { id: 'templates', label: 'Templates', icon: Copy },
    { id: 'clients', label: 'Clients', icon: Building },
    { id: 'branding', label: 'Branding', icon: Settings }
  ];

  const modernNavigation: NavigationItem[] = [
    { 
      id: 'people-group',
      label: useContactsTerminology ? 'Contacts' : 'People',
      icon: Users,
      views: ['dashboard', 'leads', 'conversations']
    },
    { 
      id: 'campaigns', 
      label: 'Campaigns', 
      icon: Target 
    },
    {
      id: 'settings-group',
      label: 'Settings',
      icon: Settings,
      views: ['agents', 'templates', 'clients', 'branding'],
      children: [
        { id: 'agents', label: 'Agents', icon: Brain },
        { id: 'templates', label: 'Templates', icon: Copy },
        { id: 'clients', label: 'Clients', icon: Building },
        { id: 'branding', label: 'Branding', icon: Settings },
        { id: 'users' as ViewType, label: 'Users', icon: UserCog, adminOnly: true },
        { id: 'feature-flags' as ViewType, label: 'Feature Flags', icon: Flag, adminOnly: true }
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