import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { 
  FileText, 
  Save, 
  Trash2, 
  Copy, 
  Star,
  StarOff,
  Calendar,
  Target,
  Users,
  Mail,
  Search,
  Plus
} from 'lucide-react';
import { CampaignData } from './types';

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  industry?: string;
  campaignData: CampaignData;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  isFavorite: boolean;
  tags: string[];
}

interface CampaignTemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CampaignData) => void;
  onSaveTemplate?: (templateData: Omit<CampaignTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => void;
  currentCampaign?: CampaignData;
  mode: 'load' | 'save' | 'manage';
}

export function CampaignTemplateLibrary({ 
  isOpen, 
  onClose, 
  onSelectTemplate, 
  onSaveTemplate,
  currentCampaign,
  mode = 'load'
}: CampaignTemplateLibraryProps) {
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CampaignTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Save template form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateIndustry, setTemplateIndustry] = useState('');
  const [templateTags, setTemplateTags] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      
      // Pre-fill save form if in save mode
      if (mode === 'save' && currentCampaign) {
        setTemplateName(currentCampaign.name || '');
        setTemplateDescription(currentCampaign.description || '');
      }
    }
  }, [isOpen, mode, currentCampaign]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchQuery, selectedIndustry]);

  const loadTemplates = async () => {
    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API when backend is ready
      // const response = await fetch('/api/campaigns/templates');

      // For now, return empty templates array since API doesn't exist yet
      console.log('Template library API not yet available - using empty state');
      setTemplates([]);

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template => 
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filter by industry
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(template => template.industry === selectedIndustry);
    }

    // Sort by favorites first, then by usage count
    filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return b.usageCount - a.usageCount;
    });

    setFilteredTemplates(filtered);
  };

  const handleSaveTemplate = async () => {
    if (!currentCampaign || !templateName.trim()) {
      setError('Template name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // TODO: Replace with actual API when backend is ready
      // const response = await fetch('/api/campaigns/templates', { ... });

      console.log('Template save API not yet available - showing success message');

      // Simulate successful save for now
      const templateData = {
        name: templateName,
        description: templateDescription,
        industry: templateIndustry || undefined,
        campaignData: currentCampaign,
        isFavorite: false,
        tags: templateTags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      // Call callback if provided
      if (onSaveTemplate) {
        onSaveTemplate(templateData);
      }

      // Reset form
      setTemplateName('');
      setTemplateDescription('');
      setTemplateIndustry('');
      setTemplateTags('');

      // Show success message
      alert('Template saved successfully! (Note: Template library backend coming soon)');
      onClose();

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (template: CampaignTemplate) => {
    try {
      // TODO: Replace with actual API when backend is ready
      // await fetch(`/api/campaigns/templates/${template.id}/use`, { ... });

      console.log('Template usage tracking API not yet available');

      // Proceed with selection without API call
      onSelectTemplate(template.campaignData);
      onClose();
    } catch (error) {
      console.error('Error selecting template:', error);
      // Still proceed with selection
      onSelectTemplate(template.campaignData);
      onClose();
    }
  };

  const toggleFavorite = async (templateId: string) => {
    try {
      // TODO: Replace with actual API when backend is ready
      console.log('Template favorite API not yet available');

      // Update local state only for now
      setTemplates(prev => prev.map(t =>
        t.id === templateId
          ? { ...t, isFavorite: !t.isFavorite }
          : t
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      // TODO: Replace with actual API when backend is ready
      console.log('Template delete API not yet available');

      // Update local state only for now
      setTemplates(prev => prev.filter(t => t.id !== templateId));

    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Failed to delete template');
    }
  };

  const industries = Array.from(new Set(templates.map(t => t.industry).filter((industry): industry is string => Boolean(industry))));

  const getTitle = () => {
    switch (mode) {
      case 'save': return 'Save Campaign Template';
      case 'manage': return 'Manage Campaign Templates';
      default: return 'Campaign Template Library';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'save': return 'Save this campaign configuration as a reusable template';
      case 'manage': return 'Organize and manage your campaign templates';
      default: return 'Choose a template to start your campaign';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[700px] sm:max-w-[700px] h-full overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>{getTitle()}</span>
          </SheetTitle>
          <SheetDescription>
            {getDescription()}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col mt-6">
          {mode === 'save' ? (
            /* Save Template Form */
            <div className="space-y-4">
              <div>
                <Label htmlFor="templateName">Template Name</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Real Estate Lead Nurture"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="templateDescription">Description</Label>
                <Textarea
                  id="templateDescription"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe when and how to use this template..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="templateIndustry">Industry (Optional)</Label>
                <Input
                  id="templateIndustry"
                  value={templateIndustry}
                  onChange={(e) => setTemplateIndustry(e.target.value)}
                  placeholder="e.g., Real Estate, Finance, Healthcare"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="templateTags">Tags (Optional)</Label>
                <Input
                  id="templateTags"
                  value={templateTags}
                  onChange={(e) => setTemplateTags(e.target.value)}
                  placeholder="e.g., nurture, follow-up, high-value (comma separated)"
                  className="mt-1"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveTemplate} 
                  disabled={loading || !templateName.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </div>
          ) : (
            /* Template Library */
            <>
              {/* Search and Filters */}
              <div className="space-y-4 flex-shrink-0">
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Industries</SelectItem>
                      {industries.map(industry => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Templates Grid */}
              <div className="flex-1 overflow-y-auto mt-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
                  </div>
                ) : filteredTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {filteredTemplates.map(template => (
                      <Card 
                        key={template.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => mode !== 'manage' && handleSelectTemplate(template)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm flex items-center space-x-2">
                                <span>{template.name}</span>
                                {template.isFavorite && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                )}
                              </CardTitle>
                              <div className="flex items-center space-x-2 mt-1">
                                {template.industry && (
                                  <Badge variant="outline" className="text-xs">
                                    {template.industry}
                                  </Badge>
                                )}
                                <span className="text-xs text-gray-500">
                                  Used {template.usageCount} times
                                </span>
                              </div>
                            </div>
                            {mode === 'manage' && (
                              <div className="flex space-x-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFavorite(template.id);
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  {template.isFavorite ? (
                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  ) : (
                                    <StarOff className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTemplate(template.id);
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                          
                          <div className="grid grid-cols-3 gap-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span>{template.campaignData.templates.length} emails</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3 text-gray-400" />
                              <span>{template.campaignData.audience.contacts.length} contacts</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3 text-gray-400" />
                              <span>{new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {template.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {template.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-medium mb-2">Campaign Template Library</p>
                    <p className="text-sm mb-4">Coming Soon!</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                      <p className="text-sm text-blue-700">
                        The template library feature is currently in development.
                        You can still save templates, but they won't persist until the backend is ready.
                      </p>
                    </div>
                    {searchQuery && (
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery('')}
                        className="mt-4"
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
