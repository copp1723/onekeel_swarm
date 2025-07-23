import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Plus, 
  Edit,
  Trash2,
  Save,
  X,
  Eye,
  Code,
  Mail
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
}

export function TemplateEditor() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    variables: [] as string[],
    category: 'custom'
  });
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      subject: template.subject,
      content: template.content,
      variables: template.variables,
      category: template.category
    });
    setIsEditing(false);
    setShowPreview(false);
    
    // Initialize preview variables
    const vars: Record<string, string> = {};
    template.variables.forEach(v => {
      vars[v] = `[${v}]`;
    });
    setPreviewVariables(vars);
  };

  const handleSave = async () => {
    try {
      const url = selectedTemplate && !isEditing
        ? `/api/email/templates/${selectedTemplate.id}`
        : '/api/email/templates';
      
      const method = selectedTemplate && !isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadTemplates();
        setIsEditing(false);
        
        // If creating new, clear selection
        if (!selectedTemplate || isEditing) {
          setSelectedTemplate(null);
          setFormData({
            name: '',
            subject: '',
            content: '',
            variables: [],
            category: 'custom'
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
      const response = await fetch(`/api/email/templates/${selectedTemplate.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadTemplates();
        setSelectedTemplate(null);
        setFormData({
          name: '',
          subject: '',
          content: '',
          variables: [],
          category: 'custom'
        });
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const extractVariables = (content: string) => {
    const regex = /\{\{(\w+)\}\}/g;
    const vars = new Set<string>();
    let match;
    while ((match = regex.exec(content)) !== null) {
      vars.add(match[1]);
    }
    return Array.from(vars);
  };

  const handleContentChange = (field: 'subject' | 'content', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Extract variables from all content
    const allContent = field === 'subject' ? value + formData.content
                     : formData.subject + value;
    
    const vars = extractVariables(allContent);
    setFormData(prev => ({ ...prev, variables: vars }));
    
    // Update preview variables
    const newPreviewVars: Record<string, string> = {};
    vars.forEach(v => {
      newPreviewVars[v] = previewVariables[v] || `[${v}]`;
    });
    setPreviewVariables(newPreviewVars);
  };

  const renderPreview = () => {
    let content = formData.content;
    let subject = formData.subject;
    
    Object.entries(previewVariables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      content = content.replace(regex, value);
      subject = subject.replace(regex, value);
    });
    
    return { content, subject };
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Template List */}
      <div className="col-span-3">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg">Templates</CardTitle>
            <CardDescription>Email templates library</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setIsEditing(true);
                setFormData({
                  name: '',
                  subject: '',
                  content: '',
                  variables: [],
                  category: 'custom'
                });
              }}
              className="w-full mb-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
            
            <div className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-medium text-sm">{template.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="outline" className="text-xs">
                      {template.category}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {template.variables.length} vars
                    </span>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No templates yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Editor */}
      <div className="col-span-9">
        {(selectedTemplate || isEditing) ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {isEditing ? 'Create New Template' : 'Edit Template'}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {selectedTemplate && !isEditing && (
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
                  {isEditing && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (selectedTemplate) {
                            handleTemplateSelect(selectedTemplate);
                          } else {
                            setIsEditing(false);
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
            <CardContent>
              {showPreview ? (
                <div className="space-y-6">
                  {/* Preview Variables */}
                  {formData.variables.length > 0 && (
                    <div>
                      <Label className="mb-2">Preview Variables</Label>
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

                  {/* Email Preview */}
                  <div>
                    <Label className="mb-2">Email Preview</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b">
                        <p className="text-sm text-gray-600">Subject:</p>
                        <p className="font-medium">{renderPreview().subject}</p>
                      </div>
                      <div className="p-4 bg-white">
                        <pre className="whitespace-pre-wrap text-sm">
                          {renderPreview().content}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Tabs defaultValue="content" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="content">Content</TabsTrigger>
                    <TabsTrigger value="variables">Variables</TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Welcome Email"
                        disabled={!isEditing}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject Line</Label>
                      <Input
                        id="subject"
                        value={formData.subject}
                        onChange={(e) => handleContentChange('subject', e.target.value)}
                        placeholder="e.g., Welcome to {{companyName}}, {{firstName}}!"
                        disabled={!isEditing}
                      />
                      <p className="text-sm text-gray-500">
                        Use {`{{variableName}}`} for dynamic content
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="content">Email Content</Label>
                      <Textarea
                        id="content"
                        value={formData.content}
                        onChange={(e) => handleContentChange('content', e.target.value)}
                        placeholder="Email content with variables like {{firstName}}, {{vehicleInterest}}..."
                        rows={10}
                        disabled={!isEditing}
                      />
                    </div>
                  </TabsContent>


                  <TabsContent value="variables" className="space-y-4">
                    <div>
                      <Label className="mb-2">Template Variables</Label>
                      <p className="text-sm text-gray-500 mb-4">
                        These variables are automatically detected from your template content.
                      </p>
                      {formData.variables.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formData.variables.map((variable) => (
                            <Badge key={variable} variant="secondary">
                              <Code className="h-3 w-3 mr-1" />
                              {`{{${variable}}}`}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No variables found. Add variables using {`{{variableName}}`} syntax.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Mail className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Select a template to edit
              </h3>
              <p className="text-gray-500">
                Choose a template from the list or create a new one.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}