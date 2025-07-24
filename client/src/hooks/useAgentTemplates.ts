import { useState, useEffect, useCallback } from 'react';
import { AgentTemplate } from '@/types';

export function useAgentTemplates() {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [templatesByCategory, setTemplatesByCategory] = useState<Record<string, AgentTemplate[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/agent-templates');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      setTemplates(data.templates);
      
      // Group templates by category
      const grouped = data.templates.reduce((acc: Record<string, AgentTemplate[]>, template: AgentTemplate) => {
        if (!acc[template.category]) {
          acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
      }, {});
      
      setTemplatesByCategory(grouped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching agent templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTemplatesByCategory = useCallback(async (category: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agent-templates/category/${category}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.templates;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error(`Error fetching ${category} templates:`, err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agent-templates/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching agent template:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const cloneTemplate = useCallback(async (id: string, name?: string, description?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agent-templates/${id}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clone template: ${response.statusText}`);
      }
      
      const data = await response.json();
      await fetchTemplates(); // Refresh templates
      return data.template;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error cloning agent template:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchTemplates]);

  const createAgentFromTemplate = useCallback(async (id: string, name: string, paramValues: Record<string, string>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/agent-templates/${id}/create-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, paramValues })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data.agent;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error creating agent from template:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    templatesByCategory,
    loading,
    error,
    fetchTemplates,
    fetchTemplatesByCategory,
    getTemplate,
    cloneTemplate,
    createAgentFromTemplate
  };
}

export default useAgentTemplates;