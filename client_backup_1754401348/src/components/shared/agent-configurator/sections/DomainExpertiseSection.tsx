import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, X } from 'lucide-react';
import { DomainExpertiseSectionProps } from '../types';
import { useDomainExpertise } from '../hooks/useDomainExpertise';

/**
 * Domain Expertise Section Component
 * Handles expertise areas management
 */
export function DomainExpertiseSection({ 
  formData, 
  setFormData 
}: DomainExpertiseSectionProps) {
  
  const {
    getCurrentExpertise,
    addDomainExpertise,
    updateDomainExpertise,
    removeDomainExpertise,
    getExpertiseCount
  } = useDomainExpertise(formData, setFormData);

  const expertise = getCurrentExpertise();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Domain Expertise</span>
        </CardTitle>
        <CardDescription>
          Areas of knowledge and specialization for this agent
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label>Expertise Areas</Label>
            <Badge variant="outline">
              {getExpertiseCount()}
            </Badge>
          </div>

          <div className="space-y-2">
            {expertise.map((expertiseItem, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Input
                  value={expertiseItem}
                  onChange={(e) => updateDomainExpertise(index, e.target.value)}
                  placeholder="e.g., Email Marketing, Lead Generation"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDomainExpertise(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDomainExpertise}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expertise Area
            </Button>
          </div>
        </div>

        {/* Expertise Examples */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-700 mb-2">
            <strong>Examples of expertise areas:</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              'Email Marketing',
              'Lead Generation',
              'Customer Support',
              'Sales Automation',
              'Content Creation',
              'Data Analysis'
            ].map((example) => (
              <Badge 
                key={example} 
                variant="outline" 
                className="text-blue-600 border-blue-200 cursor-pointer hover:bg-blue-100"
                onClick={() => {
                  if (!expertise.includes(example)) {
                    setFormData(prev => ({
                      ...prev,
                      domainExpertise: [...(prev.domainExpertise || []), example]
                    }));
                  }
                }}
              >
                {example}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Click on examples to add them to your agent's expertise
          </p>
        </div>

        {/* Expertise Summary */}
        {getExpertiseCount() > 0 && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Agent specializes in:</strong> {expertise.filter(e => e.trim()).join(', ')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
