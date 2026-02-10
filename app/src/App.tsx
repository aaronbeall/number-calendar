import BuyMeACoffeeIcon from '@/assets/buymeacoffee.svg?react';
import LogoIcon from '@/assets/logo.png';
import PatreonIcon from '@/assets/patreon.svg?react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Toaster } from '@/components/ui/sonner';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Award, Bell, CalendarIcon, Download, Flag, Info, Mail, Menu, Moon, Plus, RefreshCw, Settings, Share2, Sparkles, Sun, Target, Trophy, Upload, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
  useMatch,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { toast } from 'sonner';
import { ErrorState } from './components/PageStates';
import { useTheme } from './components/ThemeProvider';
import { Skeleton } from './components/ui/skeleton';
import { Spinner } from './components/ui/spinner';
import { CalendarProvider, useCalendarContext } from './context/CalendarContext';
import AchievementBadge from './features/achievements/AchievementBadge';
import DatasetDialog from './features/dataset/DatasetDialog';
import DuplicateDialog from './features/dataset/DuplicateDialog';
import ExportDialog from './features/dataset/ExportDialog';
import ImportDialog from './features/dataset/ImportDialog';
import type { Dataset } from './features/db/localdb';
import { useDataset, useDatasets } from './features/db/useDatasetData';
import { useAchievements, type NewAchievementResult, type UseAchievementsResult } from './hooks/useAchievements';
import { usePreference } from './hooks/usePreference';
import { useSearchParamState } from './hooks/useSearchParamState';
import { getSeededColorTheme } from './lib/colors';
import { getDatasetIcon } from './lib/dataset-icons';
import { isCurrentWeek } from './lib/friendly-date';
import { getCompletedAchievementsByDateKey, sortGoalResults, type AchievementResult, type GoalResults } from './lib/goals';
import Achievements from './pages/Achievements';
import { AchievementUnlockOverlay } from './features/achievements/AchievementUnlockOverlay';
import { Calendar } from './pages/Calendar';
import { Landing } from './pages/Landing';
import Milestones from './pages/Milestones';
import Records from './pages/Records';
import Targets from './pages/Targets';


function App() {
  const basename = import.meta.env.VITE_BASE || '/';
  return (
    <TooltipProvider delayDuration={300}>
      <Router basename={basename}>
        <AppLayout />
      </Router>
      <Toaster/>
    </TooltipProvider>
  );
}


function AppLayout() {
  const { data: datasets = [], isLoading: datasetsLoading } = useDatasets();
  const [datasetDialog, setDatasetDialog] = useSearchParamState("dataset", "");
  const [importDialog, setImportDialog] = useSearchParamState("import", "");
  const [exportDialog, setExportDialog] = useSearchParamState("export", "");
  const [duplicateDialog, setDuplicateDialog] = useSearchParamState("duplicate", "");
  const [exportDateRange, setExportDateRange] = useState<{ startDate: string; endDate: string } | undefined>(undefined);
  const navigate = useNavigate();

  const editingDataset = datasets.find(dataset => dataset.id === datasetDialog);

  // Helper for dialog
  const handleOpenCreate = () => {
    setDatasetDialog(true);
  };
  const handleOpenEdit = (dataset: Dataset) => {
    setDatasetDialog(dataset.id);
  };
  const handleCloseDialog = () => {
    setDatasetDialog(null);
  };
  const handleOpenImport = (datasetId: string) => {
    setImportDialog(datasetId);
  };
  const handleOpenExport = (datasetId: string, dateRange?: { startDate: string; endDate: string }) => {
    setExportDialog(datasetId);
    setExportDateRange(dateRange);
  };
  const handleOpenDuplicate = (datasetId: string) => {
    setDuplicateDialog(datasetId);
  };

  if (datasetsLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900/80">
        <Spinner className="mb-4" />
        <div className="text-center text-slate-400 text-lg animate-pulse">Loading...</div>
        <AppFooter />
      </div>
    );
  }
  return (
    <>
      <Routes>
        <Route index element={
          <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900/80">
            <Landing
              datasets={datasets}
              onSelectDataset={id => navigate(`/dataset/${id}`)}
              onOpenCreate={handleOpenCreate}
              onOpenEdit={handleOpenEdit}
              onOpenImport={handleOpenImport}
              onOpenExport={(datasetId) => handleOpenExport(datasetId)}
              onDuplicateDataset={handleOpenDuplicate}
            />
          </div>
        } />
        <Route path="milestones" element={<Milestones />} />
        <Route path="targets" element={<Targets />} />
        <Route path="achievements" element={<Achievements />} />
        <Route path="dataset/:datasetId/*" element={
          <CalendarProvider>
            <DatasetLayout
              datasets={datasets}
              onOpenCreate={handleOpenCreate}
              onOpenEdit={handleOpenEdit}
              onOpenImport={handleOpenImport}
              onOpenExport={handleOpenExport}
            />
          </CalendarProvider>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {/* Global Dialogs */}
      { datasetDialog && (
        <DatasetDialog
          open={!!datasetDialog}
          onOpenChange={handleCloseDialog}
          onCreated={id => navigate(`/dataset/${id}`)}
          dataset={editingDataset}
        />
      )}
      { importDialog && (
        <ImportDialog
            open={!!importDialog}
            onOpenChange={setImportDialog}
            datasetId={String(importDialog)}
          />
        )}
      { exportDialog && (
        <ExportDialog
          open={!!exportDialog}
          onOpenChange={setExportDialog}
          datasetId={String(exportDialog)}
          defaultDateRange={exportDateRange}
        />
      )}
      { duplicateDialog && (
        <DuplicateDialog
          open={!!duplicateDialog}
          onOpenChange={setDuplicateDialog}
          onDuplicated={id => navigate(`/dataset/${id}`)}
          dataset={datasets.find(d => d.id === duplicateDialog)!}
        />
      )}
    </>
  );
}

function DatasetLayout({
  datasets,
  onOpenCreate,
  onOpenEdit,
  onOpenImport,
  onOpenExport,
}: {
  datasets: Dataset[];
  onOpenCreate: () => void;
  onOpenEdit: (dataset: Dataset) => void;
  onOpenImport: (datasetId: string) => void;
  onOpenExport: (datasetId: string, dateRange?: { startDate: string; endDate: string }) => void;
}) {
  const { datasetId } = useParams();
  const { data: dataset, isLoading } = useDataset(datasetId ?? '');
  const achievementResults = useAchievements(datasetId ?? '');
  const achievementResultsByDateKey = useMemo(
    () => getCompletedAchievementsByDateKey(achievementResults.all),
    [achievementResults.all]
  );
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900/80">
        <Skeleton className="h-16 w-full" />
        <div className="flex-1 w-full p-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-10 w-full mb-8" />
            <div className="grid grid-cols-5 gap-4">
              {[...Array(20)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  } else if (!dataset) {
    return (
      <ErrorState
        title="Dataset not found"
        message="This dataset could not be loaded. It may have been removed or the link is outdated."
        details={datasetId ? `Requested dataset id: ${datasetId}` : undefined}
        actions={[{ label: 'Back to home', to: '/' }]}
      />
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900/80">
      <AppHeader
        currentDataset={dataset}
        datasets={datasets}
        onOpenCreate={onOpenCreate}
        onOpenEdit={onOpenEdit}
        onOpenImport={() => onOpenImport(dataset.id)}
        onOpenExport={(dateRange) => onOpenExport(dataset.id, dateRange)}
        achievementResults={achievementResults}
      />
      <div className="flex-1 w-full">
        <Routes>
          <Route index element={<Calendar dataset={dataset} achievementResultsByDateKey={achievementResultsByDateKey} />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="targets" element={<Targets />} />
          <Route path="milestones" element={<Milestones />} />
          <Route path="records" element={<Records datasetId={dataset.id} />} />
          <Route path="settings" element={<div className="max-w-4xl mx-auto p-8"><h2 className="text-2xl font-bold mb-4">Settings</h2></div>} />
        </Routes>
      </div>
      <AppFooter />
    </div>
  );
}


// Extracted AppHeader for persistent header/nav
function AppHeader({
  currentDataset,
  datasets,
  onOpenCreate,
  onOpenEdit,
  onOpenImport,
  onOpenExport,
  achievementResults,
}: {
  currentDataset: Dataset;
  datasets: Dataset[];
  onOpenCreate: () => void;
  onOpenEdit: (dataset: Dataset) => void;
  onOpenImport: () => void;
  onOpenExport: (dateRange?: { startDate: string; endDate: string }) => void;
  achievementResults: UseAchievementsResult;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { getDefaultExportDateRange } = useCalendarContext();
  const { bg: datasetBg, text: datasetText } = getSeededColorTheme(currentDataset.id);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const { milestones, targets, achievements, new: newResults } = achievementResults;
  const [overlayAchievements, setOverlayAchievements] = useState<NewAchievementResult[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  
  // Check if currently on the calendar view (index route of dataset)
  const calendarMatch = useMatch(`/dataset/${currentDataset.id}`);
  const isOnCalendar = calendarMatch !== null;

  const getDatasetPath = (datasetId: string) => {
    const basePath = `/dataset/${currentDataset.id}`;
    const subPath = location.pathname.startsWith(basePath)
      ? location.pathname.slice(basePath.length)
      : '';
    const normalizedSubPath = subPath === '/' ? '' : subPath;
    return `/dataset/${datasetId}${normalizedSubPath}${location.search}${location.hash}`;
  };

  const provisionalCounts = useMemo(() => {
    const count = (results: GoalResults[], by: (ach: AchievementResult) => boolean) =>
      results.reduce((sum, result) => sum + result.achievements.filter(by).length, 0);
    const milestoneCount = count(milestones, ach => !!ach.completedAt && isCurrentWeek(ach.completedAt));
    const targetCount = count(targets, ach => !!ach.provisional);
    const achievementCount = count(achievements, ach => !!ach.provisional);
    return {
      milestones: milestoneCount,
      targets: targetCount,
      achievements: achievementCount,
      total: milestoneCount + targetCount + achievementCount,
    };
  }, [achievements, milestones, targets]);

  const allResults = useMemo(
    () => sortGoalResults([...milestones, ...targets, ...achievements]),
    [achievements, milestones, targets]
  );

  useEffect(() => {
    if (newResults.length === 0) return;
    const overlayItems: NewAchievementResult[] = [];
    const toastItems: NewAchievementResult[] = [];
    const goalResultsById = new Map(allResults.map(result => [result.goal.id, result]));
    newResults.forEach(result => {
      const goalResult = goalResultsById.get(result.goal.id);
      if (goalResult?.completedCount === 1) overlayItems.push(result);
      else toastItems.push(result);
    });
    toastItems.forEach(result => {
      const title = result.goal.title;
      const description = result.goal.description;
      toast.custom(() => (
        <div className="flex w-[360px] items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-800 dark:bg-slate-950">
          <AchievementBadge badge={result.goal.badge} size="small" animate />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              {title}
            </div>
            {description && (
              <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                {description}
              </div>
            )}
          </div>
        </div>
      ));
    });
    if (overlayItems.length > 0) {
      setOverlayAchievements(overlayItems);
      setOverlayOpen(true);
    }
  }, [newResults]);
  
  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="relative flex items-center justify-between gap-4">
          {/* Left: Menu + Dataset */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 flex-shrink-0">
                  <Menu className="h-4 w-4" />
                  {provisionalCounts.total > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {!isOnCalendar && (
                  <>
                    <DropdownMenuItem className="gap-2" asChild>
                      <Link to={currentDataset ? `/dataset/${currentDataset.id}` : '#'}>
                        <CalendarIcon className="h-4 w-4" />
                        Calendar
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem className="gap-2" asChild>
                  <Link className="flex w-full items-center gap-2" to={currentDataset ? `/dataset/${currentDataset.id}/milestones` : '#'}>
                    <Flag className="h-4 w-4" />
                    <span className="flex-1">Milestones</span>
                    {provisionalCounts.milestones > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {provisionalCounts.milestones}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" asChild>
                  <Link className="flex w-full items-center gap-2" to={currentDataset ? `/dataset/${currentDataset.id}/targets` : '#'}>
                    <Target className="h-4 w-4" />
                    <span className="flex-1">Targets</span>
                    {provisionalCounts.targets > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {provisionalCounts.targets}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" asChild>
                  <Link className="flex w-full items-center gap-2" to={currentDataset ? `/dataset/${currentDataset.id}/achievements` : '#'}>
                    <Trophy className="h-4 w-4" />
                    <span className="flex-1">Achievements</span>
                    {provisionalCounts.achievements > 0 && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                        {provisionalCounts.achievements}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}/records` : '#'}>
                    <Award className="h-4 w-4" />
                    Records
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-md mx-1 my-1 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800" onClick={() => setShowAIInsights(true)}>
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-pink-300" />
                  <span className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-pink-700 dark:to-purple-700 bg-clip-text text-transparent font-semibold">AI Insights</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onClick={onOpenImport}>
                  <Upload className="h-4 w-4" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => onOpenExport(getDefaultExportDateRange())}>
                  <Download className="h-4 w-4" />
                  Export
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Dataset Badge Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-transparent bg-opacity-60 dark:bg-opacity-50 hover:bg-opacity-80 dark:hover:bg-opacity-70 min-w-0 transition-all cursor-pointer ${datasetBg}`}>
                  {(() => { const Icon = getDatasetIcon(currentDataset?.icon); return <Icon className={`h-4 w-4 opacity-60 flex-shrink-0 ${datasetText}`} />; })()}
                  <span className={`font-semibold truncate text-sm ${datasetText}`}>{currentDataset?.name || 'Dataset'}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Datasets
                </DropdownMenuLabel>
                {datasets.filter(ds => ds.id !== currentDataset?.id).length === 0 && (
                  <DropdownMenuItem disabled>No other datasets</DropdownMenuItem>
                )}
                {datasets.filter(ds => ds.id !== currentDataset?.id).map(ds => {
                  const Icon = getDatasetIcon(ds.icon);
                  const { bg: dsBg, text: dsText } = getSeededColorTheme(ds.id);
                  return (
                    <DropdownMenuItem key={ds.id} onClick={() => navigate(getDatasetPath(ds.id))} className="gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-opacity-60 dark:bg-opacity-50 ${dsBg}`}>
                        <Icon className={`h-3 w-3 opacity-60 ${dsText}`} />
                      </div>
                      <span className="truncate">{ds.name}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => currentDataset && onOpenEdit(currentDataset)}
                >
                  <Settings className="h-4 w-4" />
                  Settings…
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2"
                  onClick={() => {
                    onOpenCreate();
                  }}
                >
                  <Plus className="h-4 w-4" />
                  New Dataset
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Center: Logo/Branding */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 group flex-shrink-0">
            <img
              src={LogoIcon}
              alt="Numbers Go Up"
              className="w-7 h-7 transition-transform group-hover:scale-105"
            />
            <div className="hidden sm:flex flex-col">
              <h1 className="text-sm font-bold text-slate-700 dark:text-slate-300 tracking-tight group-hover:underline" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                Numbers Go Up
              </h1>
            </div>
          </Link>

          {/* Right: Controls */}
          <div className="flex items-center gap-2 flex-shrink-0 flex-1 justify-end">
            <ThemeToggle />
            <SettingsMenu />
            <UserMenu />
          </div>
        </div>
      </div>

      {/* AI Insights Dialog */}
      <Dialog open={showAIInsights} onOpenChange={setShowAIInsights}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-2">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <DialogTitle>AI Insights</DialogTitle>
            </div>
            <DialogDescription>
              Intelligent analysis and recommendations for your data—coming soon!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3">
              <p className="text-sm text-amber-900 dark:text-amber-200">
                We're working hard to bring you AI-powered insights that will help you understand your data better and reach your goals faster.
              </p>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400">
              Have ideas or want to help shape this feature? We'd love to hear your feedback!
            </p>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">Close</Button>
            </DialogClose>
            <a
              href="mailto:support@metamodernmonkey.com?subject=AI%20Insights"
              className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-colors font-medium text-sm"
            >
              Send Feedback
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </header>
      {overlayOpen && overlayAchievements.length > 0 && (
        <AchievementUnlockOverlay
          achievements={overlayAchievements}
          onClose={() => {
            setOverlayOpen(false);
            setOverlayAchievements([]);
          }}
        />
      )}
    </>
  );
}

export function SettingsMenu() {
  const { theme, setTheme } = useTheme();
  const [reduceMotion, setReduceMotion] = usePreference("reduceMotion", false);
  const [showTips, setShowTips] = usePreference("showTips", true);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Preferences">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
          <DialogDescription>Customize your experience.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pref-theme" className="text-sm">Theme</Label>
            <div className="flex items-center gap-2">
              <Button variant={theme === 'light' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('light')}>Light</Button>
              <Button variant={theme === 'dark' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('dark')}>Dark</Button>
              <Button variant={theme === 'system' ? 'secondary' : 'ghost'} size="sm" onClick={() => setTheme('system')}>System</Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pref-motion" className="text-sm">Reduce Motion</Label>
            <Switch id="pref-motion" checked={reduceMotion} onCheckedChange={setReduceMotion} />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="pref-tips" className="text-sm">Show Tips</Label>
            <Switch id="pref-tips" checked={showTips} onCheckedChange={setShowTips} />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="default">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserMenu() {
  const [openSync, setOpenSync] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
  const [openSubscribe, setOpenSubscribe] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Numbers Go Up',
        text: 'A calendar for numberphiles - Track your daily numbers and visualize your progress!',
        url: window.location.href,
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('https://metamodernmonkey.com/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus('error');
        setErrorMessage(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setStatus('success');
      setEmail('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
      console.error('Subscribe error:', error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="User menu">
            <User className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-slate-500 whitespace-normal leading-snug">
            This app is free. Your data stays on this device. No account required.
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenSync(true)}>
            <RefreshCw className="h-4 w-4 text-slate-500" />
            Sync Data
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenAbout(true)}>
            <Info className="h-4 w-4 text-slate-500" />
            About
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" asChild>
            <a href="mailto:support@metamodernmonkey.com" className="flex w-full items-center gap-2">
              <Mail className="h-4 w-4 text-slate-500" />
              Contact Support
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenSubscribe(true)}>
            <Bell className="h-4 w-4 text-slate-500" />
            Signup for Updates
          </DropdownMenuItem>
          {typeof navigator.share === 'function' && (
            <DropdownMenuItem className="gap-2" onSelect={handleShare}>
              <Share2 className="h-4 w-4 text-slate-500" />
              Share
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2" asChild>
            <a
              href="https://patreon.com/metamodernmonkey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2"
            >
              <PatreonIcon className="h-4 w-4 text-slate-500" /> Patreon
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2" asChild>
            <a
              href="https://buymeacoffee.com/metamodernmonkey"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-2"
            >
              <BuyMeACoffeeIcon className="h-4 w-4 text-slate-500" /> Buy Me a Coffee
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sync Data Dialog */}
      <Dialog open={openSync} onOpenChange={setOpenSync}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sync Data</DialogTitle>
            <DialogDescription>
              Sync across devices is coming soon. For now, you can export and import your data from the dataset menu.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={openAbout} onOpenChange={setOpenAbout}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <img
                  src={LogoIcon}
                  alt="Numbers Go Up"
                  className="h-6 w-6"
                />
                <DialogTitle>About Numbers Go Up</DialogTitle>
              </div>
              {/* <div className="text-xs text-slate-500 dark:text-slate-400">
                Version: {import.meta.env.VITE_APP_VERSION || 'Beta'}
              </div> */}
            </div>
            <DialogDescription>
              Numbers Go Up is crafted by
              {' '}<a href="https://metamodernmonkey.com" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Meta Modern Monkey</a>
              {' '}for people who love numbers, calendars, and the motivation to keep improving — and to celebrate the wins that come with reaching your goals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
              <p>
                Privacy-first: all data is stored on your device. No accounts, no servers, no tracking.
              </p>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
              <p>
                Free for any use. If you find it helpful, your support keeps it free for everyone.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href="https://patreon.com/metamodernmonkey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors"
                >
                  <PatreonIcon className="h-4 w-4 text-pink-600" />
                  <span className="font-medium">Become a Patreon Member</span>
                </a>
                <a
                  href="https://buymeacoffee.com/metamodernmonkey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                >
                  <BuyMeACoffeeIcon className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Buy Me a Coffee</span>
                </a>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>&copy; {new Date().getFullYear()} <a href="https://metamodernmonkey.com" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Meta Modern Monkey</a></span>
              <a href="mailto:support@metamodernmonkey.com" className="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors">support@metamodernmonkey.com</a>
            </div>

            
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscribe Dialog */}
      <Dialog open={openSubscribe} onOpenChange={setOpenSubscribe}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Subscribe for Updates</DialogTitle>
            <DialogDescription>
              Get occasional updates about new features.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubscribeSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subscribe-email" className="text-sm">Email</Label>
              <Input 
                id="subscribe-email" 
                type="email" 
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === 'loading'}
              />
            </div>
            {status === 'error' && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
                {errorMessage}
              </div>
            )}
            {status === 'success' && (
              <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 text-sm text-green-700 dark:text-green-400">
                Successfully subscribed! Check your email for confirmation.
              </div>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button 
                type="submit" 
                disabled={status === 'loading' || !email}
              >
                {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ThemeToggle() {
  const { appliedTheme: theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      aria-label="Toggle light/dark mode"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <Moon className="h-4 w-4 text-blue-500" />
      ) : (
        <Sun className="h-4 w-4 text-yellow-400" />
      )}
    </Button>
  );
}

export function AppFooter() {
  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Numbers Go Up',
        text: 'A calendar for numberphiles - Track your daily numbers and visualize your progress!',
        url: window.location.href,
      });
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  return (
    <footer className="w-full py-4 text-center text-xs text-slate-400 bg-transparent mt-8">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span>
          Made with <span aria-label="love" role="img">❤️</span> and <span aria-label="banana" role="img">🍌</span> by <a href="https://metamodernmonkey.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500 transition-colors">Meta Modern Monkey</a> &copy; {new Date().getFullYear()}
        </span>

        <a
          href="https://patreon.com/metamodernmonkey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors group"
          aria-label="Patreon"
        >
          <PatreonIcon className="w-3 h-3 text-slate-400 group-hover:text-pink-600 transition-colors" />
          <span className="group-hover:text-pink-600 transition-colors">Patreon</span>
        </a>

        <a
          href="https://buymeacoffee.com/metamodernmonkey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
          aria-label="Buy Me a Coffee"
        >
          <BuyMeACoffeeIcon className="w-3 h-3 text-slate-400 group-hover:text-yellow-600 transition-colors" />
          <span className="group-hover:text-yellow-600 transition-colors">Buy Me a Coffee</span>
        </a>

        {typeof navigator.share === 'function' && (
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
            aria-label="Share"
          >
            <Share2 className="w-3 h-3 group-hover:text-blue-500 transition-colors" />
            <span className="group-hover:text-blue-500 transition-colors">Share</span>
          </button>
        )}
      </div>
    </footer>
  );
}

export default App;
