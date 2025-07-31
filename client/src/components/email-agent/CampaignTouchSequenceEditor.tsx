// CampaignTouchSequenceEditor.tsx
import React from 'react';

interface TouchStep {
  templateId: string;
  delayDays: number;
  delayHours: number;
  conditions?: any;
}

interface CampaignTouchSequenceEditorProps {
  sequence: TouchStep[];
  onChange: (sequence: TouchStep[]) => void;
}

export const CampaignTouchSequenceEditor: React.FC<CampaignTouchSequenceEditorProps> = ({
  sequence,
  onChange
}) => {
  // Handler to update a step
  const updateStep = (index: number, changes: Partial<TouchStep>) => {
    const updated = sequence.map((step, idx) =>
      idx === index ? { ...step, ...changes } : step
    );
    onChange(updated);
  };

  // Handler to add a new step
  const addStep = () => {
    onChange([
      ...sequence,
      { templateId: '', delayDays: 0, delayHours: 0 }
    ]);
  };

  // Handler to remove a step
  const removeStep = (index: number) => {
    onChange(sequence.filter((_, idx) => idx !== index));
  };

  // Handler to move a step up or down
  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= sequence.length) return;
    const arr = [...sequence];
    const [removed] = arr.splice(from, 1);
    arr.splice(to, 0, removed);
    onChange(arr);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">Touch Sequence</span>
        <button type="button" className="btn btn-sm btn-outline" onClick={addStep}>
          Add Step
        </button>
      </div>
      {sequence.length === 0 && (
        <div className="text-sm text-muted-foreground mb-2">No steps configured.</div>
      )}
      <div className="space-y-4">
        {sequence.map((step, idx) => (
          <div key={idx} className="flex gap-2 items-center border rounded p-2 bg-muted">
            <input
              type="text"
              className="input input-sm w-40"
              placeholder="Template ID"
              value={step.templateId}
              onChange={e => updateStep(idx, { templateId: e.target.value })}
            />
            <input
              type="number"
              className="input input-sm w-20"
              min={0}
              value={step.delayDays}
              onChange={e => updateStep(idx, { delayDays: parseInt(e.target.value) || 0 })}
              placeholder="Days"
            />
            <input
              type="number"
              className="input input-sm w-20"
              min={0}
              max={23}
              value={step.delayHours}
              onChange={e => updateStep(idx, { delayHours: parseInt(e.target.value) || 0 })}
              placeholder="Hours"
            />
            <button
              type="button"
              className="btn btn-xs"
              disabled={idx === 0}
              onClick={() => moveStep(idx, idx - 1)}
              title="Move Up"
            >↑</button>
            <button
              type="button"
              className="btn btn-xs"
              disabled={idx === sequence.length - 1}
              onClick={() => moveStep(idx, idx + 1)}
              title="Move Down"
            >↓</button>
            <button
              type="button"
              className="btn btn-xs btn-error"
              onClick={() => removeStep(idx)}
              title="Remove"
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
};