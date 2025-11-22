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
import { TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer } from 'recharts';

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
      <DialogContent className="max-h-[90vh] p-0 gap-0">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0 px-6 pt-6">
            <DialogTitle>{isEditMode ? 'Edit Dataset' : 'Create New Dataset'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Update your dataset settings.' : 'Organize numbers for a goal or project.'}
            </DialogDescription>
            {isEditMode && dataset && (
              <div className="flex gap-2 pt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Created {new Date(dataset.createdAt).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Updated {new Date(dataset.updatedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">{/* Scrollable content area */}
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

          <div className="space-y-3">
            <Label>Tracking Mode</Label>
            <RadioGroup value={tracking} onValueChange={(v) => setTracking(v as 'series' | 'trend')} className="grid grid-cols-2 gap-3">
              {/* Series Option */}
              <label
                htmlFor="tracking-series"
                className={`flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                  tracking === 'series'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="series" id="tracking-series" />
                  <BarChart3 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-semibold text-sm">Series</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Track individual numbers that can accumulate over time. Each entry is independent.
                  </p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500">
                    Examples: steps, calories, revenue, expenses, tasks completed
                  </div>
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { day: 1, value: 5 },
                        { day: 2, value: 8 },
                        { day: 3, value: 3 },
                        { day: 4, value: 7 },
                        { day: 5, value: 6 },
                        { day: 6, value: 9 },
                        { day: 7, value: 4 }
                      ]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Bar dataKey="value" fill="rgb(59 130 246)" isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </label>

              {/* Trend Option */}
              <label
                htmlFor="tracking-trend"
                className={`flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer transition ${
                  tracking === 'trend'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="trend" id="tracking-trend" />
                  <TrendingUp className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                  <span className="font-semibold text-sm">Trend</span>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Track a single value that changes over time. Each entry replaces the previous.
                  </p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500">
                    Examples: weight, skill rating, mood score, blood pressure
                  </div>
                  <div className="h-12">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { day: 1, value: 15 },
                        { day: 2, value: 22 },
                        { day: 3, value: 18 },
                        { day: 4, value: 28 },
                        { day: 5, value: 24 },
                        { day: 6, value: 35 },
                        { day: 7, value: 32 }
                      ]} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Line type="monotone" dataKey="value" stroke="rgb(34 197 94)" strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>
          </div>{/* End scrollable content area */}

          <DialogFooter className="gap-2 flex-shrink-0 px-6 pb-6 pt-4">
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
