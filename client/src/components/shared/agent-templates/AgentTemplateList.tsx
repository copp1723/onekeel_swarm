import React, { useState } from 'react';
import { AgentTemplate } from '@/types';
import { AgentTemplateCard } from './AgentTemplateCard';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface AgentTemplateListProps {
  templates: AgentTemplate[];
  onUseTemplate: (template: AgentTemplate) => void;
  onCloneTemplate: (template: AgentTemplate) => void;
  onViewTemplateDetails: (template: AgentTemplate) => void;
}

export function AgentTemplateList({
  templates,
  onUseTemplate,
  onCloneTemplate,
  onViewTemplateDetails
}: AgentTemplateListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Extract unique categories and types
  const categories = ['all', ...new Set(templates.map(t => t.category))];
  const types = ['all', ...new Set(templates.map(t => t.type))];
  
  // Filter templates based on search and filters
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    const matchesType = typeFilter === 'all' || template.type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <div className="flex gap-4">
          <div className="w-40">
            <Label htmlFor="category-filter" className="text-xs mb-1 block">Category</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger id="category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-40">
            <Label htmlFor="type-filter" className="text-xs mb-1 block">Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger id="type-filter">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {types.map(type => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 border rounded-md bg-gray-50">
          <p className="text-gray-500">No templates found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <AgentTemplateCard
              key={template.id}
              template={template}
              onUse={onUseTemplate}
              onClone={onCloneTemplate}
              onViewDetails={onViewTemplateDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default AgentTemplateList;