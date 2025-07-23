import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AgentCapabilities } from '@/types';
import { Mail, MessageSquare, Phone } from 'lucide-react';

interface AgentCapabilitySelectorProps {
  capabilities: AgentCapabilities;
  onChange: (capabilities: AgentCapabilities) => void;
  disabled?: boolean;
  readonly?: boolean;
  showLabels?: boolean;
  compact?: boolean;
}

const CAPABILITY_CONFIG = [
  {
    key: 'email' as keyof AgentCapabilities,
    label: 'Email',
    icon: Mail,
    description: 'Send and receive emails'
  },
  {
    key: 'sms' as keyof AgentCapabilities,
    label: 'SMS',
    icon: Phone,
    description: 'Send text messages'
  },
  {
    key: 'chat' as keyof AgentCapabilities,
    label: 'Chat',
    icon: MessageSquare,
    description: 'Live chat conversations'
  }
];

export function AgentCapabilitySelector({
  capabilities,
  onChange,
  disabled = false,
  readonly = false,
  showLabels = true,
  compact = false
}: AgentCapabilitySelectorProps) {
  const handleCapabilityChange = (capability: keyof AgentCapabilities, enabled: boolean) => {
    if (readonly || disabled) return;
    
    onChange({
      ...capabilities,
      [capability]: enabled
    });
  };

  if (readonly) {
    return (
      <div className={`flex ${compact ? 'space-x-1' : 'space-x-2'}`}>
        {CAPABILITY_CONFIG.map(({ key, label, icon: Icon }) => {
          if (!capabilities[key]) return null;
          
          return (
            <Badge 
              key={key} 
              variant="outline" 
              className={`flex items-center ${compact ? 'space-x-1 text-xs px-2 py-1' : 'space-x-2'}`}
            >
              <Icon className={compact ? 'h-3 w-3' : 'h-4 w-4'} />
              {showLabels && <span>{label}</span>}
            </Badge>
          );
        })}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex space-x-3">
        {CAPABILITY_CONFIG.map(({ key, label, icon: Icon, description }) => (
          <div key={key} className="flex items-center space-x-1">
            <Checkbox
              id={`capability-${key}`}
              checked={capabilities[key]}
              onCheckedChange={(checked) => handleCapabilityChange(key, !!checked)}
              disabled={disabled}
            />
            <Icon className="h-4 w-4" />
            {showLabels && (
              <Label 
                htmlFor={`capability-${key}`} 
                className="text-sm cursor-pointer"
                title={description}
              >
                {label}
              </Label>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Communication Channels</Label>
      <div className="grid grid-cols-1 gap-3">
        {CAPABILITY_CONFIG.map(({ key, label, icon: Icon, description }) => (
          <div key={key} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
            <Checkbox
              id={`capability-${key}`}
              checked={capabilities[key]}
              onCheckedChange={(checked) => handleCapabilityChange(key, !!checked)}
              disabled={disabled}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4" />
                <Label 
                  htmlFor={`capability-${key}`} 
                  className="font-medium cursor-pointer"
                >
                  {label}
                </Label>
              </div>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper component for displaying capabilities as icons only
export function AgentCapabilityIcons({ 
  capabilities, 
  size = 'sm' 
}: { 
  capabilities: AgentCapabilities; 
  size?: 'sm' | 'md' | 'lg' 
}) {
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
  
  return (
    <div className="flex space-x-1">
      {capabilities.email && <Mail className={iconSize} />}
      {capabilities.sms && <Phone className={iconSize} />}
      {capabilities.chat && <MessageSquare className={iconSize} />}
    </div>
  );
}
