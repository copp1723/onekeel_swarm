import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useClient } from '@/contexts/ClientContext';
import { 
  FileText, 
  Plus, 
  Edit,
  Trash2,
  Save,
  X,
  Eye,
  Code,
  Mail,
  MessageSquare,
  Copy,
  Share2,
  Filter,
  Search,
  Folder,
  FolderPlus,
  Users,
  Globe,
  Sparkles
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
  isShared?: boolean;
  clientId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  templateCount?: number;
}

export const TemplateLibraryView: React.FC = () => {
  const { activeClient } = useClient();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([
    { id: 'welcome', name: 'Welcome', description: 'New customer welcome templates', templateCount: 0 },
    { id: 'follow-up', name: 'Follow-up', description: 'Lead nurturing and follow-up templates', templateCount: 0 },
    { id: 'promotion', name: 'Promotion', description: 'Sales and promotional templates', templateCount: 0 },
    { id: 'reminder', name: 'Reminder', description: 'Appointment and event reminders', templateCount: 0 },
    { id: 'custom', name: 'Custom', description: 'Custom templates for specific needs', templateCount: 0 }
  ]);
  
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showGlobal, setShowGlobal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms'>('all');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Template>>({
    name: '',
    subject: '',
    content: '',
    channel: 'email',
    category: 'custom',
    variables: [],
    active: true,
    description: '',
    isShared: false
  });
  
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  useEffect(() => {
    loadTemplates();
  }, [activeClient, showGlobal]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (showGlobal) {
        params.append('global', 'true');
      } else if (activeClient) {
        params.append('clientId', activeClient.id);
      }

      const response = await fetch(`/api/templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
        updateCategoryCounts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCategoryCounts = (templateList: Template[]) => {
    const counts: Record<string, number> = {};
    templateList.forEach(template => {
      counts[template.category] = (counts[template.category] || 0) + 1;
    });
    
    setCategories(prevCategories => 
      prevCategories.map(cat => ({
        ...cat,
        templateCount: counts[cat.id] || 0
      }))
    );
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      channel: template.channel,
      category: template.category,
      variables: template.variables,
      active: template.active,
      description: template.description,
      isShared: template.isShared
    });
    setIsEditing(false);
    setIsCreating(false);
    setShowPreview(false);
    
    // Initialize preview variables
    const vars: Record<string, string> = {};
    template.variables.forEach(v => {
      vars[v] = `[${v}]`;
    });
    setPreviewVariables(vars);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setIsCreating(true);
    setIsEditing(false);
    setFormData({
      name: '',
      subject: '',
      content: '',
      channel: 'email',
      category: 'custom',
      variables: [],
      active: true,
      description: '',
      isShared: false
    });
    setPreviewVariables({});
  };

  const handleSave = async () => {
    try {
      const url = selectedTemplate && !isCreating
        ? `/api/templates/${selectedTemplate.id}`
        : '/api/templates';
      
      const method = selectedTemplate && !isCreating ? 'PUT' : 'POST';
      
      const body = {
        ...formData,
        clientId: showGlobal ? null : activeClient?.id
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        await loadTemplates();
        setIsEditing(false);
        setIsCreating(false);
        
        // If creating new, clear selection
        if (isCreating) {
          setSelectedTemplate(null);
          setFormData({
            name: '',
            subject: '',
            content: '',
            channel: 'email',
            category: 'custom',
            variables: [],
            active: true,
            description: '',
            isShared: false
          });
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate || !confirm('Are you sure you want to delete this template?')) return;

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadTemplates();
        setSelectedTemplate(null);
        setFormData({
          name: '',
          subject: '',
          content: '',
          channel: 'email',
          category: 'custom',
          variables: [],
          active: true,
          description: '',
          isShared: false
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleDuplicate = () => {
    if (!selectedTemplate) return;
    
    setFormData({
      ...formData,
      name: `${formData.name} (Copy)`
    });
    setIsCreating(true);
    setIsEditing(false);
  };

  const extractVariables = (content: string, subject?: string) => {
    const regex = /\{\{(\w+)\}\}/g;
    const vars = new Set<string>();
    let match;
    
    // Extract from content
    while ((match = regex.exec(content)) !== null) {
      vars.add(match[1]);
    }
    
    // Extract from subject if email
    if (subject) {
      regex.lastIndex = 0; // Reset regex
      while ((match = regex.exec(subject)) !== null) {
        vars.add(match[1]);
      }
    }
    
    return Array.from(vars);
  };

  const handleContentChange = (field: 'subject' | 'content', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Extract variables from all content
    const vars = extractVariables(
      field === 'content' ? value : formData.content || '',
      field === 'subject' ? value : formData.subject
    );
    
    setFormData(prev => ({ ...prev, variables: vars }));
    
    // Update preview variables
    const newPreviewVars: Record<string, string> = {};
    vars.forEach(v => {
      newPreviewVars[v] = previewVariables[v] || `[${v}]`;
    });
    setPreviewVariables(newPreviewVars);
  };

  const renderPreview = () => {
    let content = formData.content || '';
    let subject = formData.subject || '';
    
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
      subject = subject.replace(regex, value);
    });
    
    return { content, subject };
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.subject?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesChannel = selectedChannel === 'all' || template.channel === selectedChannel;
    
    return matchesSearch && matchesCategory && matchesChannel;
  });

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) return;
    
    const newCat: TemplateCategory = {
      id: newCategory.name.toLowerCase().replace(/\s+/g, '-'),
      name: newCategory.name,
      description: newCategory.description,
      templateCount: 0
    };
    
    setCategories([...categories, newCat]);
    setNewCategory({ name: '', description: '' });
    setShowCategoryModal(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Template Library</h1>
          <p className="text-gray-600 mt-1">
            {showGlobal ? 'Showing global agency templates' : `Showing templates for ${activeClient?.name || 'your organization'}`}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="global-switch" className="text-sm">Show Global Templates</Label>
            <Switch 
              id="global-switch"
              checked={showGlobal}
              onCheckedChange={setShowGlobal}
            />
          </div>
          <Button onClick={handleCreateNew} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
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
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name} ({cat.templateCount})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedChannel} onValueChange={(value: 'all' | 'email' | 'sms') => setSelectedChannel(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryModal(true)}
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        {/* Template List */}
        <div className="col-span-4">
          <Card className="h-[calc(100vh-280px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Templates</CardTitle>
              <CardDescription>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3">
              <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-380px)]">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">Loading templates...</p>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No templates found</p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={handleCreateNew}
                      className="mt-2"
                    >
                      Create your first template
                    </Button>
                  </div>
                ) : (
                  filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                        selectedTemplate?.id === template.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{template.name}</p>
                          {template.description && (
                            <p className="text-xs text-gray-500 truncate mt-1">{template.description}</p>
                          )}
                        </div>
                        {template.channel === 'email' ? (
                          <Mail className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                        ) : (
                          <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                          {template.isShared && (
                            <Badge variant="secondary" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />
                              Shared
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {template.variables.length} var{template.variables.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {!template.active && (
                        <Badge variant="outline" className="text-xs mt-2 text-orange-600 border-orange-300">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Template Editor */}
        <div className="col-span-8">
          {(selectedTemplate || isCreating) ? (
            <Card className="h-[calc(100vh-280px)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    {isCreating ? 'Create New Template' : isEditing ? 'Edit Template' : selectedTemplate?.name}
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    {selectedTemplate && !isEditing && !isCreating && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPreview(!showPreview)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {showPreview ? 'Edit' : 'Preview'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDuplicate}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsEditing(true)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleDelete}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {(isEditing || isCreating) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (selectedTemplate && !isCreating) {
                              handleTemplateSelect(selectedTemplate);
                            } else {
                              setIsEditing(false);
                              setIsCreating(false);
                              setSelectedTemplate(null);
                            }
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSave}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[calc(100vh-380px)]">
                {showPreview ? (
                  <div className="space-y-6">
                    {/* Preview Variables */}
                    {formData.variables && formData.variables.length > 0 && (
                      <div>
                        <Label className="mb-3 block">Preview Variables</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {formData.variables.map((variable) => (
                            <div key={variable} className="space-y-2">
                              <Label htmlFor={`var-${variable}`} className="text-sm">
                                {variable}
                              </Label>
                              <Input
                                id={`var-${variable}`}
                                value={previewVariables[variable] || ''}
                                onChange={(e) => setPreviewVariables(prev => ({
                                  ...prev,
                                  [variable]: e.target.value
                                }))}
                                placeholder={`Enter ${variable}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Preview */}
                    <div>
                      <Label className="mb-3 block">Preview</Label>
                      <div className="border rounded-lg overflow-hidden">
                        {formData.channel === 'email' && (
                          <div className="bg-gray-50 p-4 border-b">
                            <p className="text-sm text-gray-600">Subject:</p>
                            <p className="font-medium">{renderPreview().subject}</p>
                          </div>
                        )}
                        <div className="p-4 bg-white">
                          <pre className="whitespace-pre-wrap text-sm font-sans">
                            {renderPreview().content}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Tabs defaultValue="content" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="content">Content</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                      <TabsTrigger value="variables">Variables</TabsTrigger>
                    </TabsList>

                    <TabsContent value="content" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                          id="name"
                          value={formData.name || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., Welcome Email"
                          disabled={!isEditing && !isCreating}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={formData.description || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Brief description of this template"
                          disabled={!isEditing && !isCreating}
                        />
                      </div>

                      {formData.channel === 'email' && (
                        <div className="space-y-2">
                          <Label htmlFor="subject">Subject Line</Label>
                          <Input
                            id="subject"
                            value={formData.subject || ''}
                            onChange={(e) => handleContentChange('subject', e.target.value)}
                            placeholder="e.g., Welcome to {{companyName}}, {{firstName}}!"
                            disabled={!isEditing && !isCreating}
                          />
                          <p className="text-sm text-gray-500">
                            Use {'{{variableName}}'} for dynamic content
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="content">
                          {formData.channel === 'email' ? 'Email Content' : 'Message'}
                        </Label>
                        <Textarea
                          id="content"
                          value={formData.content || ''}
                          onChange={(e) => handleContentChange('content', e.target.value)}
                          placeholder={formData.channel === 'email' 
                            ? "Email content with variables like {{firstName}}, {{productName}}..." 
                            : "SMS message with variables like {{firstName}}, {{appointmentTime}}..."}
                          rows={formData.channel === 'email' ? 12 : 4}
                          disabled={!isEditing && !isCreating}
                          className="font-mono text-sm"
                        />
                        {formData.channel === 'sms' && (
                          <p className="text-xs text-gray-500">
                            {formData.content?.length || 0}/160 characters
                          </p>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="channel">Channel</Label>
                          <Select 
                            value={formData.channel} 
                            onValueChange={(value: 'email' | 'sms') => setFormData(prev => ({ ...prev, channel: value }))}
                            disabled={!isEditing && !isCreating}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="email">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  Email
                                </div>
                              </SelectItem>
                              <SelectItem value="sms">
                                <div className="flex items-center">
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  SMS
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="category">Category</Label>
                          <Select 
                            value={formData.category} 
                            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                            disabled={!isEditing && !isCreating}
                          >
                            <SelectTrigger>
                              <SelectValue />
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
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label htmlFor="active">Active</Label>
                            <p className="text-sm text-gray-500">Template is available for use</p>
                          </div>
                          <Switch
                            id="active"
                            checked={formData.active}
                            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                            disabled={!isEditing && !isCreating}
                          />
                        </div>

                        {!showGlobal && (
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="shared">Share with Team</Label>
                              <p className="text-sm text-gray-500">Make this template available to all team members</p>
                            </div>
                            <Switch
                              id="shared"
                              checked={formData.isShared}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isShared: checked }))}
                              disabled={!isEditing && !isCreating}
                            />
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="variables" className="space-y-4">
                      <div>
                        <Label className="mb-3 block">Template Variables</Label>
                        <p className="text-sm text-gray-500 mb-4">
                          These variables are automatically detected from your template content.
                        </p>
                        {formData.variables && formData.variables.length > 0 ? (
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {formData.variables.map((variable) => (
                                <Badge key={variable} variant="secondary">
                                  <Code className="h-3 w-3 mr-1" />
                                  {`{{${variable}}}`}
                                </Badge>
                              ))}
                            </div>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <h4 className="font-medium text-sm text-blue-900 mb-2">Common Variables</h4>
                              <div className="text-sm text-blue-700 space-y-1">
                                <p><code className="bg-blue-100 px-1 rounded">{'{{firstName}}'}</code> - Recipient's first name</p>
                                <p><code className="bg-blue-100 px-1 rounded">{'{{lastName}}'}</code> - Recipient's last name</p>
                                <p><code className="bg-blue-100 px-1 rounded">{'{{email}}'}</code> - Recipient's email address</p>
                                <p><code className="bg-blue-100 px-1 rounded">{'{{companyName}}'}</code> - Your company name</p>
                                <p><code className="bg-blue-100 px-1 rounded">{'{{productName}}'}</code> - Product or service name</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Code className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                              No variables found. Add variables using {'{{variableName}}'} syntax.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-280px)]">
              <CardContent className="flex items-center justify-center h-full">
                <div className="text-center">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a template to view
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Choose a template from the list or create a new one.
                  </p>
                  <Button onClick={handleCreateNew} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-[500px]">
            <CardHeader>
              <CardTitle>Add New Category</CardTitle>
              <CardDescription>Create a new category for organizing templates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Onboarding"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-desc">Description</Label>
                <Input
                  id="cat-desc"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this category"
                />
              </div>
            </CardContent>
            <CardContent className="flex justify-end space-x-2 pt-0">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCategoryModal(false);
                  setNewCategory({ name: '', description: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>
                Add Category
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};