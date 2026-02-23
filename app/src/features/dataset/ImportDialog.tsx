import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { dateToDayKey } from '@/lib/friendly-date';
import { formatValue } from '@/lib/friendly-numbers';
import { detectDelimiter, generateDayEntries, getHeadersAndRows, getParsedColumns, getRowSelection, parseCellValue, parseCSV, parseDateString, parseJSON, validateImport, type ColumnType, type MergeStrategy, type ParsedData } from '@/lib/importing';
import { AlertCircle, Clipboard, Eraser, File, FileJson, Info, Table, Upload } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DayEntry, DayKey } from '../db/localdb';
import { useDataset } from '../db/useDatasetData';
import { useAllDays, useSaveDay } from '../db/useDayEntryData';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
}

export function ImportDialog({ open, onOpenChange, datasetId }: ImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('combine');
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: existingDays = [] } = useAllDays(datasetId);
  const { data: dataset } = useDataset(datasetId);
  const saveDay = useSaveDay();

  const parseData = (text: string, fileName?: string): void => {
    try {
      let rows: string[][];

      // Determine format
      if (fileName?.endsWith('.json')) {
        rows = parseJSON(text);
      } else if (fileName?.endsWith('.tsv')) {
        rows = parseCSV(text, '\t');
      } else if (fileName?.endsWith('.csv')) {
        rows = parseCSV(text, ',');
      } else {
        // Auto-detect delimiter
        const delimiter = detectDelimiter(text);
        rows = parseCSV(text, delimiter);
      }

      if (rows.length < 1) {
        setError('Not enough data to import');
        return;
      }

      const { headerNames, dataRows } = getHeadersAndRows(rows);

      if (dataRows.length < 1) {
        setError('Not enough data to import');
        return;
      }

      const columns = getParsedColumns(dataRows, headerNames);
      const rowSelection = getRowSelection(dataRows, columns);

      setParsedData({ columns, rows: rowSelection });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse data');
      setParsedData(null);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'tsv', 'json'].includes(ext || '')) {
        setError('Please select a CSV, TSV, or JSON file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      selectedFile.text().then(text => parseData(text, selectedFile.name));
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'tsv', 'json'].includes(ext || '')) {
        setError('Please drop a CSV, TSV, or JSON file');
        return;
      }
      setFile(droppedFile);
      droppedFile.text().then(text => parseData(text, droppedFile.name));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        setError('No text found in clipboard');
        return;
      }
      parseData(text);
      setFile(null);
    } catch (err) {
      setError('Failed to read clipboard');
    }
  };

  const toggleColumn = (colIdx: number) => {
    if (!parsedData) return;
    
    const newColumns = [...parsedData.columns];
    newColumns[colIdx].selected = !newColumns[colIdx].selected;
    
    // Ensure only one date column is selected
    if (newColumns[colIdx].type === 'date' && newColumns[colIdx].selected) {
      newColumns.forEach((col, idx) => {
        if (idx !== colIdx && col.type === 'date') {
          col.selected = false;
        }
      });
    }
    
    setParsedData({ ...parsedData, columns: newColumns });
  };

  const toggleRow = (rowIdx: number) => {
    if (!parsedData) return;
    const newRows = [...parsedData.rows];
    newRows[rowIdx] = !newRows[rowIdx];
    setParsedData({ ...parsedData, rows: newRows });
  };

  const unselectRowsWithInvalidData = () => {
    if (!parsedData) return;
    
    const newRows = parsedData.rows.map((selected, rowIdx) => {
      if (!selected) return selected;
      
      // Check if this row has any invalid cells in selected columns
      for (const col of parsedData.columns) {
        if (!col.selected) continue;
        const { valid } = parsedColumnCellValues[col.index][rowIdx];
        if (!valid) return false;
      }
      return selected;
    });
    
    setParsedData({ ...parsedData, rows: newRows });
  };

  const changeColumnType = (colIdx: number, newType: ColumnType) => {
    if (!parsedData) return;

    const isSelectedDateColumn = parsedData.columns[colIdx].type === 'date' && parsedData.columns[colIdx].selected;

    const newColumns = [...parsedData.columns];
    newColumns[colIdx].type = newType;

    // Selection logic
    if (newType === 'date') {
      newColumns.forEach((col, idx) => {
        if (idx !== colIdx && col.type === 'date') {
          col.selected = false;
        }
      });
      newColumns[colIdx].selected = true;
    } else if (newType === 'numeric') {
      newColumns[colIdx].selected = true;
    } else if (newType === 'unknown') {
      newColumns[colIdx].selected = false;
    }

    if (isSelectedDateColumn && newType !== 'date') {
      // No more date column selected, select first date column if any
      const firstDateCol = newColumns.find(c => c.type === 'date');
      if (firstDateCol) {
        firstDateCol.selected = true;
      }
    }

    setParsedData({ ...parsedData, columns: newColumns });
  };

  const handleImport = async () => {
    const validationError = validateImport(parsedData);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (!parsedData) return;
    
    setImporting(true);
    setError(null);

    try {
      
      const dayEntries: DayEntry[] = generateDayEntries({
        parsedData,
        existingDays,
        mergeStrategy,
        datasetId
      });
      
      console.log('Import data:', dayEntries);
      
      // Save all entries to database with progress tracking
      setImportProgress({ current: 0, total: dayEntries.length });
      for (let i = 0; i < dayEntries.length; i++) {
        const entry = dayEntries[i];
        await saveDay.mutateAsync({
          datasetId: entry.datasetId,
          date: entry.date,
          numbers: entry.numbers
        });
        setImportProgress({ current: i + 1, total: dayEntries.length });
      }
      
      onOpenChange(false);
      setFile(null);
      setParsedData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    if (!importing) {
      onOpenChange(false);
      setFile(null);
      setError(null);
      setParsedData(null);
    }
  };

  // Handle paste events when dialog is open
  useEffect(() => {
    if (!open) return;

    const handlePasteEvent = async (e: ClipboardEvent) => {
      e.preventDefault();
      try {
        const text = e.clipboardData?.getData('text/plain');
        if (!text) {
          setError('No text found in clipboard');
          return;
        }
        parseData(text);
        setFile(null);
      } catch (err) {
        setError('Failed to read clipboard');
      }
    };

    document.addEventListener('paste', handlePasteEvent);
    return () => document.removeEventListener('paste', handlePasteEvent);
  }, [open]);

  const parsedColumnCellValues = useMemo(() => {
    if (!parsedData) return [];
    return parsedData.columns.map(col => 
      col.data.map(value => parseCellValue(value, col.type))
    );
  }, [parsedData]);

  // Compute import behavior notes and validation
  const { hasDuplicates, hasMultipleNumeric, invalidCellCount } = useMemo(() => {
    if (!parsedData) return { hasDuplicates: false, hasMultipleNumeric: false, invalidCellCount: 0 };
    
    const dateColIdx = parsedData.columns.findIndex(c => c.type === 'date' && c.selected);
    const selectedDates = parsedData.rows
      .map((selected, idx) => selected ? parsedData.columns[dateColIdx]?.data[idx]?.trim() : null)
      .filter(Boolean);
    const duplicates = selectedDates.length !== new Set(selectedDates).size;
    const multipleNumeric = parsedData.columns.filter(c => c.type === 'numeric' && c.selected).length > 1;
    
    // Count invalid cells in selected columns and rows
    let invalidCount = 0;
    for (const col of parsedData.columns) {
      if (!col.selected) continue;
      for (let rowIdx = 0; rowIdx < col.data.length; rowIdx++) {
        if (!parsedData.rows[rowIdx]) continue;
        const { valid } = parsedColumnCellValues[col.index][rowIdx];
        if (!valid) invalidCount++;
      }
    }
    
    return { hasDuplicates: duplicates, hasMultipleNumeric: multipleNumeric, invalidCellCount: invalidCount };
  }, [parsedData, parsedColumnCellValues]);

  const validationError = useMemo(() => validateImport(parsedData), [parsedData]);

  // Compute overlapping dates with existing data
  const overlappingDates = useMemo(() => {
    if (!parsedData) return [];
    
    const dateColIdx = parsedData.columns.findIndex(c => c.type === 'date' && c.selected);
    if (dateColIdx === -1) return [];
    
    const existingDateSet = new Set(existingDays.map(entry => entry.date));
    const importDates = parsedData.rows
      .map((selected, idx) => {
        if (!selected) return null;
        const dateStr = parsedData.columns[dateColIdx].data[idx].trim();
        if (!dateStr) return null;
        const date = parseDateString(dateStr);
        return date ? dateToDayKey(date) : null;
      })
      .filter((date): date is DayKey => date !== null);
    
    return importDates.filter(date => existingDateSet.has(date));
  }, [parsedData, existingDays]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Import to "{dataset?.name}"</DialogTitle>
          <DialogDescription>
            {importing
              ? 'Importing your data into the dataset...'
              : !parsedData 
              ? 'Import calendar data from CSV, TSV, or JSON files. Drag and drop, paste, or choose a file.'
              : 'Review and configure your data. Select the correct columns and rows to import.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <Upload className="h-16 w-16 text-blue-600 animate-pulse" />
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold">Importing Data...</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Saved {importProgress.current} of {importProgress.total} entries
                </p>
                <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {!importing && !parsedData && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex flex-col items-center justify-center border-2 border-dashed ${
                dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' : 'border-slate-300 dark:border-slate-700'
              } rounded-lg p-8 space-y-4 transition-colors`}
            >
              <FileJson className="h-12 w-12 text-slate-400" />
              
              {file ? (
                <div className="text-center">
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Drop a file here, or
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  <File className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <Button
                  variant="outline"
                  onClick={handlePaste}
                  disabled={importing}
                >
                  <Clipboard className="h-4 w-4 mr-2" />
                  Paste from Clipboard
                </Button>
              </div>
            </div>
          )}

          {!importing && parsedData && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold">Preview & Configure</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setParsedData(null);
                    setFile(null);
                  }}
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-auto max-h-96">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-2 border-r w-8">#</th>
                      {parsedData.columns.map((col, colIdx) => (
                        <th key={colIdx} className="p-2 border-r min-w-32">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={col.selected}
                                onCheckedChange={() => toggleColumn(colIdx)}
                              />
                              <span className="font-medium">{col.name}</span>
                            </div>
                            <Select
                              value={col.type}
                              onValueChange={(v) => changeColumnType(colIdx, v as ColumnType)}
                            >
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="date">Date</SelectItem>
                                <SelectItem value="numeric">Numeric</SelectItem>
                                <SelectItem value="unknown">Unknown</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.columns[0].data.map((_, rowIdx) => (
                      <tr key={rowIdx} className={parsedData.rows[rowIdx] ? '' : 'opacity-50'}>
                        <td className="p-2 border-r border-t text-center">
                          <Checkbox
                            checked={parsedData.rows[rowIdx]}
                            onCheckedChange={() => toggleRow(rowIdx)}
                          />
                        </td>
                        {parsedData.columns.map((col, colIdx) => {
                          const rawValue = col.data[rowIdx];
                          const { parsed, valid } = parsedColumnCellValues[col.index][rowIdx];
                          const showError = col.selected && parsedData.rows[rowIdx] && !valid;
                          
                          return (
                            <td
                              key={colIdx}
                              className={`p-2 border-r border-t ${
                                col.selected ? '' : 'bg-slate-50 dark:bg-slate-900'
                              } ${
                                showError ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' :
                                col.type === 'date' ? 'font-medium text-blue-600 dark:text-blue-300' :
                                col.type === 'numeric' ? 'text-slate-600 dark:text-slate-400' :
                                'text-slate-400'
                              }`}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`cursor-default ${col.selected ? '' : 'text-slate-400 dark:text-slate-600'}`}>
                                      {showError ? (
                                        rawValue
                                      ) : (
                                        <div className="space-x-1 flex flex-wrap gap-1">
                                          {col.type === 'date' && parsed instanceof Date ? (
                                            parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                          ) : col.type === 'numeric' && (typeof parsed === 'number' || Array.isArray(parsed)) ? (
                                            (Array.isArray(parsed) ? parsed : [parsed]).map((num, idx) => (
                                              <code key={idx} className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono">
                                                {formatValue(num)}
                                              </code>
                                            ))
                                          ) : (
                                            rawValue
                                          )}
                                        </div>
                                      )}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs max-w-xs">
                                    {showError ? (
                                      <div className="space-y-1">
                                        <div className="font-semibold text-red-600">Invalid {col.type}</div>
                                        <div>Raw: {rawValue}</div>
                                      </div>
                                    ) : (
                                      <div>Raw: {rawValue || '(empty)'}</div>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {validationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}

              {/* Import behavior notes */}
              {parsedData && (hasDuplicates || hasMultipleNumeric || invalidCellCount > 0) && (
                <div className="text-xs text-slate-500 space-y-1 px-1">
                  {hasDuplicates && (
                    <p className="flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>Duplicate date keys detected—numbers will be merged into a single day entry.</span>
                    </p>
                  )}
                  {hasMultipleNumeric && (
                    <p className="flex items-start gap-1.5">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>Multiple numeric columns selected—all numbers will be merged into a single list for each day.</span>
                    </p>
                  )}
                  {invalidCellCount > 0 && (
                    <div className="flex items-start gap-1.5 text-orange-600 dark:text-orange-400">
                      <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        {invalidCellCount} invalid {invalidCellCount === 1 ? 'cell' : 'cells'} detected—these values will be skipped during import.{' '}
                        <button
                          onClick={unselectRowsWithInvalidData}
                          className="underline hover:no-underline font-medium cursor-pointer"
                        >
                          Unselect all rows with invalid data
                        </button>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {!importing && parsedData && overlappingDates.length > 0 && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <div className="space-y-2">
                <p className="font-medium">
                  {overlappingDates.length} date{overlappingDates.length === 1 ? '' : 's'} already exist in this dataset. Choose how to handle overlapping dates:
                </p>
                <RadioGroup value={mergeStrategy} onValueChange={(value) => setMergeStrategy(value as MergeStrategy)} className="mt-2">
                  <div className="flex gap-2">
                    <Label htmlFor="combine" className="flex-1">
                      <div className={`flex items-start space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        mergeStrategy === 'combine' 
                          ? 'border-orange-400 bg-orange-100 dark:border-orange-600 dark:bg-orange-900/50' 
                          : 'border-orange-200 hover:border-orange-300 dark:border-orange-800 dark:hover:border-orange-700'
                      }`}>
                        <RadioGroupItem value="combine" id="combine" className="mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-orange-900 dark:text-orange-100">Combine Numbers</div>
                          <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                            New numbers will be added to existing numbers
                          </div>
                        </div>
                      </div>
                    </Label>
                    <Label htmlFor="replace" className="flex-1">
                      <div className={`flex items-start space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        mergeStrategy === 'replace' 
                          ? 'border-orange-400 bg-orange-100 dark:border-orange-600 dark:bg-orange-900/50' 
                          : 'border-orange-200 hover:border-orange-300 dark:border-orange-800 dark:hover:border-orange-700'
                      }`}>
                        <RadioGroupItem value="replace" id="replace" className="mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-sm text-orange-900 dark:text-orange-100">Replace Data</div>
                          <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">
                            Existing numbers will be completely replaced
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={!parsedData || importing || !!validationError}>
            <Upload className="h-4 w-4 mr-2" />
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImportDialog;
