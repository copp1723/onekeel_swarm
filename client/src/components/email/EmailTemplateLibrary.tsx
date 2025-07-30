import React, { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Copy, Eye, Search, Filter, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/useDebounce';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  plainText?: string;
  category: 'initial_contact' | 'follow_up' | 'nurture' | 'custom';
  variables: string[];
  metadata?: Record<string, any>;
  performance?: {
    sent: number;
    opened: number;
    clicked: number;
    replied: number;
  };
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
  plainText: string;
  category: string;
}

const categoryLabels = {
  initial_contact: 'Initial Contact',
  follow_up: 'Follow Up',
  nurture: 'Nurture',
  custom: 'Custom'
};

const categoryColors = {
  initial_contact: 'blue',
  follow_up: 'green',
  nurture: 'purple',
  custom: 'gray'
};

export function EmailTemplateLibrary() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    subject: '',
    content: '',
    plainText: '',
    category: 'custom'
  });

  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    companyName: 'Acme Corp'
  });

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/email/templates');
      const data = await response.json();
      
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch email templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      const url = editingTemplate 
        ? `/api/email/templates/${editingTemplate.id}`
        : '/api/email/templates';
      
      const method = editingTemplate ? 'PUT' : 'POST';
      
      // Extract variables from content
      const variableMatches = formData.content.match(/\{\{(\w+)\}\}/g) || [];
      const variables = [...new Set(variableMatches.map(v => v.replace(/\{\{|\}\}/g, '')))];
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          variables,
          plainText: formData.plainText || stripHtml(formData.content)
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: `Template ${editingTemplate ? 'updated' : 'created'} successfully`
        });
        setShowCreateDialog(false);
        resetForm();
        fetchTemplates();
      } else {
        throw new Error(data.error?.message || 'Failed to save template');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/email/templates/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template deleted successfully'
        });
        fetchTemplates();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const response = await fetch('/api/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          content: template.content,
          plainText: template.plainText,
          category: template.category,
          variables: template.variables
        })
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Template duplicated successfully'
        });
        fetchTemplates();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive'
      });
    }
  };

  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const processTemplate = (template: string, variables: Record<string, string>): string => {
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processed = processed.replace(regex, value);
    });
    return processed;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      content: '',
      plainText: '',
      category: 'custom'
    });
    setEditingTemplate(null);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = !debouncedSearch || 
      template.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      template.subject.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      template.content.toLowerCase().includes(debouncedSearch.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const getPerformanceRate = (sent: number, metric: number): string => {
    if (sent === 0) return '0%';
    return `${Math.round((metric / sent) * 100)}%`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Template Library</CardTitle>
              <CardDescription>
                Manage and organize your email templates
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="initial_contact">Initial Contact</SelectItem>
                <SelectItem value="follow_up">Follow Up</SelectItem>
                <SelectItem value="nurture">Nurture</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <p className="text-gray-500">Loading templates...</p>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'No templates found matching your criteria'
                  : 'No templates created yet'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-lg">{template.name}</h3>
                      <Badge variant="outline" className={`text-${categoryColors[template.category]}-600`}>
                        {categoryLabels[template.category]}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.subject}
                    </p>
                    
                    {template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {template.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {template.performance && template.performance.sent > 0 && (
                      <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 mb-3">
                        <div>
                          <p className="font-medium">Sent</p>
                          <p>{template.performance.sent}</p>
                        </div>
                        <div>
                          <p className="font-medium">Opened</p>
                          <p>{getPerformanceRate(template.performance.sent, template.performance.opened)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Clicked</p>
                          <p>{getPerformanceRate(template.performance.sent, template.performance.clicked)}</p>
                        </div>
                        <div>
                          <p className="font-medium">Replied</p>
                          <p>{getPerformanceRate(template.performance.sent, template.performance.replied)}</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPreviewTemplate(template);
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate(template);
                            setFormData({
                              name: template.name,
                              subject: template.subject,
                              content: template.content,
                              plainText: template.plainText || '',
                              category: template.category
                            });
                            setShowCreateDialog(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(template)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(template.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <Badge variant={template.active ? 'default' : 'secondary'}>
                        {template.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Email Template' : 'Create Email Template'}
            </DialogTitle>
            <DialogDescription>
              Create reusable email templates with dynamic variables
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="initial_contact">Initial Contact</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="nurture">Nurture</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Welcome to {{companyName}}, {{firstName}}!"
              />
            </div>

            <Tabs defaultValue="html" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html">HTML Content</TabsTrigger>
                <TabsTrigger value="plain">Plain Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="html">
                <div>
                  <Label htmlFor="content">HTML Content</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Enter your email content with HTML formatting..."
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use variables like {`{{firstName}}`}, {`{{lastName}}`}, {`{{email}}`}, {`{{companyName}}`}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="plain">
                <div>
                  <Label htmlFor="plainText">Plain Text Content</Label>
                  <Textarea
                    id="plainText"
                    value={formData.plainText}
                    onChange={(e) => setFormData({ ...formData, plainText: e.target.value })}
                    placeholder="Enter plain text version of your email..."
                    className="min-h-[300px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setFormData({ ...formData, plainText: stripHtml(formData.content) })}
                  >
                    Generate from HTML
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrUpdate}>
              {editingTemplate ? 'Update Template' : 'Create Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
            <DialogDescription>
              Preview how your template will look with sample data
            </DialogDescription>
          </DialogHeader>
          
          {previewTemplate && (
            <div className="space-y-4">
              {/* Variable Inputs */}
              <div className="border-b pb-4">
                <h4 className="font-medium mb-2">Preview Variables</h4>
                <div className="grid grid-cols-2 gap-3">
                  {previewTemplate.variables.map((variable) => (
                    <div key={variable}>
                      <Label htmlFor={`var-${variable}`} className="text-sm">
                        {variable}
                      </Label>
                      <Input
                        id={`var-${variable}`}
                        value={previewVariables[variable] || ''}
                        onChange={(e) => setPreviewVariables({
                          ...previewVariables,
                          [variable]: e.target.value
                        })}
                        placeholder={`Enter ${variable}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Email Preview */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Subject</p>
                  <p className="text-lg font-semibold">
                    {processTemplate(previewTemplate.subject, previewVariables)}
                  </p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Content</p>
                  <div className="border rounded-lg p-4 bg-white">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: processTemplate(previewTemplate.content, previewVariables) 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}