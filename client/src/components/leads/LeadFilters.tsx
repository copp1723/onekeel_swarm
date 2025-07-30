import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  Star,
  Mail,
  Phone,
  MessageSquare,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';

export interface LeadFilters {
  search: string;
  status: string[];
  source: string[];
  assignedChannel: string[];
  qualificationScoreRange: [number, number];
  creditScoreRange: [number, number];
  incomeRange: [number, number];
  dateRange: {
    from?: Date;
    to?: Date;
  };
  campaignId: string[];
  hasNotes: boolean | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface LeadFiltersProps {
  filters: LeadFilters;
  onFiltersChange: (filters: LeadFilters) => void;
  availableSources: string[];
  availableCampaigns: Array<{ id: string; name: string }>;
  totalResults: number;
  loading?: boolean;
}

const defaultFilters: LeadFilters = {
  search: '',
  status: [],
  source: [],
  assignedChannel: [],
  qualificationScoreRange: [0, 100],
  creditScoreRange: [300, 850],
  incomeRange: [0, 500000],
  dateRange: {},
  campaignId: [],
  hasNotes: null,
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

export function LeadFilters({
  filters,
  onFiltersChange,
  availableSources,
  availableCampaigns,
  totalResults,
  loading = false
}: LeadFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const statusOptions = [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'converted', label: 'Converted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const channelOptions = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'sms', label: 'SMS', icon: Phone },
    { value: 'chat', label: 'Chat', icon: MessageSquare }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Updated Date' },
    { value: 'qualificationScore', label: 'Qualification Score' },
    { value: 'creditScore', label: 'Credit Score' },
    { value: 'income', label: 'Income' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'email', label: 'Email' }
  ];

  const updateFilter = (key: keyof LeadFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const toggleArrayFilter = (key: keyof LeadFilters, value: string) => {
    const currentArray = localFilters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const resetFilters = () => {
    setLocalFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  const hasActiveFilters = () => {
    return (
      localFilters.search !== '' ||
      localFilters.status.length > 0 ||
      localFilters.source.length > 0 ||
      localFilters.assignedChannel.length > 0 ||
      localFilters.qualificationScoreRange[0] !== 0 ||
      localFilters.qualificationScoreRange[1] !== 100 ||
      localFilters.creditScoreRange[0] !== 300 ||
      localFilters.creditScoreRange[1] !== 850 ||
      localFilters.incomeRange[0] !== 0 ||
      localFilters.incomeRange[1] !== 500000 ||
      localFilters.dateRange.from ||
      localFilters.dateRange.to ||
      localFilters.campaignId.length > 0 ||
      localFilters.hasNotes !== null
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.status.length > 0) count++;
    if (localFilters.source.length > 0) count++;
    if (localFilters.assignedChannel.length > 0) count++;
    if (localFilters.qualificationScoreRange[0] !== 0 || localFilters.qualificationScoreRange[1] !== 100) count++;
    if (localFilters.creditScoreRange[0] !== 300 || localFilters.creditScoreRange[1] !== 850) count++;
    if (localFilters.incomeRange[0] !== 0 || localFilters.incomeRange[1] !== 500000) count++;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.campaignId.length > 0) count++;
    if (localFilters.hasNotes !== null) count++;
    return count;
  };

  return (
    <div className="space-y-4">
      {/* Quick Search and Basic Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search leads by name, email, phone..."
                  value={localFilters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select 
              value={localFilters.status.length === 1 ? localFilters.status[0] : 'multiple'}
              onValueChange={(value) => {
                if (value === 'all') {
                  updateFilter('status', []);
                } else if (value !== 'multiple') {
                  updateFilter('status', [value]);
                }
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select 
              value={localFilters.sortBy}
              onValueChange={(value) => updateFilter('sortBy', value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort Order */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilter('sortOrder', localFilters.sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {localFilters.sortOrder === 'asc' ? '↑' : '↓'}
            </Button>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>Filters</span>
              {getActiveFilterCount() > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>

            {/* Reset Filters */}
            {hasActiveFilters() && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Results Count */}
          <div className="mt-3 text-sm text-gray-600">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>{totalResults} lead{totalResults !== 1 ? 's' : ''} found</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters */}
      {isExpanded && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center space-x-2">
                <Filter className="h-5 w-5" />
                <span>Advanced Filters</span>
              </span>
              <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Multi-Select */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {statusOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={localFilters.status.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('status', option.value)}
                    />
                    <Label htmlFor={`status-${option.value}`} className="text-sm">
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Source Multi-Select */}
            <div>
              <Label className="text-sm font-medium">Source</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {availableSources.map(source => (
                  <div key={source} className="flex items-center space-x-2">
                    <Checkbox
                      id={`source-${source}`}
                      checked={localFilters.source.includes(source)}
                      onCheckedChange={() => toggleArrayFilter('source', source)}
                    />
                    <Label htmlFor={`source-${source}`} className="text-sm">
                      {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Channel Multi-Select */}
            <div>
              <Label className="text-sm font-medium">Assigned Channel</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {channelOptions.map(option => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`channel-${option.value}`}
                      checked={localFilters.assignedChannel.includes(option.value)}
                      onCheckedChange={() => toggleArrayFilter('assignedChannel', option.value)}
                    />
                    <Label htmlFor={`channel-${option.value}`} className="text-sm flex items-center space-x-1">
                      <option.icon className="h-3 w-3" />
                      <span>{option.label}</span>
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Campaign Multi-Select */}
            {availableCampaigns.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Campaign</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableCampaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`campaign-${campaign.id}`}
                        checked={localFilters.campaignId.includes(campaign.id)}
                        onCheckedChange={() => toggleArrayFilter('campaignId', campaign.id)}
                      />
                      <Label htmlFor={`campaign-${campaign.id}`} className="text-sm">
                        {campaign.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Ranges */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Qualification Score */}
              <div>
                <Label className="text-sm font-medium">Qualification Score</Label>
                <div className="mt-2">
                  <Slider
                    value={localFilters.qualificationScoreRange}
                    onValueChange={(value) => updateFilter('qualificationScoreRange', value)}
                    max={100}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{localFilters.qualificationScoreRange[0]}</span>
                    <span>{localFilters.qualificationScoreRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Credit Score */}
              <div>
                <Label className="text-sm font-medium">Credit Score</Label>
                <div className="mt-2">
                  <Slider
                    value={localFilters.creditScoreRange}
                    onValueChange={(value) => updateFilter('creditScoreRange', value)}
                    max={850}
                    min={300}
                    step={10}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{localFilters.creditScoreRange[0]}</span>
                    <span>{localFilters.creditScoreRange[1]}</span>
                  </div>
                </div>
              </div>

              {/* Income Range */}
              <div>
                <Label className="text-sm font-medium">Annual Income</Label>
                <div className="mt-2">
                  <Slider
                    value={localFilters.incomeRange}
                    onValueChange={(value) => updateFilter('incomeRange', value)}
                    max={500000}
                    min={0}
                    step={5000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>${localFilters.incomeRange[0].toLocaleString()}</span>
                    <span>${localFilters.incomeRange[1].toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div>
              <Label className="text-sm font-medium">Created Date Range</Label>
              <div className="mt-2">
                <DatePickerWithRange
                  date={localFilters.dateRange}
                  onDateChange={(range) => updateFilter('dateRange', range || {})}
                />
              </div>
            </div>

            {/* Has Notes Filter */}
            <div>
              <Label className="text-sm font-medium">Notes</Label>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has-notes"
                    checked={localFilters.hasNotes === true}
                    onCheckedChange={(checked) => updateFilter('hasNotes', checked ? true : null)}
                  />
                  <Label htmlFor="has-notes" className="text-sm">Has Notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="no-notes"
                    checked={localFilters.hasNotes === false}
                    onCheckedChange={(checked) => updateFilter('hasNotes', checked ? false : null)}
                  />
                  <Label htmlFor="no-notes" className="text-sm">No Notes</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters() && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Active Filters:</span>
                <div className="flex flex-wrap gap-1">
                  {localFilters.search && (
                    <Badge variant="secondary" className="flex items-center space-x-1">
                      <span>Search: {localFilters.search}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => updateFilter('search', '')}
                      />
                    </Badge>
                  )}
                  {localFilters.status.map(status => (
                    <Badge key={status} variant="secondary" className="flex items-center space-x-1">
                      <span>Status: {status}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleArrayFilter('status', status)}
                      />
                    </Badge>
                  ))}
                  {localFilters.source.map(source => (
                    <Badge key={source} variant="secondary" className="flex items-center space-x-1">
                      <span>Source: {source}</span>
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => toggleArrayFilter('source', source)}
                      />
                    </Badge>
                  ))}
                  {/* Add more active filter badges as needed */}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
