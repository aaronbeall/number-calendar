import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreateDataset, useUpdateDataset, useDeleteDataset, useDatasets } from '../db/useDatasetData';
import { DatasetBuilder } from './DatasetBuilder';
import type { DatasetTemplate } from '@/lib/dataset-builder';
import type { Dataset, ISODateString, Tracking, Valence } from '../db/localdb';
import { DATASET_ICON_OPTIONS, type DatasetIconName } from '../../lib/dataset-icons';
import { cn, isNameTaken } from '@/lib/utils';
import { TrendingUp, BarChart3, Database, Trash2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, Cell } from 'recharts';

interface DatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (datasetId: string) => void;
  dataset?: Dataset; // If provided, edit mode
}

export function DatasetDialog({ open, onOpenChange, onCreated, dataset }: DatasetDialogProps) {
  const navigate = useNavigate();
  const createDatasetMutation = useCreateDataset();
  const updateDatasetMutation = useUpdateDataset();
  const deleteDatasetMutation = useDeleteDataset();
  const { data: existingDatasets = [] } = useDatasets();
  const isEditMode = !!dataset;
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState<DatasetIconName>('database');
  const [tracking, setTracking] = useState<Tracking>('series');
  const [valence, setValence] = useState<Valence>('positive');
  const [iconSearch, setIconSearch] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const nameExists = isNameTaken({ ...dataset, name }, existingDatasets, 'name', 'id');
  const isNameValid = name.trim().length > 0 && !nameExists;

  // Trend preview sequences for valence buttons (show direction evaluation by deltas)
  const trendPositiveSeq = [10, 14, 13, 18, 21]; // upward changes good (green), dips bad (red)
  const trendNegativeSeq = [100, 96, 97, 92, 90]; // downward changes good (green), rises bad (red)
  const trendNeutralSeq = [50, 47, 52, 49, 51];  // direction not evaluated (all blue)

  // Series preview data always shown (even when not selected).
  // Only show mixed +/- values (with coloring) for series-specific valences.
  const seriesPreviewData = (valence === 'positive' || valence === 'negative')
    ? [
        { day: 1, value: 5 },
        { day: 2, value: -3 },
        { day: 3, value: 2 },
        { day: 4, value: -6 },
        { day: 5, value: 4 },
        { day: 6, value: -1 },
        { day: 7, value: 7 }
      ]
    : [
        { day: 1, value: 5 },
        { day: 2, value: 8 },
        { day: 3, value: 3 },
        { day: 4, value: 7 },
        { day: 5, value: 6 },
        { day: 6, value: 9 },
        { day: 7, value: 4 }
      ];
  
  // Initialize form from dataset in edit mode
  useEffect(() => {
    if (dataset) {
      setName(dataset.name);
      setDescription(dataset.description || '');
      setIcon(dataset.icon || 'database');
      setTracking(dataset.tracking);
      setValence(dataset.valence || 'positive');
      setManualMode(true);
    }
  }, [dataset]);

  const reset = () => {
    if (!isEditMode) {
      setName('');
      setDescription('');
      setIcon('database');
      setTracking('series');
      setValence('positive');
      setManualMode(false);
    }
  };

  const handleSelectTemplate = (template: DatasetTemplate) => {
    setName(template.name);
    setDescription(template.description);
    setIcon(template.icon);
    setTracking(template.settings.tracking);
    setValence(template.settings.valence);
    setManualMode(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNameValid) return;
    
    if (isEditMode) {
      // Update existing dataset
      const updated: Dataset = {
        ...dataset!,
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        tracking,
        valence,
        updatedAt: Date.now(),
      };
      updateDatasetMutation.mutate(updated, {
        onSuccess: () => {
          onOpenChange(false);
        }
      });
    } else {
      // Create new dataset
      const now = new Date().toISOString() as ISODateString;
      const id = nanoid();
      const newDataset: Dataset = {
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        tracking,
        valence,
        createdAt: now,
        updatedAt: now,
      };
      createDatasetMutation.mutate(newDataset, {
        onSuccess: () => {
          reset();
          onOpenChange(false);
          onCreated(id);
        }
      });
    }
  };

  const handleDelete = () => {
    if (!dataset) return;
    deleteDatasetMutation.mutate(dataset.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        onOpenChange(false);
        navigate('/');
      }
    });
  };

  const showTemplateBuilder = !isEditMode && !manualMode;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-h-[90vh] p-0 gap-0 w-full sm:max-w-3xl">
        {showTemplateBuilder ? (
          <DatasetBuilder
            onSelectTemplate={handleSelectTemplate}
            onManualMode={() => setManualMode(true)}
          />
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-shrink-0 px-6 pt-6">
              <DialogTitle>{isEditMode ? `Edit "${dataset?.name}"` : 'Create New Dataset'}</DialogTitle>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left column: Name & Description (spans 2 cols on desktop) */}
              <div className="space-y-4 md:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="dataset-name">Name</Label>
                  <Input id="dataset-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Fitness Journey" required />
                  {name.trim().length > 0 && nameExists && (
                    <p className="text-xs text-red-600 dark:text-red-400">Dataset name already exists</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataset-description">Description</Label>
                  <Textarea id="dataset-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="What are you tracking and why?" rows={4} />
                </div>
              </div>

              {/* Right column: Icon selector (1 col, narrower) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Icon</Label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selectedOption = DATASET_ICON_OPTIONS.find(o => o.name === icon);
                      const SelectedIcon = selectedOption?.Icon || Database;
                      return (
                        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                          <SelectedIcon className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                        </div>
                      );
                    })()}
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={iconSearch}
                      onChange={(e) => setIconSearch(e.target.value)}
                      className="text-sm h-8 w-32"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-8 gap-1.5 md:grid-cols-4 max-h-[100px] md:max-h-[160px] overflow-y-auto p-1 border border-slate-200 dark:border-slate-700 rounded-md">
                  {DATASET_ICON_OPTIONS.filter(({ name, label }) => {
                    const search = iconSearch.toLowerCase();
                    return !search || name.includes(search) || label.toLowerCase().includes(search);
                  }).map(({ name, label, Icon }) => {
                    const selected = icon === name;
                    return (
                      <Tooltip key={name} delayDuration={200}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            onClick={() => setIcon(name)}
                            className={cn(
                              'flex items-center justify-center rounded border p-1.5 transition',
                              selected
                                ? 'border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300'
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            )}
                            aria-pressed={selected}
                            aria-label={label}
                          >
                            <Icon className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {DATASET_ICON_OPTIONS.filter(({ name, label }) => {
                    const search = iconSearch.toLowerCase();
                    return !search || name.includes(search) || label.toLowerCase().includes(search);
                  }).length === 0 && (
                    <div className="col-span-full text-center text-xs text-slate-500 dark:text-slate-400 py-3">
                      No matches. Try a different search.
                    </div>
                  )}
                </div>
              </div>
            </div>

          <div className="space-y-3">
            <Label>Tracking Mode</Label>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              Pick the style that matches how your numbers behave.
            </div>
              <RadioGroup value={tracking} onValueChange={(v) => {
              const t = v as Tracking;
              setTracking(t);
            }} className="grid grid-cols-2 gap-3">
              {/* Series Option */}
              <label
                htmlFor="tracking-series"
                className={cn(
                  'flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer transition',
                  tracking === 'series'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                )}
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
                      <BarChart data={seriesPreviewData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                        <Bar dataKey="value" isAnimationActive={false} fill={(valence === 'positive' || valence === 'negative') ? undefined : 'rgb(59 130 246)'}>
                          {(valence === 'positive' || valence === 'negative') && seriesPreviewData.map((d, i) => (
                            <Cell key={i} fill={
                              valence === 'positive'
                                ? (d.value >= 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)')
                                : (d.value >= 0 ? 'rgb(239 68 68)' : 'rgb(34 197 94)')
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </label>

              {/* Trend Option */}
              <label
                htmlFor="tracking-trend"
                className={cn(
                  'flex flex-col gap-3 p-4 rounded-lg border-2 cursor-pointer transition',
                  tracking === 'trend'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                )}
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
                  <div className="h-12 flex gap-1">
                    {valence === 'neutral' ? (
                      <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[{d:1,v:50},{d:2,v:47},{d:3,v:52},{d:4,v:49},{d:5,v:51},{d:6,v:50},{d:7,v:48}]} margin={{top:0,right:0,bottom:0,left:0}}>
                            <Line type="monotone" dataKey="v" stroke="rgb(59 130 246)" strokeWidth={2} dot={false} isAnimationActive={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{d:1,v:10},{d:2,v:14},{d:3,v:13},{d:4,v:18},{d:5,v:21},{d:6,v:25},{d:7,v:29}]} margin={{top:0,right:0,bottom:0,left:0}}>
                              <Line type="monotone" dataKey="v" stroke={valence === 'positive' ? 'rgb(34 197 94)' : 'rgb(239 68 68)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[{d:1,v:50},{d:2,v:48},{d:3,v:47},{d:4,v:45},{d:5,v:44},{d:6,v:43},{d:7,v:42}]} margin={{top:0,right:0,bottom:0,left:0}}>
                              <Line type="monotone" dataKey="v" stroke={valence === 'positive' ? 'rgb(239 68 68)' : 'rgb(34 197 94)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>
          {/* Valence Selection (original wording preserved) */}
          <div className="space-y-3">
            <Label>Valence</Label>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              This controls what the app considers a win. You can adjust it later.
            </div>
            {tracking === 'series' && (
              <div className="grid grid-cols-3 gap-3">
                {/* Positive is good */}
                <button type="button" onClick={() => setValence('positive')}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-md border text-left transition',
                    valence === 'positive'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-green-400'
                  )}>
                  <div className="text-xs font-semibold flex items-center gap-1"><span className="text-green-600 dark:text-green-400">Positive is Good</span></div>
                  <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">Good when numbers are above zero.</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 italic">Examples: net calories, profit, score delta</div>
                  <div className="mt-1 flex gap-1 text-[11px] font-mono">
                    { [+5, +3, -2, +7].map((n,i) => (
                      <span key={i} className={n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}>{n}</span>
                    )) }
                  </div>
                </button>
                {/* Positive is bad */}
                <button type="button" onClick={() => setValence('negative')}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-md border text-left transition',
                    valence === 'negative'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-red-400'
                  )}>
                  <div className="text-xs font-semibold flex items-center gap-1"><span className="text-red-600 dark:text-red-400">Negative is Good</span></div>
                  <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">Good when numbers are below zero.</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 italic">Examples: expenses variance, bugs introduced, injury count</div>
                  <div className="mt-1 flex gap-1 text-[11px] font-mono">
                    { [+4, +2, -1, +3].map((n,i) => (
                      <span key={i} className={n >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>{n}</span>
                    )) }
                  </div>
                </button>
                {/* Neutral series */}
                <button type="button" onClick={() => setValence('neutral')}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-md border text-left transition',
                    valence === 'neutral'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  )}>
                  <div className="text-xs font-semibold flex items-center gap-1"><span className="text-blue-600 dark:text-blue-300">Neutral</span></div>
                  <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">Sign doesn't matter.</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 italic">Examples: steps, workouts, tasks completed</div>
                  <div className="mt-1 flex gap-1 text-[11px] font-mono">
                    { [5,8,3,7].map((n,i) => (
                      <span key={i} className="text-blue-600 dark:text-blue-300">{n}</span>
                    )) }
                  </div>
                </button>
              </div>
            )}
            {tracking === 'trend' && (
              <div className="grid grid-cols-3 gap-3">
                {/* Higher better */}
                <button type="button" onClick={() => setValence('positive')}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-md border text-left transition',
                    valence === 'positive'
                      ? 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-green-400'
                  )}>
                  <div className="text-xs font-semibold flex items-center gap-1"><span className="text-green-600 dark:text-green-400">Higher is Better</span></div>
                  <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">Increasing value is good.</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 italic">Examples: savings balance, skill rating, portfolio value</div>
                  <div className="mt-1 flex gap-1 text-[11px] font-mono">
                    {trendPositiveSeq.map((n,i,arr) => {
                      let cls;
                      if (i === 0) {
                        // First value relative to zero: favorable for higher better
                        cls = 'text-green-600 dark:text-green-400';
                      } else {
                        const delta = n - arr[i-1];
                        cls = delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                      }
                      return <span key={i} className={cls}>{n}</span>;
                    })}
                  </div>
                </button>
                {/* Lower better */}
                <button type="button" onClick={() => setValence('negative')}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-md border text-left transition',
                    valence === 'negative'
                      ? 'border-red-500 bg-red-50 dark:bg-red-950 dark:border-red-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-red-400'
                  )}>
                  <div className="text-xs font-semibold flex items-center gap-1"><span className="text-red-600 dark:text-red-400">Lower is Better</span></div>
                  <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">Decreasing value is good.</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 italic">Examples: weight, resting heart rate, debt outstanding</div>
                  <div className="mt-1 flex gap-1 text-[11px] font-mono">
                    {trendNegativeSeq.map((n,i,arr) => {
                      let cls;
                      if (i === 0) {
                        // First value relative to zero: unfavorable for lower better shown as red
                        cls = 'text-red-600 dark:text-red-400';
                      } else {
                        const delta = n - arr[i-1];
                        cls = delta < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                      }
                      return <span key={i} className={cls}>{n}</span>;
                    })}
                  </div>
                </button>
                {/* Neutral trend */}
                <button type="button" onClick={() => setValence('neutral')}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-md border text-left transition',
                    valence === 'neutral'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
                  )}>
                  <div className="text-xs font-semibold flex items-center gap-1"><span className="text-blue-600 dark:text-blue-300">Neutral</span></div>
                  <p className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">Direction not evaluated.</p>
                  <div className="text-[10px] text-slate-500 dark:text-slate-500 italic">Examples: daily temperature, ambient noise level, mood score</div>
                  <div className="mt-1 flex gap-1 text-[11px] font-mono">
                    {trendNeutralSeq.map((n,i) => (
                      <span key={i} className="text-blue-600 dark:text-blue-300">{n}</span>
                    )) }
                  </div>
                </button>
              </div>
            )}
          </div>
          </div>{/* End scrollable content area */}

            <DialogFooter className="gap-2 flex-shrink-0 px-6 pb-6 pt-4 flex items-center justify-between">
            {isEditMode && dataset && (
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
              <div className="flex items-center gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
                <Button
                  type="submit"
                  disabled={!isNameValid || createDatasetMutation.isPending || updateDatasetMutation.isPending}
                >
                  {isEditMode
                    ? (updateDatasetMutation.isPending ? 'Saving…' : 'Save Changes')
                    : (createDatasetMutation.isPending ? 'Creating…' : 'Create Dataset')}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
        {isEditMode && dataset && (
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {dataset.name} dataset?</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600 dark:text-slate-400">
                  This will permanently remove the dataset and all associated data. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteDatasetMutation.isPending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                  disabled={deleteDatasetMutation.isPending}
                >
                  {deleteDatasetMutation.isPending ? 'Deleting…' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DatasetDialog;
