import { AppFooter } from '@/App';
import { ThemeToggle, UserMenu } from '@/AppHeader';
import LogoIcon from '@/assets/logo.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatasetCard } from '@/features/dashboard/DatasetCard';
import type { Dataset } from '@/features/db/localdb';
import { usePreference } from '@/hooks/usePreference';
import { Home, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { IntroLanding } from './IntroLanding';

export function Landing({ 
  datasets, 
  onSelectDataset, 
  onOpenCreate,
  onOpenEdit,
  onOpenImport,
  onOpenExport,
  onDuplicateDataset,
}: { 
  datasets: Dataset[]; 
  onSelectDataset: (datasetId: string) => void; 
  onOpenCreate: () => void;
  onOpenEdit: (dataset: Dataset) => void;
  onOpenImport: (datasetId: string) => void;
  onOpenExport: (datasetId: string) => void;
  onDuplicateDataset: (datasetId: string) => void;
}) {
  const searchParams = useSearchParams();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (datasets.length === 0 || searchParams[0].has('intro')) {
    return <IntroLanding hasExistingData={datasets.length > 0} onOpenCreate={onOpenCreate} />;
  }

  return (
    <DatasetsLanding 
      datasets={datasets}
      year={currentYear}
      month={currentMonth}
      onSelectDataset={onSelectDataset}
      onOpenCreate={onOpenCreate}
      onOpenEdit={onOpenEdit}
      onOpenImport={onOpenImport}
      onOpenExport={onOpenExport}
      onDuplicateDataset={onDuplicateDataset}
    />
  );
}

function DatasetsLanding({ 
  datasets, 
  year, 
  month, 
  onSelectDataset, 
  onOpenCreate,
  onOpenEdit,
  onOpenImport,
  onOpenExport,
  onDuplicateDataset,
}: { 
  datasets: Dataset[]; 
  year: number; 
  month: number; 
  onSelectDataset: (id: string) => void; 
  onOpenCreate: () => void;
  onOpenEdit: (dataset: Dataset) => void;
  onOpenImport: (datasetId: string) => void;
  onOpenExport: (datasetId: string) => void;
  onDuplicateDataset: (datasetId: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = usePreference<'created' | 'updated'>('datasets.sortOrder', 'updated');

  const filteredDatasets = useMemo(() => {
    const base = !searchQuery.trim()
      ? datasets
      : datasets.filter(ds => {
          const query = searchQuery.toLowerCase();
          return (
            ds.name.toLowerCase().includes(query) ||
            (ds.description && ds.description.toLowerCase().includes(query))
          );
        });
    const sorted = [...base].sort((a, b) => {
      const aTime = new Date(sortBy === 'updated' ? a.updatedAt : a.createdAt).getTime();
      const bTime = new Date(sortBy === 'updated' ? b.updatedAt : b.createdAt).getTime();
      // Newest first
      return bTime - aTime;
    });
    return sorted;
  }, [datasets, searchQuery, sortBy]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 sm:py-4">
          {/* Top row: Logo, Search (desktop), and icon buttons */}
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Logo and Brand */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <img
                src={LogoIcon}
                alt="Numbers Go Up"
                className="w-8 sm:w-10 h-8 sm:h-10 flex-shrink-0 transition-transform hover:scale-105"
              />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-blue-700 dark:text-blue-300 truncate" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  Numbers Go Up
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                  A calendar for numberphiles
                </p>
              </div>
            </div>

            {/* Search on desktop (top row) */}
            <div className="hidden sm:flex items-center relative max-w-xs flex-1 px-2">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-400 transition-all"
              />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <Link
                to="?intro"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                aria-label="View intro"
              >
                <Home className="w-4 sm:w-5 h-4 sm:h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              </Link>
              <button
                type="button"
                onClick={onOpenCreate}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex-shrink-0 sm:hidden"
                aria-label="Create new dataset"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onOpenCreate}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New</span>
              </button>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>

          {/* Bottom row: Search (mobile only) */}
          <div className="relative sm:hidden mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-400 transition-all"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="w-full sm:w-auto">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Your Dashboard</h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {filteredDatasets.length} {filteredDatasets.length === 1 ? 'dataset' : 'datasets'} • Showing data for {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm text-slate-600 dark:text-slate-300">Sort:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'created' | 'updated')}>
              <SelectTrigger className="w-32 sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="created">Created</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map(ds => (
            <DatasetCard
              key={ds.id} 
              dataset={ds} 
              year={year} 
              month={month} 
              onSelect={onSelectDataset}
              onOpenEdit={onOpenEdit}
              onOpenImport={onOpenImport}
              onOpenExport={onOpenExport}
              onDuplicateDataset={onDuplicateDataset}
            />
          ))}
          
          {/* Add New Dataset Card */}
          <button
            onClick={onOpenCreate}
            className="group w-full text-left rounded-2xl border-2 border-dashed border-slate-300/80 dark:border-slate-600/70 bg-transparent hover:bg-slate-50/60 dark:hover:bg-slate-800/40 hover:border-slate-400 dark:hover:border-slate-500 transition-all p-8 flex flex-col items-center justify-center min-h-[300px] shadow-none hover:shadow-md"
          >
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300/80 dark:border-slate-600/70 bg-white/70 dark:bg-slate-900/40 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-sm">
              <Plus className="w-10 h-10 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Create New Dataset</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              Start tracking a new set of numbers
            </p>
          </button>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
