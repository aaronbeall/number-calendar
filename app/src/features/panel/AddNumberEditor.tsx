import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { Valence } from '@/features/db/localdb';
import { parseSingleNumberExpression } from '@/lib/expression';
import { motion } from 'framer-motion';
import { Equal, Plus, X } from 'lucide-react';
import React, { useState } from 'react';
import { EditableNumberBadge } from './EditableNumberBadge';


import type { Tracking } from '@/features/db/localdb';

interface AddNumberEditorProps {
  onAdd: (finalNumber: number) => void;
  onCancel: () => void;
  priorTotal: number;
  valence: Valence;
  tracking: Tracking;
  priorNumber?: number; // for trend mode
}

export const AddNumberEditor: React.FC<AddNumberEditorProps> = ({ onAdd, onCancel, priorTotal, valence, tracking, priorNumber }) => {
  const [input, setInput] = useState('');
  // Modes: series: ['entry', 'total'], trend: ['entry', 'delta']
  const [addMode, setAddMode] = useState<'entry' | 'total' | 'delta'>(tracking === 'trend' ? 'entry' : 'entry');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Mode auto-switching for input
  React.useEffect(() => {
    if (tracking === 'series') {
      if (input.startsWith('=')) {
        if (addMode !== 'total') setAddMode('total');
      } else if (input.startsWith('+')) {
        if (addMode !== 'entry') setAddMode('entry');
      }
    } else if (tracking === 'trend') {
      if (input.startsWith('+') || (input.startsWith('-') && (priorNumber ?? 0) > 0)) {
        if (addMode !== 'delta') setAddMode('delta');
      } else if (input.startsWith('=')) {
        if (addMode !== 'entry') setAddMode('entry');
      }
    }
  }, [input, addMode, tracking]);

  // Parse and preview number from input
  let previewNumber: number | null = null;
  let previewValenceNumber: number | null = null;

  if (tracking === 'series') {
    const parsed = parseSingleNumberExpression(input.startsWith('=') ? input.slice(1) : input);
    if (parsed !== null) {
      previewNumber = addMode === 'entry' ? parsed : parsed - priorTotal;
      previewValenceNumber = previewNumber;
    }
  } else if (tracking === 'trend') {
    if (addMode === 'entry') {
      const parsed = parseSingleNumberExpression(input.startsWith('=') ? input.slice(1) : input);
      if (parsed !== null) {
        previewNumber = parsed;
        previewValenceNumber = priorNumber !== undefined ? parsed - priorNumber : 0;
      }
    } else if (addMode === 'delta') {
      const delta = parseSingleNumberExpression(input);
      if (delta !== null && priorNumber !== undefined) {
        previewNumber = priorNumber + delta;
        previewValenceNumber = delta;
      }
    }
  }

  // Focus input when mode changes
  React.useEffect(() => {
    inputRef.current?.focus();
  }, [addMode]);

  // ToggleGroup items based on tracking
  const toggleItems = tracking === 'series'
    ? [
        { value: 'entry', label: (<><Plus className="w-4 h-4 mr-1" /> Entry</>) },
        { value: 'total', label: (<><Equal className="w-4 h-4 mr-1" /> Total</>) },
      ]
    : [
        { value: 'entry', label: (<><Plus className="w-4 h-4 mr-1" /> Entry</>) },
        { value: 'delta', label: (<><Equal className="w-4 h-4 mr-1" /> Delta</>), disabled: priorNumber === undefined },
      ];

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
          onValueChange={v => v && setAddMode(v as any)}
          size="sm"
          variant="outline"
        >
          {toggleItems.map(({ value, label, disabled }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              aria-label={label?.props?.children?.[1] || value}
              size="sm"
              variant="outline"
              disabled={!!disabled}
            >
              {label}
            </ToggleGroupItem>
          ))}
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
          placeholder={
            addMode === 'entry'
              ? 'Enter next number'
              :  tracking === 'series' ? 'Enter new total' : 'Enter delta (e.g. +5 or -3)'
          }
          className="flex-1 text-sm border-blue-300 focus:border-blue-500 focus:ring-blue-500/20 shadow-sm"
          autoFocus
          ref={inputRef}
          onKeyDown={e => {
            if (e.key === 'Enter' && previewNumber !== null) onAdd(previewNumber);
            if (e.key === 'Escape') onCancel();
          }}
        />
        {/* For series/total mode, show priorTotal math. For trend/delta, show priorNumber math. */}
        {tracking === 'series' && addMode === 'total' && (
          <span className="text-xs text-slate-400 ml-1 select-none">
            {priorTotal < 0 ? `+${Math.abs(priorTotal)}` : `-${priorTotal}`}
          </span>
        )}
        {tracking === 'trend' && addMode === 'delta' && priorNumber !== undefined && (
          <span className="text-xs text-slate-400 ml-1 select-none">
            {priorNumber >= 0 ? `${priorNumber}` : `(${priorNumber})`} + Δ
          </span>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={previewNumber === null}
          onClick={() => previewNumber !== null && onAdd(previewNumber)}
          aria-label="Add"
          className="flex items-center gap-1 px-3"
        >
          Add
          <span className="ml-1">
            <EditableNumberBadge value={previewNumber ?? 0} valenceValue={previewValenceNumber ?? undefined} editable={false} valence={valence} />
          </span>
        </Button>
      </div>
    </motion.div>
  );
}
