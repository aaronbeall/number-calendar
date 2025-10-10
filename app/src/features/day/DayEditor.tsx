import React from 'react';
import { NumbersPanel } from '../panel/NumbersPanel';

// DayEditor wrapper props (for Day mode)
export interface DayEditorProps {
  date: Date;
  isOpen: boolean;
  onClose: () => void;
  input: string;
  onInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  hasChanges: boolean;
  currentNumbers: number[];
}

export const DayEditor: React.FC<DayEditorProps> = ({
  date,
  isOpen,
  onClose,
  input,
  onInputChange,
  onSave,
  onCancel,
  hasChanges,
  currentNumbers,
}) => {
  const title = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <NumbersPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      numbers={currentNumbers}
      editableNumbers
      showExpressionInput
      expression={input}
      onExpressionChange={onInputChange}
      onSave={onSave}
      onCancel={onCancel}
      hasChanges={hasChanges}
    />
  );
};