// Simple performance components for leads view
import React from 'react';

// Simple virtual list hook
export const useVirtualList = (items: any[]) => {
  return {
    virtualItems: items,
    totalSize: items.length * 60, // Assume 60px per item
    scrollElementProps: {},
  };
};

// Simple virtual leads list component
export const VirtualLeadsList: React.FC<{
  leads: any[];
  onLeadClick?: (lead: any) => void;
}> = ({ leads, onLeadClick }) => {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          onClick={() => onLeadClick?.(lead)}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium">{lead.firstName} {lead.lastName}</h3>
              <p className="text-sm text-gray-600">{lead.email}</p>
              {lead.phone && <p className="text-sm text-gray-600">{lead.phone}</p>}
            </div>
            <div className="text-right">
              <span className={`px-2 py-1 rounded-full text-xs ${
                lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                lead.status === 'converted' ? 'bg-purple-100 text-purple-800' :
                'bg-red-100 text-red-800'
              }`}>
                {lead.status}
              </span>
              {lead.score && (
                <p className="text-sm text-gray-500 mt-1">Score: {lead.score}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple performance profiler component
export const PerformanceProfiler: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ children }) => {
  // In a real implementation, this would measure performance
  return <>{children}</>;
};
