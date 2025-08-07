import React from 'react';
import { Activity, Target, Bot, Users, BarChart3, MessageSquare, Palette, FileText, Settings, Mail } from 'lucide-react';
import type { ViewType } from '@/types/index';

interface NavigationBarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  brandingColor?: string;
}

interface NavigationItem {
  id: ViewType;
  label: string;
  icon: React.ComponentType<any>;
}

const navigationItems: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Activity },
  { id: 'campaigns', label: 'Campaigns', icon: Target },
  { id: 'agents', label: 'AI Agents', icon: Bot },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'intelligence', label: 'Analytics', icon: BarChart3 },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'email-settings', label: 'Email Settings', icon: Mail },
];

// Primary navigation items that should be highlighted
const isPrimaryNav = (id: ViewType): boolean => {
  return ['dashboard', 'campaigns', 'agents', 'leads'].includes(id);
};

export const NavigationBar: React.FC<NavigationBarProps> = ({
  activeView,
  setActiveView,
  brandingColor = '#2563eb'
}) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex space-x-1 overflow-x-auto py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            const isPrimary = isPrimaryNav(item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`
                  flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                  rounded-lg transition-all duration-200 min-w-fit
                  ${isActive 
                    ? `bg-blue-50 text-blue-700 border-b-2` 
                    : isPrimary
                      ? 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }
                `}
                style={{
                  borderBottomColor: isActive ? brandingColor : 'transparent',
                  borderBottomWidth: isActive ? '2px' : '0px'
                }}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;
