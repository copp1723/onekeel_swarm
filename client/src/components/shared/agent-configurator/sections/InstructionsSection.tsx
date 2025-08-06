import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, MessageSquare, Plus, X, AlertCircle } from 'lucide-react';
import type { InstructionsSectionProps } from '../types';
import { useInstructions } from '../hooks/useInstructions';

/**
 * Instructions Section Component
 * Handles do's and don'ts management
 */
export function InstructionsSection({ 
  formData, 
  setFormData, 
  errors 
}: InstructionsSectionProps) {
  
  const {
    getCurrentInstructions,
    addInstruction,
    updateInstruction,
    removeInstruction
  } = useInstructions(formData, setFormData);

  const instructions = getCurrentInstructions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BookOpen className="h-5 w-5" />
          <span>Instructions</span>
        </CardTitle>
        <CardDescription>
          Define what your agent should and shouldn't do
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {errors.instructions && (
          <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{errors.instructions}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Do's */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <Label className="text-green-700 font-medium">Do's</Label>
              <Badge variant="outline" className="text-green-600 border-green-200">
                {instructions.dos.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {instructions.dos.map((instruction: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={instruction}
                    onChange={(e) => updateInstruction('dos', index, e.target.value)}
                    placeholder="What should the agent do?"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction('dos', index)}
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
                onClick={() => addInstruction('dos')}
                className="w-full text-green-600 border-green-200 hover:bg-green-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Do
              </Button>
            </div>
          </div>

          {/* Don'ts */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <X className="h-4 w-4 text-red-600" />
              <Label className="text-red-700 font-medium">Don'ts</Label>
              <Badge variant="outline" className="text-red-600 border-red-200">
                {instructions.donts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {instructions.donts.map((instruction: string, index: number) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    value={instruction}
                    onChange={(e) => updateInstruction('donts', index, e.target.value)}
                    placeholder="What should the agent avoid?"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction('donts', index)}
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
                onClick={() => addInstruction('donts')}
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Don't
              </Button>
            </div>
          </div>
        </div>

        {/* Instructions Summary */}
        {(instructions.dos.length > 0 || instructions.donts.length > 0) && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Summary:</strong> {instructions.dos.length} do's and {instructions.donts.length} don'ts defined
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
