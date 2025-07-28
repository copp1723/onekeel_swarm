import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Types
interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  userRoles: string[];
  environments: string[];
  category: string;
  complexity: 'basic' | 'intermediate' | 'advanced';
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

// Service functions
class FeatureFlagAdminService {
  static async getAllFlags(): Promise<FeatureFlag[]> {
    const response = await fetch('/api/feature-flags/admin');
    if (!response.ok) throw new Error('Failed to fetch flags');
    const data = await response.json();
    return data.success ? data.flags : [];
  }

  static async updateFlag(flagKey: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const response = await fetch(`/api/feature-flags/admin/${flagKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!response.ok) throw new Error('Failed to update flag');
    const data = await response.json();
    return data.flag;
  }

  static async toggleFlag(flagKey: string, enabled: boolean): Promise<void> {
    const endpoint = enabled ? 'enable' : 'disable';
    const response = await fetch(`/api/feature-flags/admin/${flagKey}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: `Manual ${endpoint} via dashboard` })
    });
    if (!response.ok) throw new Error(`Failed to ${endpoint} flag`);
  }
}

// Risk level colors
const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'low': return 'text-green-600 bg-green-100';
    case 'medium': return 'text-yellow-600 bg-yellow-100';
    case 'high': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

// Complexity colors
const getComplexityColor = (complexity: string) => {
  switch (complexity) {
    case 'basic': return 'text-blue-600 bg-blue-100';
    case 'intermediate': return 'text-purple-600 bg-purple-100';
    case 'advanced': return 'text-red-600 bg-red-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

// Category colors
const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'ui-progressive': 'text-green-600 bg-green-100',
    'agent-tuning': 'text-blue-600 bg-blue-100',
    'campaign-advanced': 'text-purple-600 bg-purple-100',
    'system-config': 'text-red-600 bg-red-100',
    'integrations': 'text-yellow-600 bg-yellow-100',
    'debugging': 'text-orange-600 bg-orange-100',
    'experimental': 'text-pink-600 bg-pink-100'
  };
  return colors[category] || 'text-gray-600 bg-gray-100';
};

// Feature Flag Card Component
const FeatureFlagCard: React.FC<{
  flag: FeatureFlag;
  onToggle: (flagKey: string, enabled: boolean) => void;
  onUpdate: (flagKey: string, updates: Partial<FeatureFlag>) => void;
}> = ({ flag, onToggle, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: flag.name,
    description: flag.description || '',
    rolloutPercentage: flag.rolloutPercentage
  });

  const handleSave = async () => {
    await onUpdate(flag.key, editForm);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          {isEditing ? (
            <input
              type="text"
              value={editForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, name: e.target.value })}
              className="text-lg font-semibold border-b border-gray-300 bg-transparent w-full focus:outline-none focus:border-blue-500"
            />
          ) : (
            <h3 className="text-lg font-semibold text-gray-900">{flag.name}</h3>
          )}
          <p className="text-sm text-gray-500 font-mono mt-1">{flag.key}</p>
        </div>
        
        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer ml-4">
          <input
            type="checkbox"
            checked={flag.enabled}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onToggle(flag.key, e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* Description */}
      {isEditing ? (
        <textarea
          value={editForm.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm({ ...editForm, description: e.target.value })}
          className="w-full p-2 text-sm text-gray-600 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          placeholder="Flag description..."
        />
      ) : (
        <p className="text-sm text-gray-600 mb-4">{flag.description || 'No description'}</p>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(flag.category)}`}>
          {flag.category}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getComplexityColor(flag.complexity)}`}>
          {flag.complexity}
        </span>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(flag.riskLevel)}`}>
          {flag.riskLevel} risk
        </span>
      </div>

      {/* Rollout Percentage */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Rollout</span>
          {isEditing ? (
            <input
              type="number"
              min="0"
              max="100"
              value={editForm.rolloutPercentage}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm({ ...editForm, rolloutPercentage: parseInt(e.target.value) })}
              className="w-16 text-sm text-right border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <span className="text-sm text-gray-900">{flag.rolloutPercentage}%</span>
          )}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${flag.enabled ? flag.rolloutPercentage : 0}%` }}
          ></div>
        </div>
      </div>

      {/* Target Roles */}
      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700 block mb-2">Target Roles</span>
        <div className="flex flex-wrap gap-1">
          {flag.userRoles.map((role: string) => (
            <span key={role} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* Environments */}
      <div className="mb-4">
        <span className="text-sm font-medium text-gray-700 block mb-2">Environments</span>
        <div className="flex flex-wrap gap-1">
          {flag.environments.map((env: string) => (
            <span key={env} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
              {env}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          Updated: {new Date(flag.updatedAt).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export const FeatureFlagDashboard: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const { user } = useAuth();

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <div className="text-red-600 mb-2">Access Denied</div>
        <div className="text-gray-600">Feature flag management requires administrator privileges.</div>
      </div>
    );
  }

  // Load flags
  useEffect(() => {
    const loadFlags = async () => {
      try {
        setLoading(true);
        const flagsData = await FeatureFlagAdminService.getAllFlags();
        setFlags(flagsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flags');
      } finally {
        setLoading(false);
      }
    };

    loadFlags();
  }, []);

  // Handle flag toggle
  const handleToggle = async (flagKey: string, enabled: boolean) => {
    try {
      await FeatureFlagAdminService.toggleFlag(flagKey, enabled);
      setFlags(flags.map((flag: FeatureFlag) => 
        flag.key === flagKey ? { ...flag, enabled } : flag
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle flag');
    }
  };

  // Handle flag update
  const handleUpdate = async (flagKey: string, updates: Partial<FeatureFlag>) => {
    try {
      const updatedFlag = await FeatureFlagAdminService.updateFlag(flagKey, updates);
      setFlags(flags.map((flag: FeatureFlag) => 
        flag.key === flagKey ? updatedFlag : flag
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    }
  };

  // Filter flags
  const filteredFlags = flags.filter((flag: FeatureFlag) => {
    const matchesFilter = filter === 'all' || flag.category === filter;
    const matchesSearch = search === '' || 
      flag.name.toLowerCase().includes(search.toLowerCase()) ||
      flag.key.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Get unique categories
  const categories = ['all', ...Array.from(new Set(flags.map((f: FeatureFlag) => f.category)))];

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i: number) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Feature Flags</h1>
        <p className="text-gray-600">
          Manage feature rollouts and advanced settings visibility
        </p>
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search flags..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((category: string) => (
            <option key={category} value={category}>
              {category === 'all' ? 'All Categories' : category}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{flags.length}</div>
          <div className="text-sm text-gray-600">Total Flags</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-green-600">
            {flags.filter((f: FeatureFlag) => f.enabled).length}
          </div>
          <div className="text-sm text-gray-600">Enabled</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-red-600">
            {flags.filter((f: FeatureFlag) => f.riskLevel === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High Risk</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">
            {flags.filter((f: FeatureFlag) => f.complexity === 'advanced').length}
          </div>
          <div className="text-sm text-gray-600">Advanced</div>
        </div>
      </div>

      {/* Flags Grid */}
      {filteredFlags.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFlags.map((flag: FeatureFlag) => (
            <FeatureFlagCard
              key={flag.id}
              flag={flag}
              onToggle={handleToggle}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">No feature flags found</div>
          <div className="text-sm text-gray-500">
            {search ? 'Try adjusting your search terms' : 'No flags match the current filter'}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeatureFlagDashboard;