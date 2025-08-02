import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, UserCheck, AlertCircle } from 'lucide-react';

interface HandoverRecipient {
  name: string;
  email: string;
}

interface HandoverCriteria {
  qualificationScore: number;
  conversationLength: number;
  timeThreshold: number;
  keywordTriggers: string[];
  goalCompletionRequired: string[];
  handoverRecipients: HandoverRecipient[];
}

interface HandoverConfigProps {
  handoverCriteria: HandoverCriteria;
  onHandoverCriteriaChange: (criteria: HandoverCriteria) => void;
  campaignGoals: string[];
}

const defaultHandoverCriteria: HandoverCriteria = {
  qualificationScore: 7,
  conversationLength: 5,
  timeThreshold: 300,
  keywordTriggers: [],
  goalCompletionRequired: [],
  handoverRecipients: [],
};

export function HandoverConfig({
  handoverCriteria = defaultHandoverCriteria,
  onHandoverCriteriaChange,
  campaignGoals,
}: HandoverConfigProps) {
  const [newKeyword, setNewKeyword] = useState('');
  const [newRecipient, setNewRecipient] = useState<HandoverRecipient>({
    name: '',
    email: '',
  });

  const updateCriteria = (field: keyof HandoverCriteria, value: any) => {
    onHandoverCriteriaChange({
      ...handoverCriteria,
      [field]: value,
    });
  };

  const addKeyword = () => {
    if (
      newKeyword.trim() &&
      !handoverCriteria.keywordTriggers.includes(newKeyword.trim())
    ) {
      updateCriteria('keywordTriggers', [
        ...handoverCriteria.keywordTriggers,
        newKeyword.trim(),
      ]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    updateCriteria(
      'keywordTriggers',
      handoverCriteria.keywordTriggers.filter(k => k !== keyword)
    );
  };

  const addRecipient = () => {
    if (newRecipient.name && newRecipient.email) {
      updateCriteria('handoverRecipients', [
        ...handoverCriteria.handoverRecipients,
        newRecipient,
      ]);
      setNewRecipient({ name: '', email: '' });
    }
  };

  const removeRecipient = (index: number) => {
    updateCriteria(
      'handoverRecipients',
      handoverCriteria.handoverRecipients.filter((_, i) => i !== index)
    );
  };

  const toggleGoalRequirement = (goal: string) => {
    const current = handoverCriteria.goalCompletionRequired;
    if (current.includes(goal)) {
      updateCriteria(
        'goalCompletionRequired',
        current.filter(g => g !== goal)
      );
    } else {
      updateCriteria('goalCompletionRequired', [...current, goal]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center space-x-2'>
          <UserCheck className='h-5 w-5' />
          <span>Handover Configuration</span>
        </CardTitle>
        <CardDescription>
          Configure when and how conversations are handed over to human agents
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Handover Recipients */}
        <div className='space-y-4'>
          <Label className='text-base font-medium'>Handover Recipients</Label>

          {handoverCriteria.handoverRecipients.length > 0 && (
            <div className='space-y-2'>
              {handoverCriteria.handoverRecipients.map((recipient, index) => (
                <div
                  key={index}
                  className='flex items-center justify-between p-3 border rounded-lg bg-gray-50'
                >
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2'>
                      <span className='font-medium'>{recipient.name}</span>
                      <Badge variant='outline' className='text-xs'>
                        {recipient.email}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => removeRecipient(index)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Recipient */}
          <div className='border-2 border-dashed border-gray-300 rounded-lg p-4 space-y-3'>
            <Label className='text-sm text-gray-600'>
              Add Handover Recipient
            </Label>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div>
                <Label htmlFor='recipientName' className='text-xs'>
                  Name
                </Label>
                <Input
                  id='recipientName'
                  placeholder='John Doe'
                  value={newRecipient.name}
                  onChange={e =>
                    setNewRecipient(prev => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label htmlFor='recipientEmail' className='text-xs'>
                  Email
                </Label>
                <Input
                  id='recipientEmail'
                  type='email'
                  placeholder='john@company.com'
                  value={newRecipient.email}
                  onChange={e =>
                    setNewRecipient(prev => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={addRecipient}
              disabled={!newRecipient.name || !newRecipient.email}
            >
              <Plus className='h-4 w-4 mr-1' />
              Add Recipient
            </Button>
          </div>
        </div>

        {/* Removed time- and message-based triggers; handover by goal only */}

        {/* Removed redundant keyword triggers */}

        {/* Goal Completion Requirements */}
        {campaignGoals.length > 0 && (
          <div className='space-y-3'>
            <Label>Goal Completion Triggers</Label>
            <p className='text-sm text-gray-500'>
              Select which goals must be completed to trigger handover
            </p>
            <div className='space-y-2'>
              {campaignGoals.map(goal => (
                <div key={goal} className='flex items-center space-x-2'>
                  <input
                    type='checkbox'
                    id={`goal-${goal}`}
                    checked={handoverCriteria.goalCompletionRequired.includes(
                      goal
                    )}
                    onChange={() => toggleGoalRequirement(goal)}
                    className='rounded border-gray-300'
                  />
                  <Label htmlFor={`goal-${goal}`} className='text-sm'>
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warning for no recipients */}
        {handoverCriteria.handoverRecipients.length === 0 && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start space-x-2'>
            <AlertCircle className='h-4 w-4 text-yellow-600 mt-0.5' />
            <div className='text-sm text-yellow-800'>
              <p className='font-medium'>No handover recipients configured</p>
              <p>
                Add at least one recipient to enable handover functionality.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
