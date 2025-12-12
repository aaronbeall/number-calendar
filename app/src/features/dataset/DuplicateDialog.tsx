import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { dateToDayKey, dateToMonthKey } from '@/lib/friendly-date';
import { isNameTaken } from '@/lib/utils';
import { AlertCircle, Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import { useEffect, useMemo, useState } from 'react';
import type { Dataset, ISODateString } from '../db/localdb';
import { useAllDays, useSaveDay } from '../db/useCalendarData';
import { useCreateDataset, useDatasets } from '../db/useDatasetData';

type CopyDataOption = 'all' | 'range';
type DateType = 'date' | 'month';

export interface DuplicateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDuplicated: (datasetId: string) => void;
  dataset: Dataset;
}

export function DuplicateDialog({ open, onOpenChange, onDuplicated, dataset }: DuplicateDialogProps) {
  const [newName, setNewName] = useState('');
  const [shouldCopyData, setShouldCopyData] = useState(false);
  const [copyDataOption, setCopyDataOption] = useState<CopyDataOption>('all');
  const [dateType] = useState<DateType>('date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const { data: existingDatasets = [] } = useDatasets();
  const { data: allDays = [] } = useAllDays(dataset.id);
  const createDatasetMutation = useCreateDataset();
  const saveDay = useSaveDay();

  const dateFormat = dateType === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD';

  // Initialize new name with " Copy" suffix
  useEffect(() => {
    if (open && dataset) {
      setNewName(`${dataset.name} Copy`);
      setError(null);
      setProgress({ current: 0, total: 0 });
      
      // Set default date range to current month
      const now = new Date();
      if (dateType === 'month') {
        setStartDate(dateToMonthKey(now));
        setEndDate(dateToMonthKey(now));
      } else {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(dateToDayKey(firstDay));
        setEndDate(dateToDayKey(lastDay));
      }
    }
  }, [open, dataset, dateType]);

  // Check if name is unique (allow current dataset name in the existing list during the name check)
  const nameExists = isNameTaken({ name: newName }, existingDatasets, 'name', 'id');
  const isNameValid = newName.trim().length > 0 && !nameExists;

  // Get days to copy based on range selection
  const daysToCopy = useMemo(() => {
    if (!shouldCopyData) return [];
    if (copyDataOption === 'all') return allDays;

    // Range mode
    if (!startDate || !endDate) return [];
    
    const startKey = startDate;
    const endKey = endDate;
    
    return allDays.filter(day => {
      // For month type, compare year-month
      if (dateType === 'month') {
        const dayMonth = day.date.substring(0, 7); // YYYY-MM
        return dayMonth >= startKey && dayMonth <= endKey;
      }
      // For date type
      return day.date >= startKey && day.date <= endKey;
    });
  }, [shouldCopyData, copyDataOption, allDays, startDate, endDate, dateType]);

  const handleDuplicate = async () => {
    if (!isNameValid) {
      setError('Please enter a unique dataset name');
      return;
    }

    setDuplicating(true);
    setError(null);

    try {
      const now = new Date().toISOString() as ISODateString;
      const newId = nanoid();

      // Create new dataset with same settings
      const newDataset: Dataset = {
        id: newId,
        name: newName.trim(),
        description: dataset.description,
        icon: dataset.icon,
        tracking: dataset.tracking,
        valence: dataset.valence,
        createdAt: now,
        updatedAt: now,
      };

      // Create the dataset first
      await createDatasetMutation.mutateAsync(newDataset);

      // Copy data if requested
      if (shouldCopyData && daysToCopy.length > 0) {
        setProgress({ current: 0, total: daysToCopy.length });

        for (let i = 0; i < daysToCopy.length; i++) {
          const day = daysToCopy[i];
          await saveDay.mutateAsync({
            datasetId: newId,
            date: day.date,
            numbers: day.numbers,
          });
          setProgress({ current: i + 1, total: daysToCopy.length });
        }
      }

      // Navigate to new dataset
      onDuplicated(newId);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate dataset');
    } finally {
      setDuplicating(false);
    }
  };

  const handleClose = () => {
    if (!duplicating) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Duplicate "{dataset.name}"</DialogTitle>
          <DialogDescription>
            Create a new dataset based on this one. Optionally copy the data.
          </DialogDescription>
        </DialogHeader>

        {duplicating ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="relative">
              <Copy className="h-16 w-16 text-blue-600 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">Duplicating Dataset...</p>
              {shouldCopyData && (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Copied {progress.current} of {progress.total} day entries
                </p>
              )}
              {shouldCopyData && progress.total > 0 && (
                <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* New Name */}
            <div className="space-y-2">
              <Label htmlFor="new-name">New Dataset Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Fitness Journey Copy"
                disabled={duplicating}
              />
              {newName.trim().length > 0 && nameExists && (
                <p className="text-xs text-red-600 dark:text-red-400">Dataset name already exists</p>
              )}
            </div>

            {/* Copy Data Options */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="should-copy-data"
                  checked={shouldCopyData}
                  onCheckedChange={(checked) => setShouldCopyData(checked === true)}
                  disabled={duplicating}
                />
                <Label htmlFor="should-copy-data" className="text-sm font-semibold cursor-pointer">Copy Data</Label>
              </div>

              {shouldCopyData && (
                <RadioGroup value={copyDataOption} onValueChange={(v) => setCopyDataOption(v as CopyDataOption)}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label htmlFor="copy-all" className="cursor-pointer">
                      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        copyDataOption === 'all'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}>
                        <RadioGroupItem value="all" id="copy-all" className="mt-0.5" />
                        <div className="space-y-1">
                          <div className="text-sm font-medium">All Data</div>
                          <div className="text-xs text-slate-500">Copy all {allDays.length} day entries</div>
                        </div>
                      </div>
                    </label>

                    <label htmlFor="copy-range" className="cursor-pointer">
                      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        copyDataOption === 'range'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}>
                        <RadioGroupItem value="range" id="copy-range" className="mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <div className="text-sm font-medium">Date Range</div>
                          <div className="text-xs text-slate-500">Copy entries from a specific {dateType === 'month' ? 'month' : 'date'} range</div>
                        </div>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              )}

              {shouldCopyData && copyDataOption === 'range' && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <Label htmlFor="startDate" className="text-xs text-slate-500">Start {dateType === 'month' ? 'Month' : 'Date'}</Label>
                    <Input
                      id="startDate"
                      type={dateType}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder={dateFormat}
                      className="mt-1 w-full"
                      disabled={duplicating}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs text-slate-500">End {dateType === 'month' ? 'Month' : 'Date'}</Label>
                    <Input
                      id="endDate"
                      type={dateType}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder={dateFormat}
                      className="mt-1 w-full"
                      disabled={duplicating}
                    />
                  </div>
                </div>
              )}

              {shouldCopyData && copyDataOption === 'range' && startDate && endDate && (
                <div className="text-xs text-slate-500">
                  {daysToCopy.length} day{daysToCopy.length === 1 ? '' : 's'} will be copied
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={duplicating}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={!isNameValid || duplicating}>
            {duplicating ? 'Duplicating...' : 'Duplicate Dataset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DuplicateDialog;
