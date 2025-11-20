import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCreateDataset, useUpdateDataset } from '../db/useDatasetData';
import type { Dataset } from '../db/localdb';
import { DATASET_ICON_OPTIONS, type DatasetIconName } from '../../lib/dataset-icons';

interface DatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (id: string) => void;
  dataset?: Dataset; // If provided, edit mode
}

const ICON_OPTIONS = DATASET_ICON_OPTIONS;

export function DatasetDialog({ open, onOpenChange, onSaved, dataset }: DatasetDialogProps) {
  const createDatasetMutation = useCreateDataset();
  const updateDatasetMutation = useUpdateDataset();
  const isEditMode = !!dataset;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<DatasetIconName>('database');
  const [tracking, setTracking] = useState<'series' | 'trend'>('series');
  
  // Initialize form from dataset in edit mode
  useEffect(() => {
    if (dataset) {
      setName(dataset.name);
      setDescription(dataset.description || '');
      setIcon(dataset.icon || 'database');
      setTracking(dataset.tracking);
    }
  }, [dataset]);

  const reset = () => {
    if (!isEditMode) {
      setName('');
      setDescription('');
      setIcon('database');
      setTracking('series');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    if (isEditMode) {
      // Update existing dataset
      const updated: Dataset = {
        ...dataset!,
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        tracking,
        updatedAt: Date.now(),
      };
      updateDatasetMutation.mutate(updated, {
        onSuccess: () => {
          onSaved(updated.id);
          onOpenChange(false);
        }
      });
    } else {
      // Create new dataset
      const now = Date.now();
      const id = `ds-${now}`;
      const newDataset: Dataset = {
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        tracking,
        createdAt: now,
        updatedAt: now,
      };
      createDatasetMutation.mutate(newDataset, {
        onSuccess: () => {
          reset();
          onSaved(id);
          onOpenChange(false);
        }
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Dataset' : 'Create New Dataset'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update your dataset settings.' : 'Organize numbers for a goal or project.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="dataset-name">Name</Label>
            <Input id="dataset-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fitness Journey" required />
          </div>

            <div className="space-y-2">
              <Label htmlFor="dataset-description">Description</Label>
              <Textarea id="dataset-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional short description" rows={3} />
            </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-5 gap-2">
              {ICON_OPTIONS.map(({ name, label, Icon }) => {
                const selected = icon === name;
                return (
                  <button
                    type="button"
                    key={name}
                    onClick={() => setIcon(name)}
                    className={
                      `flex flex-col items-center justify-center gap-1 rounded-md border p-2 text-xs transition ${selected ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300' : 'border-slate-300 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`
                    }
                    aria-pressed={selected}
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tracking Mode</Label>
            <RadioGroup value={tracking} onValueChange={(v) => setTracking(v as 'series' | 'trend')} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="series" id="tracking-series" />
                <Label htmlFor="tracking-series" className="cursor-pointer">Series <span className="text-[10px] uppercase ml-1 text-slate-400">(individual values)</span></Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="trend" id="tracking-trend" />
                <Label htmlFor="tracking-trend" className="cursor-pointer">Trend <span className="text-[10px] uppercase ml-1 text-slate-400">(directional change)</span></Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={!name.trim() || createDatasetMutation.isPending || updateDatasetMutation.isPending}
            >
              {isEditMode 
                ? (updateDatasetMutation.isPending ? 'Saving…' : 'Save Changes') 
                : (createDatasetMutation.isPending ? 'Creating…' : 'Create Dataset')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default DatasetDialog;
