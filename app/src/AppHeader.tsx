import BuyMeACoffeeIcon from '@/assets/buymeacoffee.svg?react';
import LogoIcon from '@/assets/logo.png';
import PatreonIcon from '@/assets/patreon.svg?react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Award, Bell, CalendarDays, CalendarIcon, ChartNoAxesColumn, Download, Flag, Grid3X3, Info, List, Mail, Menu, Moon, Plus, RefreshCw, Settings, Share2, Sparkles, Sun, Target, TrendingUp, Trophy, Upload, User } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate
} from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from './components/ThemeProvider';
import { useCalendar } from './context/useCalendar';
import { AchievementToast } from './features/achievements/AchievementToast';
import { AchievementUnlockOverlay } from './features/achievements/AchievementUnlockOverlay';
import type { Dataset } from './features/db/localdb';
import { type NewAchievementResult, type UseAchievementsResult } from './hooks/useAchievements';
import { usePreference } from './hooks/usePreference';
import { getSeededColorTheme } from './lib/colors';
import { getDatasetIcon } from './lib/dataset-icons';
import { isCurrentWeek } from './lib/friendly-date';
import { sortGoalResults, type AchievementResult, type GoalResults } from './lib/goals';
import { getRelativeTime } from './lib/utils';

export function AppHeader({
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
  const { mode, setMode, getDefaultExportDateRange } = useCalendar();
  const { bg: datasetBg, text: datasetText } = getSeededColorTheme(currentDataset.id);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const { milestones, targets, achievements, new: newResults } = achievementResults;
  const [overlayAchievements, setOverlayAchievements] = useState<NewAchievementResult[]>([]);
  const [overlayOpen, setOverlayOpen] = useState(false);

  // Determine current page for active state styling
  const currentPage = useMemo(() => {
    const basePath = `/dataset/${currentDataset.id}`;
    const path = location.pathname;
    if (path === basePath || path === `${basePath}/`) return 'calendar';
    if (path.startsWith(`${basePath}/timeline`)) return 'timeline';
    if (path.startsWith(`${basePath}/analysis`)) return 'analysis';
    if (path.startsWith(`${basePath}/milestones`)) return 'milestones';
    if (path.startsWith(`${basePath}/targets`)) return 'targets';
    if (path.startsWith(`${basePath}/achievements`)) return 'achievements';
    if (path.startsWith(`${basePath}/records`)) return 'records';
    return null;
  }, [location.pathname, currentDataset.id]);

  const activeStyles = 'dark:border-blue-400 bg-blue-50 dark:bg-blue-950/30 font-semibold text-blue-700 dark:text-blue-300 pointer-events-none';
  const inactiveStyles = 'hover:bg-slate-100 dark:hover:bg-slate-800';

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
      toast.custom(() => <AchievementToast result={result} />);
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
                <DropdownMenuItem className={`gap-2 hidden sm:flex ${currentPage === 'calendar' ? activeStyles : inactiveStyles}`} asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}` : '#'}>
                    <CalendarIcon className="h-4 w-4" />
                    Calendar
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className={`gap-2 sm:hidden ${currentPage === 'calendar' && mode === 'daily' ? activeStyles : inactiveStyles}`} onClick={() => {
                  setMode('daily');
                  if (currentPage !== 'calendar') {
                    navigate(currentDataset ? `/dataset/${currentDataset.id}` : '#');
                  }
                }}>
                  <CalendarDays className="h-4 w-4" />
                  Daily
                </DropdownMenuItem>
                <DropdownMenuItem className={`gap-2 sm:hidden ${currentPage === 'calendar' && mode === 'monthly' ? activeStyles : inactiveStyles}`} onClick={() => {
                  setMode('monthly');
                  if (currentPage !== 'calendar') {
                    navigate(currentDataset ? `/dataset/${currentDataset.id}` : '#');
                  }
                }}>
                  <Grid3X3 className="h-4 w-4" />
                  Monthly
                </DropdownMenuItem>
                <DropdownMenuItem className={`gap-2 ${currentPage === 'timeline' ? activeStyles : inactiveStyles}`} asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}/timeline` : '#'}>
                    <List className="h-4 w-4" />
                    Timeline
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className={`gap-2 ${currentPage === 'analysis' ? activeStyles : inactiveStyles}`} asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}/analysis` : '#'}>
                    <ChartNoAxesColumn className="h-4 w-4" />
                    Analysis
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className={`gap-2 ${currentPage === 'milestones' ? activeStyles : inactiveStyles}`} asChild>
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
                <DropdownMenuItem className={`gap-2 ${currentPage === 'targets' ? activeStyles : inactiveStyles}`} asChild>
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
                <DropdownMenuItem className={`gap-2 ${currentPage === 'achievements' ? activeStyles : inactiveStyles}`} asChild>
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
                <DropdownMenuItem className={`gap-2 ${currentPage === 'records' ? activeStyles : inactiveStyles}`} asChild>
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
              <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-1rem)]">
                {/* Current Dataset */}
                <div className="px-2 py-2">
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-opacity-60 dark:bg-opacity-50 ${datasetBg}`}>
                        {(() => { const Icon = getDatasetIcon(currentDataset?.icon); return <Icon className={`h-4 w-4 opacity-60 ${datasetText}`} />; })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold text-slate-900 dark:text-slate-100`}>
                          {currentDataset?.name || 'Dataset'}
                        </div>
                        {currentDataset?.description && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {currentDataset.description}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 italic">
                          updated {getRelativeTime(currentDataset?.updatedAt)}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className="text-[10px] gap-1 h-5">
                            {currentDataset?.tracking === 'trend' ? (
                              <>
                                <TrendingUp className="h-2.5 w-2.5" />
                                Trend
                              </>
                            ) : (
                              <>
                                <ChartNoAxesColumn className="h-2.5 w-2.5" />
                                Series
                              </>
                            )}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1 h-5">
                            {currentDataset?.valence === 'positive' ? '↑ Higher' : currentDataset?.valence === 'negative' ? '↓ Lower' : '→ Neutral'}
                          </Badge>
                        </div>
                      </div>
                      <button
                        onClick={() => currentDataset && onOpenEdit(currentDataset)}
                        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1"
                        aria-label="Edit dataset"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <DropdownMenuSeparator />

                {/* Recent Datasets */}
                <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2">
                  Recent Datasets
                </DropdownMenuLabel>
                {(() => {
                  const recent = datasets
                    .filter(ds => ds.id !== currentDataset?.id)
                    .sort((a, b) => {
                      const aTime = typeof a.updatedAt === 'string' ? new Date(a.updatedAt).getTime() : a.updatedAt;
                      const bTime = typeof b.updatedAt === 'string' ? new Date(b.updatedAt).getTime() : b.updatedAt;
                      return bTime - aTime;
                    })
                    .slice(0, 5);

                  if (recent.length === 0) {
                    return <DropdownMenuItem disabled className="text-xs text-slate-500">No other datasets</DropdownMenuItem>;
                  }

                  return recent.map(ds => {
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
                  });
                })()}

                <DropdownMenuItem
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1.5"
                  onClick={() => navigate('/')}
                >
                  View all datasets ({datasets.length}) →
                </DropdownMenuItem>

                <DropdownMenuSeparator />

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

export function UserMenu() {
  const { theme, setTheme } = useTheme();
  const [reduceMotion, setReduceMotion] = usePreference("reduceMotion", false);
  const [showTips, setShowTips] = usePreference("showTips", true);
  const [openSync, setOpenSync] = useState(false);
  const [openAbout, setOpenAbout] = useState(false);
  const [openPreferences, setOpenPreferences] = useState(false);
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
          <DropdownMenuItem className="gap-2" onSelect={() => setOpenPreferences(true)}>
            <Settings className="h-4 w-4 text-slate-500" />
            Preferences
          </DropdownMenuItem>
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

      {/* Preferences Dialog */}
      <Dialog open={openPreferences} onOpenChange={setOpenPreferences}>
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