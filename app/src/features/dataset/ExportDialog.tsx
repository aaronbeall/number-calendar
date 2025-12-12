import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { generateExportData, generateFileContent, type ExportFormat, type ExportRangeType, type ExportType } from '@/lib/exporting';
import { dateToDayKey, dateToMonthKey } from '@/lib/friendly-date';
import { getPrimaryMetricLabel } from '@/lib/tracking';
import { AlertCircle, Calendar, CalendarCheck, CalendarDays, CalendarRange, Check, Copy, Download, FileType, ListOrdered } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAllDays } from '../db/useCalendarData';
import { useDataset } from '../db/useDatasetData';

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  defaultDateRange?: { startDate: string; endDate: string };
}

export function ExportDialog({ open, onOpenChange, datasetId, defaultDateRange }: ExportDialogProps) {
  const [exportType, setExportType] = useState<ExportType>('daily');
  const [rangeType, setRangeType] = useState<ExportRangeType>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: allDays = [] } = useAllDays(datasetId);
  const { data: dataset = null } = useDataset(datasetId);
  const tracking = dataset?.tracking ?? 'series';

  const dateType = exportType === 'monthly' ? 'month' : 'date';
  const dateFormat = exportType === 'monthly' ? 'YYYY-MM' : 'YYYY-MM-DD';

  // Set default date range based on prop or current date
  useEffect(() => {
    if (defaultDateRange) {
      setStartDate(defaultDateRange.startDate);
      setEndDate(defaultDateRange.endDate);
    } else {
      // Fallback to current month if no default provided
      const now = new Date();
      if (exportType === 'monthly') {
        setStartDate(dateToMonthKey(now));
        setEndDate(dateToMonthKey(now));
      } else {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(dateToDayKey(firstDay));
        setEndDate(dateToDayKey(lastDay));
      }
    }
  }, [exportType, defaultDateRange]);

  // Generate export data based on options
  const exportData = useMemo(() => {
    return generateExportData({
      dataset,
      allDays,
      exportType,
      rangeType,
      startDate,
      endDate,
      tracking
    });
  }, [dataset, allDays, exportType, rangeType, startDate, endDate, tracking]);

  const handleCopyToClipboard = async () => {
    try {
      const content = generateFileContent({
        exportData,
        format,
        dataset,
        exportType,
        rangeType,
        startDate,
        endDate,
      });
      await navigator.clipboard.writeText(content);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(false);

    try {
      const content = generateFileContent({
        exportData,
        format,
        dataset,
        exportType,
        rangeType,
        startDate,
        endDate,
      });
      
      if (!content) {
        setError('No data to export');
        return;
      }

      const mimeType = format === 'json' ? 'application/json' : 'text/csv';
      const extension = format === 'json' ? 'json' : format;
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      // Generate filename with range info
      const rangeStr = rangeType === 'all' 
        ? 'all' 
        : `${startDate}-${endDate}`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${dataset?.name ?? 'calendar'}-${exportType}-${rangeStr}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    if (!exporting) {
      onOpenChange(false);
      setError(null);
      setSuccess(false);
    }
  };

  // Check if selected date range has no data
  const hasNoDataInRange = rangeType === 'range' && startDate && endDate && exportData.length === 0;
  const rangeHasNoDataError = hasNoDataInRange ? `No data found in the selected ${dateType} range` : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Export from "{dataset?.name}"</DialogTitle>
          <DialogDescription>
            Export your calendar data in various formats. Choose the export type, date range, and format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-600 dark:text-green-400">
                Data exported successfully!
              </AlertDescription>
            </Alert>
          )}

          {/* Export Type */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-blue-600 dark:text-blue-300" />
              <Label className="text-sm font-semibold">Export</Label>
            </div>
            <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as typeof exportType)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label htmlFor="daily" className="cursor-pointer">
                  <div className={`rounded-md border ${exportType==='daily' ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-start gap-3` }>
                    <Calendar className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="daily" id="daily" />
                        <div className="text-sm font-medium">Daily</div>
                      </div>
                      <div className="text-xs text-slate-500">Date, {getPrimaryMetricLabel(tracking)}, Numbers</div>
                    </div>
                  </div>
                </label>
                <label htmlFor="monthly" className="cursor-pointer">
                  <div className={`rounded-md border ${exportType==='monthly' ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-start gap-3` }>
                    <CalendarRange className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <div className="text-sm font-medium">Monthly</div>
                      </div>
                      <div className="text-xs text-slate-500">Month, {getPrimaryMetricLabel(tracking)}, Numbers</div>
                    </div>
                  </div>
                </label>
                <label htmlFor="entries" className="cursor-pointer">
                  <div className={`rounded-md border ${exportType==='entries' ? 'border-purple-500 ring-2 ring-purple-200 dark:ring-purple-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-start gap-3` }>
                    <ListOrdered className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="entries" id="entries" />
                        <div className="text-sm font-medium">Entries</div>
                      </div>
                      <div className="text-xs text-slate-500">Date, Number</div>
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Range */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              <Label className="text-sm font-semibold">Range</Label>
            </div>
            <RadioGroup value={rangeType} onValueChange={(v) => setRangeType(v as typeof rangeType)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label htmlFor="all" className="cursor-pointer">
                  <div className={`rounded-md border ${rangeType==='all' ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-center gap-3` }>
                    <RadioGroupItem value="all" id="all" />
                    <div className="text-sm font-medium">All</div>
                  </div>
                </label>
                <label htmlFor="range" className="sm:col-span-2 cursor-pointer">
                  <div className={`rounded-md border ${rangeType==='range' ? 'border-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full` }>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="range" id="range" />
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-medium">Date Range</div>
                        <div className="text-xs text-slate-500">Select {dateType}s to export</div>
                        {rangeType === 'range' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                            <div>
                              <Label htmlFor="startDate" className="text-xs text-slate-500">Start {dateType}</Label>
                              <Input
                                id="startDate"
                                type={dateType}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                placeholder={dateFormat}
                                className="mt-2 w-full"
                              />
                            </div>
                            <div>
                              <Label htmlFor="endDate" className="text-xs text-slate-500">End {dateType}</Label>
                              <Input
                                id="endDate"
                                type={dateType}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                placeholder={dateFormat}
                                className="mt-2 w-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Format */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileType className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-300" />
              <Label className="text-sm font-semibold">Format</Label>
            </div>
            <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label htmlFor="csv" className="cursor-pointer">
                  <div className={`rounded-md border ${format==='csv' ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-center gap-3` }>
                    <RadioGroupItem value="csv" id="csv" />
                    <div>
                      <div className="text-sm font-medium">.CSV</div>
                      <div className="text-xs text-slate-500">Comma-separated</div>
                    </div>
                  </div>
                </label>
                <label htmlFor="tsv" className="cursor-pointer">
                  <div className={`rounded-md border ${format==='tsv' ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-center gap-3` }>
                    <RadioGroupItem value="tsv" id="tsv" />
                    <div>
                      <div className="text-sm font-medium">.TSV</div>
                      <div className="text-xs text-slate-500">Tab-separated</div>
                    </div>
                  </div>
                </label>
                <label htmlFor="json" className="cursor-pointer">
                  <div className={`rounded-md border ${format==='json' ? 'border-fuchsia-500 ring-2 ring-fuchsia-200 dark:ring-fuchsia-800' : 'border-slate-200 dark:border-slate-700'} p-3 h-full flex items-center gap-3` }>
                    <RadioGroupItem value="json" id="json" />
                    <div>
                      <div className="text-sm font-medium">.JSON</div>
                      <div className="text-xs text-slate-500">Structured data</div>
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Preview info */}
          {rangeHasNoDataError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{rangeHasNoDataError}</AlertDescription>
            </Alert>
          )}
          {exportData.length > 0 && (
            <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 rounded p-3">
              {exportData.length} {exportData.length === 1 ? 'row' : 'rows'} ready to export
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={exporting}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleCopyToClipboard} disabled={exporting || exportData.length === 0}>
            <Copy className="h-4 w-4 mr-2" />
            Copy to Clipboard
          </Button>
          <Button onClick={handleExport} disabled={exporting || success || exportData.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : success ? 'Exported!' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ExportDialog;
