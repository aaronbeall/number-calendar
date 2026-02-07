import { AppFooter, SettingsMenu, ThemeToggle, UserMenu } from '@/App';
import LogoIcon from '@/assets/logo.png';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatasetCard } from '@/features/dashboard/DatasetCard';
import type { Dataset } from '@/features/db/localdb';
import { usePreference } from '@/hooks/usePreference';
import { ArrowRight, BarChart as BarChartIcon, Home, Plus, Search, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

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

function IntroLanding({ hasExistingData, onOpenCreate }: { hasExistingData: boolean; onOpenCreate: () => void }) {
  const [searchParams, setSearchParams] = useSearchParams();
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-900/20 dark:to-blue-900/20 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16 relative z-10">
        <div className="relative mb-8 group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
          <img
            src={LogoIcon}
            alt="Numbers Go Up"
            className="w-32 h-32 relative transform group-hover:scale-110 transition-all duration-500"
          />
        </div>
        <h1 className="text-6xl md:text-7xl font-black text-center mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
          Numbers Go Up
        </h1>
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-bounce" style={{ animationDelay: '0s' }} />
          <Target className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
          <Sparkles className="w-8 h-8 text-pink-600 dark:text-pink-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
        </div>
        <p className="text-2xl text-center text-slate-700 dark:text-slate-200 mb-12 max-w-3xl font-medium">
          A calendar for <span className="text-purple-600 dark:text-purple-400 font-bold">numberphiles</span>. Track your daily numbers, visualize your progress, and watch your goals come to life.
        </p>
        <button
          onClick={onOpenCreate}
          className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-bold text-lg px-12 py-5 rounded-2xl shadow-2xl hover:shadow-3xl transition-all transform hover:scale-110 flex items-center gap-3 group overflow-hidden mb-16"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-6 h-6 relative z-10 group-hover:rotate-90 transition-transform" />
          <span className="relative z-10">
            { hasExistingData ? 'Create New Number Calendar' : 'Create Your First Number Calendar' }
          </span>
        </button>
        { hasExistingData && (
          <button
            onClick={() => {
              searchParams.delete('intro');
              setSearchParams(searchParams);
            }}
            className="text-sm text-slate-600 dark:text-slate-400 underline hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-12 -mt-8 group cursor-pointer"
          >
            Continue to Existing Data <ArrowRight className="w-4 h-4 inline-block ml-1 group-hover:translate-x-1 transition-transform" />
          </button>
        ) }

        {/* Hero Screenshot */}
        <div className="w-full max-w-6xl mx-auto relative group">
          {/* Gradient border effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
          
          {/* Screenshot container */}
          <div className="relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl shadow-2xl border-4 border-white/50 dark:border-slate-700/50 overflow-hidden">
            {/* Placeholder for screenshot */}
            <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 via-blue-50 to-purple-50 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center opacity-30">
                  <BarChartIcon className="w-16 h-16 text-white" />
                </div>
                <p className="text-2xl font-bold text-slate-400 dark:text-slate-500">App Screenshot Preview</p>
                <p className="text-sm text-slate-400 dark:text-slate-600 mt-2">Your beautiful calendar interface will go here</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-8 py-20 grid grid-cols-1 md:grid-cols-3 gap-10 relative z-10">
        <div className="text-center p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-blue-200 dark:border-blue-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all group">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center transform group-hover:scale-110 transition-all shadow-lg">
            <BarChartIcon className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">Track Anything</h3>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Daily habits, workout reps, business metrics, or life events. If it's a number, track it here.
          </p>
        </div>

        <div className="text-center p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-purple-200 dark:border-purple-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all group">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center transform group-hover:scale-110 transition-all shadow-lg">
            <TrendingUp className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">Visualize Progress</h3>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Beautiful charts and insights help you see patterns and celebrate your wins.
          </p>
        </div>

        <div className="text-center p-8 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-2 border-pink-200 dark:border-pink-700 shadow-xl hover:shadow-2xl hover:scale-105 transition-all group">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-pink-400 to-pink-600 flex items-center justify-center transform group-hover:scale-110 transition-all shadow-lg">
            <Plus className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-slate-100">Multiple Datasets</h3>
          <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            Organize different goals with separate datasets. Fitness, finance, hobbies—all in one place.
          </p>
        </div>
      </div>

      <AppFooter />
    </div>
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
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <img
                src={LogoIcon}
                alt="Numbers Go Up"
                className="w-10 h-10 transition-transform hover:scale-105"
              />
              <div>
                <h1 className="text-2xl font-semibold tracking-tight hover:underline cursor-pointer text-blue-700 dark:text-blue-300" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  Numbers Go Up
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  A calendar for numberphiles
                </p>
              </div>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center gap-4">
              <Link
                to="?intro"
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
                aria-label="View intro"
              >
                <Home className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
              </Link>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search datasets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-indigo-400 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={onOpenCreate}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                New Dataset
              </button>
              <ThemeToggle />
              <SettingsMenu />
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Your Dashboard</h2>
            <p className="text-slate-600 dark:text-slate-400">
              {filteredDatasets.length} {filteredDatasets.length === 1 ? 'dataset' : 'datasets'} • Showing data for {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">Sort:</span>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'created' | 'updated')}>
              <SelectTrigger className="w-36">
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
            className="group w-full text-left rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-slate-700/50 hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700 dark:hover:to-slate-600 hover:border-blue-400 dark:hover:border-blue-500 transition-all p-8 flex flex-col items-center justify-center min-h-[300px] shadow-sm hover:shadow-lg"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/30">
              <Plus className="w-10 h-10 text-white" />
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
