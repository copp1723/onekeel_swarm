import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User } from 'lucide-react';
import { PERSONALITY_OPTIONS, TONE_OPTIONS, RESPONSE_LENGTH_OPTIONS } from '@/utils/agentUtils';
import type { SectionProps } from '../types';

/**
 * Personality & Behavior Section Component
 * Handles personality, tone, and response length settings
 */
export function PersonalitySection({ formData, setFormData }: SectionProps) {
  
  const handlePersonalityChange = (value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      personality: { tone: value, style: value, traits: [] } 
    }));
  };

  const handleToneChange = (value: string) => {
    setFormData(prev => ({ ...prev, tone: value }));
  };

  const handleResponseLengthChange = (value: string) => {
    setFormData(prev => ({ ...prev, responseLength: value }));
  };

  // Get current personality value
  const getCurrentPersonality = () => {
    if (typeof formData.personality === 'object' && formData.personality?.style) {
      return formData.personality.style;
    }
    if (typeof formData.personality === 'string') {
      return formData.personality;
    }
    return 'professional';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <User className="h-5 w-5" />
          <span>Personality & Behavior</span>
        </CardTitle>
        <CardDescription>
          Define how your agent communicates and responds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Personality */}
          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Select
              value={getCurrentPersonality()}
              onValueChange={handlePersonalityChange}
            >
              <SelectTrigger id="personality">
                <SelectValue placeholder="Select personality" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERSONALITY_OPTIONS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex flex-col">
                      <span>{label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tone */}
          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select
              value={formData.tone || 'friendly'}
              onValueChange={handleToneChange}
            >
              <SelectTrigger id="tone">
                <SelectValue placeholder="Select tone" />
              </SelectTrigger>
              <SelectContent>
                {TONE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Response Length */}
          <div className="space-y-2">
            <Label htmlFor="responseLength">Response Length</Label>
            <Select
              value={formData.responseLength || 'moderate'}
              onValueChange={handleResponseLengthChange}
            >
              <SelectTrigger id="responseLength">
                <SelectValue placeholder="Select length" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_LENGTH_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Personality Description */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Personality:</strong> {PERSONALITY_OPTIONS[getCurrentPersonality() as keyof typeof PERSONALITY_OPTIONS]} •
            <strong> Tone:</strong> {TONE_OPTIONS.find(t => t.value === formData.tone)?.label || 'Friendly'} •
            <strong> Length:</strong> {RESPONSE_LENGTH_OPTIONS.find(r => r.value === formData.responseLength)?.label || 'Moderate'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
