import LogoIcon from '@/assets/icon.svg?react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { Dataset } from '@/features/db/localdb';
import { useMonth } from '@/features/db/useCalendarData';
import { getSeededColorTheme } from '@/lib/colors';
import { getDatasetIcon } from '@/lib/dataset-icons';
import { toDayKey } from '@/lib/friendly-date';
import { getRelativeTime } from '@/lib/utils';
import { ArrowRight, BarChart as BarChartIcon, Copy, Download, Info, MoreVertical, Plus, Search, Settings, Sparkles, Target, TrendingUp, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Line, LineChart, ResponsiveContainer } from 'recharts';

function DatasetCard({ dataset, year, month, onSelect }: { dataset: Dataset; year: number; month: number; onSelect: (id: string) => void }) {
  const { data: monthData = {} } = useMonth(dataset.id, year, month);
  const updated = getRelativeTime(dataset.updatedAt);
  const IconComponent = getDatasetIcon(dataset.icon);
  const { bg: iconBg, text: iconText } = getSeededColorTheme(dataset.id);

  // Memoized chart data and stats
  const stats = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const data: { day: number; dailyTotal: number; cumulativeTotal: number }[] = [];
    let running = 0;
    let totalEntries = 0;
    let activeDays = 0;
    let maxDaily = 0;
    let minDaily = Number.POSITIVE_INFINITY;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = toDayKey(year, month, day);
      const numbers = monthData[dateKey] || [];
      const dailyTotal = numbers.reduce((sum, num) => sum + num, 0);
      
      if (numbers.length > 0) {
        activeDays++;
        totalEntries += numbers.length;
        if (dailyTotal > maxDaily) maxDaily = dailyTotal;
        if (dailyTotal < minDaily) minDaily = dailyTotal;
      }
      
      running += dailyTotal;
      data.push({ day, dailyTotal, cumulativeTotal: running });
    }

    return {
      chartData: data,
      total: running,
      activeDays,
      totalEntries,
      average: activeDays > 0 ? running / activeDays : 0,
      maxDaily: activeDays > 0 ? maxDaily : 0,
      minDaily: activeDays > 0 && minDaily !== Number.POSITIVE_INFINITY ? minDaily : 0,
    };
  }, [monthData, year, month]);

  const lineColor = stats.total >= 0 ? 'rgb(34 197 94)' : 'rgb(239 68 68)';
  const tracking = dataset.tracking;
  const TagIcon = tracking === 'trend' ? TrendingUp : BarChartIcon;
  const badgeColor = tracking === 'trend' 
    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-sm shadow-emerald-500/50'
    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm shadow-blue-500/50';
  
  return (
    <div
      onClick={() => onSelect(dataset.id)}
      className="group relative w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-500 transition-all overflow-hidden cursor-pointer"
    >
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/0 via-indigo-50/0 to-purple-50/0 dark:from-slate-700/0 dark:via-slate-700/0 dark:to-slate-600/0 group-hover:from-blue-50/50 group-hover:via-indigo-50/30 group-hover:to-purple-50/50 dark:group-hover:from-slate-700/30 dark:group-hover:via-slate-700/20 dark:group-hover:to-slate-600/30 transition-all pointer-events-none" />
      
      <div className="relative p-5">
        {/* Header with icon, title, badge, and options */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 border-transparent bg-opacity-60 dark:bg-opacity-50 group-hover:scale-105 transition-all flex-shrink-0 ${iconBg}`}
          >
            <IconComponent className={`w-5 h-5 ${iconText} opacity-60`} style={{ filter: 'none' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-indigo-300 transition-colors flex-1">
                {dataset.name}
              </h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-full ${badgeColor}`}>
                  <TagIcon className="h-3.5 w-3.5" />
                  <span>{tracking === 'trend' ? 'Trend' : 'Series'}</span>
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy As...
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {dataset.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">{dataset.description}</p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Total</div>
            <div className={`text-2xl font-bold ${stats.total >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.total.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Avg/Day</div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.average.toFixed(1)}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 border border-slate-200 dark:border-slate-600">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Active</div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.activeDays}d
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700/30 dark:to-slate-800/30 rounded-xl p-3 border border-slate-200 dark:border-slate-600 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">This Month Trend</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{stats.totalEntries} entries</span>
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                  <Line
                    type="monotone"
                    dataKey="cumulativeTotal"
                    stroke={lineColor}
                    strokeWidth={2.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Updated {updated}</span>
          <span className="font-medium text-blue-600 dark:text-indigo-400 group-hover:underline">
            View Details →
          </span>
        </div>
      </div>
    </div>
  );
}

function IntroLanding({ hasExistingData, onOpenCreate }: { hasExistingData: boolean; onOpenCreate: () => void }) {
  const navigate = useNavigate();
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
          <LogoIcon className="w-32 h-32 relative transform group-hover:scale-110 transition-all duration-500" aria-label="Numbers Go Up" />
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
    </div>
  );
}

function DatasetsLanding({ 
  datasets, 
  year, 
  month, 
  onSelectDataset, 
  onOpenCreate 
}: { 
  datasets: Dataset[]; 
  year: number; 
  month: number; 
  onSelectDataset: (id: string) => void; 
  onOpenCreate: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDatasets = useMemo(() => {
    if (!searchQuery.trim()) return datasets;
    const query = searchQuery.toLowerCase();
    return datasets.filter(
      (dataset) =>
        dataset.name.toLowerCase().includes(query) ||
        (dataset.description && dataset.description.toLowerCase().includes(query))
    );
  }, [datasets, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Modern Header */}
      <header className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Brand */}
            <div className="flex items-center gap-3">
              <LogoIcon className="w-10 h-10 transition-transform hover:scale-105" aria-label="Numbers Go Up" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight hover:underline cursor-pointer" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
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
                <Info className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
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
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Your Dashboard</h2>
          <p className="text-slate-600 dark:text-slate-400">
            {filteredDatasets.length} {filteredDatasets.length === 1 ? 'dataset' : 'datasets'} • Showing data for {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDatasets.map(ds => (
            <DatasetCard 
              key={ds.id} 
              dataset={ds} 
              year={year} 
              month={month} 
              onSelect={onSelectDataset} 
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
    </div>
  );
}

export function Landing({ datasets, onSelectDataset, onOpenCreate }: { datasets: Dataset[]; onSelectDataset: (datasetId: string) => void; onOpenCreate: () => void }) {
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
    />
  );
}
