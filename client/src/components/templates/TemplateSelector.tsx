import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  FileText, 
  Mail, 
  MessageSquare, 
  Check,
  Eye,
  Sparkles,
  Filter
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  subject?: string;
  content: string;
  channel: 'email' | 'sms';
  category: string;
  variables: string[];
  active: boolean;
  description?: string;
}

interface TemplateSelectorProps {
  channel: 'email' | 'sms' | 'both';
  selectedTemplates: string[];
  onTemplateSelect: (templateIds: string[]) => void;
  onTemplatesApply?: (templates: Template[]) => void;
  maxSelection?: number;
  allowMultiple?: boolean;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  channel,
  selectedTemplates,
  onTemplateSelect,
  onTemplatesApply,
  maxSelection,
  allowMultiple = true
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [localSelection, setLocalSelection] = useState<string[]>(selectedTemplates);

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'welcome', name: 'Welcome' },
    { id: 'follow-up', name: 'Follow-up' },
    { id: 'promotion', name: 'Promotion' },
    { id: 'reminder', name: 'Reminder' },
    { id: 'custom', name: 'Custom' }
  ];

  useEffect(() => {
    loadTemplates();
  }, [channel]);

  useEffect(() => {
    setLocalSelection(selectedTemplates);
  }, [selectedTemplates]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (channel !== 'both') {
        params.append('channel', channel);
      }
      params.append('active', 'true');

      const response = await fetch(`/api/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateToggle = (templateId: string) => {
    if (allowMultiple) {
      const isSelected = localSelection.includes(templateId);
      let newSelection: string[];
      
      if (isSelected) {
        newSelection = localSelection.filter(id => id !== templateId);
      } else {
        if (maxSelection && localSelection.length >= maxSelection) {
          // Remove the first selected to make room
          newSelection = [...localSelection.slice(1), templateId];
        } else {
          newSelection = [...localSelection, templateId];
        }
      }
      
      setLocalSelection(newSelection);
      onTemplateSelect(newSelection);
    } else {
      // Single selection mode
      setLocalSelection([templateId]);
      onTemplateSelect([templateId]);
    }
  };

  const handleApplyTemplates = () => {
    if (onTemplatesApply) {
      const selectedTemplateObjects = templates.filter(t => 
        localSelection.includes(t.id)
      );
      onTemplatesApply(selectedTemplateObjects);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesChannel = channel === 'both' || template.channel === channel;
    
    return matchesSearch && matchesCategory && matchesChannel;
  });

  const renderTemplatePreview = (template: Template) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{template.name}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewTemplate(null)}
            >
              ✕
            </Button>
          </CardHeader>
          <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
            <div className="space-y-4">
              {template.description && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Description</p>
                  <p className="text-sm">{template.description}</p>
                </div>
              )}
              
              {template.channel === 'email' && template.subject && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Subject</p>
                  <p className="text-sm bg-gray-50 p-2 rounded">{template.subject}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm text-gray-600 font-medium mb-1">Content</p>
                <pre className="text-sm bg-gray-50 p-3 rounded whitespace-pre-wrap font-sans">
                  {template.content}
                </pre>
              </div>
              
              {template.variables.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 font-medium mb-1">Variables</p>
                  <div className="flex flex-wrap gap-2">
                    {template.variables.map(variable => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="flex items-center space-x-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selection Info */}
      {allowMultiple && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-900">
                {localSelection.length} template{localSelection.length !== 1 ? 's' : ''} selected
                {maxSelection && ` (max ${maxSelection})`}
              </span>
            </div>
            {onTemplatesApply && localSelection.length > 0 && (
              <Button size="sm" onClick={handleApplyTemplates}>
                Apply Templates
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Template Grid */}
      <ScrollArea className="h-[400px] pr-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="h-12 w-12 mb-2 text-gray-300" />
            <p className="text-sm">No templates found</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredTemplates.map(template => {
              const isSelected = localSelection.includes(template.id);
              return (
                <div
                  key={template.id}
                  onClick={() => handleTemplateToggle(template.id)}
                  className={`
                    relative p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                    }
                  `}
                >
                  {/* Selection Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Template Info */}
                  <div className="pr-8">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{template.name}</h4>
                        {template.description && (
                          <p className="text-xs text-gray-600 mt-1">{template.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Template Preview */}
                    <div className="text-xs text-gray-500 mb-3 line-clamp-2">
                      {template.channel === 'email' && template.subject && (
                        <p className="mb-1">
                          <span className="font-medium">Subject:</span> {template.subject}
                        </p>
                      )}
                      <p className="line-clamp-2">{template.content}</p>
                    </div>

                    {/* Template Metadata */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {template.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {template.channel === 'email' ? (
                            <><Mail className="h-3 w-3 mr-1" /> Email</>
                          ) : (
                            <><MessageSquare className="h-3 w-3 mr-1" /> SMS</>
                          )}
                        </Badge>
                        {template.variables.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {template.variables.length} variable{template.variables.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(template);
                        }}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Template Preview Modal */}
      {previewTemplate && renderTemplatePreview(previewTemplate)}
    </div>
  );
};