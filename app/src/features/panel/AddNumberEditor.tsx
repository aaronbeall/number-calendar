import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { EditableNumberBadge } from './EditableNumberBadge';
import { motion } from 'framer-motion';
import { Plus, X, Equal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseSingleNumberExpression } from '@/lib/expression';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';


interface AddNumberEditorProps {
  onAdd: (finalNumber: number) => void;
  onCancel: () => void;
  priorTotal: number;
}

export const AddNumberEditor: React.FC<AddNumberEditorProps> = ({ onAdd, onCancel, priorTotal }) => {
  const [input, setInput] = useState('');
  const [addMode, setAddMode] = useState<'entry' | 'total'>('entry');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Automatically switch to Total mode if input starts with '='
  React.useEffect(() => {
    if (input.startsWith('=')) {
      if (addMode !== 'total') setAddMode('total');
    } else if (input.startsWith('+')) {
      if (addMode !== 'entry') setAddMode('entry');
    }
  }, [input, addMode]);

  // Parse and preview number from input using extracted function
  const previewNumber = parseSingleNumberExpression(input.startsWith('=') ? input.slice(1) : input);

  // Calculate the final number to add
  let finalNumber: number | null = null;
  if (previewNumber !== null) {
    finalNumber = addMode === 'entry' ? previewNumber : previewNumber - priorTotal;
  }

  // Focus input when mode changes
  React.useEffect(() => {
    inputRef.current?.focus();
  }, [addMode]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="w-full flex flex-col items-start gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg relative"
    >
      {/* Top row: ToggleGroup and close button */}
      <div className="flex items-center justify-between w-full mb-2">
        <ToggleGroup
          type="single"
          value={addMode}
          onValueChange={v => v && setAddMode(v as 'entry' | 'total')}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="entry" aria-label="Add as new entry" size="sm" variant="outline">
            {/* Use a number/plus icon for entry */}
            <Plus className="w-4 h-4 mr-1" /> Entry
          </ToggleGroupItem>
          <ToggleGroupItem value="total" aria-label="Add as total" size="sm" variant="outline">
            {/* Use a sum/equals icon for total */}
            <Equal className="w-4 h-4 mr-1" /> Total
          </ToggleGroupItem>
        </ToggleGroup>
        <button
          type="button"
          className="absolute top-2 right-2 text-slate-400 hover:text-red-500 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500"
          onClick={onCancel}
          aria-label="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {/* Input row: input and save button with preview */}
      <div className="flex items-center w-full gap-2">
        <Input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={addMode === 'entry' ? 'Enter next number' : 'Enter new total'}
          className="flex-1 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
          autoFocus
          ref={inputRef}
          onKeyDown={e => {
            if (e.key === 'Enter' && finalNumber !== null) onAdd(finalNumber);
            if (e.key === 'Escape') onCancel();
          }}
        />
        {addMode === 'total' && (
          <span className="text-xs text-slate-400 ml-1 select-none">
            {priorTotal < 0 ? `+${Math.abs(priorTotal)}` : `-${priorTotal}`}
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={finalNumber === null}
          onClick={() => finalNumber !== null && onAdd(finalNumber)}
          aria-label="Add"
          className="flex items-center gap-1 px-3"
        >
          Add
          <span className="ml-1">
            <EditableNumberBadge value={finalNumber ?? 0} editable={false} />
          </span>
        </Button>
      </div>
    </motion.div>
  );
}
