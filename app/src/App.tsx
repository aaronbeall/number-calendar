import { Menu, Settings, User, Trophy, Target, Plus, Sparkles, Sun, Moon, Award, Download, Upload, Share2 } from 'lucide-react';
import LogoIcon from '@/assets/icon.svg?react';
import BuyMeACoffeeIcon from '@/assets/buymeacoffee.svg?react';
import PatreonIcon from '@/assets/patreon.svg?react';
import { useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useParams,
  useNavigate,
  Navigate,
  Link,
} from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getDatasetIcon } from './lib/dataset-icons';
import { useDataset, useDatasets } from './features/db/useDatasetData';
import DatasetDialog from './features/dataset/DatasetDialog';
import ImportDialog from './features/dataset/ImportDialog';
import ExportDialog from './features/dataset/ExportDialog';
import { CalendarProvider, useCalendarContext } from './context/CalendarContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from './components/ThemeProvider';
import type { Dataset } from './features/db/localdb';
import { Landing } from './pages/Landing';
import { Calendar } from './pages/Calendar';
import Records from './pages/Records';
import { Spinner } from './components/ui/spinner';
import { Skeleton } from './components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';


function App() {
  const basename = import.meta.env.VITE_BASE || '/';
  return (
    <TooltipProvider delayDuration={300}>
      <Router basename={basename}>
        <AppLayout />
      </Router>
    </TooltipProvider>
  );
}


function AppLayout() {
  const { data: datasets = [], isLoading: datasetsLoading } = useDatasets();
  const [showDatasetDialog, setShowDatasetDialog] = useState(false);
  const [editingDataset, setEditingDataset] = useState<Dataset | undefined>(undefined);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [exportDateRange, setExportDateRange] = useState<{ startDate: string; endDate: string } | undefined>(undefined);
  const navigate = useNavigate();

  // Helper for dialog
  const handleOpenCreate = () => {
    setEditingDataset(undefined);
    setShowDatasetDialog(true);
  }
  const handleOpenEdit = (dataset: Dataset) => {
    setEditingDataset(dataset);
    setShowDatasetDialog(true);
  };
  const handleCloseDialog = () => {
    setShowDatasetDialog(false);
    setEditingDataset(undefined);
  };
  const handleOpenImport = (datasetId: string) => {
    setActiveDatasetId(datasetId);
    setShowImportDialog(true);
  };
  const handleOpenExport = (datasetId: string, dateRange?: { startDate: string; endDate: string }) => {
    setActiveDatasetId(datasetId);
    setExportDateRange(dateRange);
    setShowExportDialog(true);
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
            />
          </div>
        } />
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
      { showDatasetDialog && (
        <DatasetDialog
          open={showDatasetDialog}
          onOpenChange={handleCloseDialog}
          onCreated={id => navigate(`/dataset/${id}`)}
          dataset={editingDataset}
        />
      )}
      { activeDatasetId && showImportDialog && (
        <ImportDialog
            open={showImportDialog}
            onOpenChange={setShowImportDialog}
            datasetId={activeDatasetId}
          />
        )}
      { activeDatasetId && showExportDialog && (
        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          datasetId={activeDatasetId}
          defaultDateRange={exportDateRange}
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
    return <Navigate to="/" replace />;
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
      />
      <div className="flex-1 w-full">
        <Routes>
          <Route index element={<Calendar dataset={dataset} />} />
          <Route path="achievements" element={<div className="max-w-4xl mx-auto p-8"><h2 className="text-2xl font-bold mb-4">Achievements</h2></div>} />
          <Route path="milestones" element={<div className="max-w-4xl mx-auto p-8"><h2 className="text-2xl font-bold mb-4">Milestones</h2></div>} />
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
}: {
  currentDataset: Dataset;
  datasets: Dataset[];
  onOpenCreate: () => void;
  onOpenEdit: (dataset: Dataset) => void;
  onOpenImport: () => void;
  onOpenExport: (dateRange?: { startDate: string; endDate: string }) => void;
}) {
  const navigate = useNavigate();
  const { getDefaultExportDateRange } = useCalendarContext();
  
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Dataset
                </DropdownMenuLabel>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-md mx-1 mb-1 hover:from-blue-100 hover:to-indigo-100 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800">
                    {(() => { const Icon = getDatasetIcon(currentDataset?.icon); return <Icon className="h-4 w-4 text-blue-600 dark:text-blue-300" />; })()}
                    <span className="font-semibold text-blue-900 dark:text-blue-200">{currentDataset?.name || 'Dataset'}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuLabel className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Other Datasets</DropdownMenuLabel>
                    {datasets.filter(ds => ds.id !== currentDataset?.id).length === 0 && (
                      <DropdownMenuItem disabled>No other datasets</DropdownMenuItem>
                    )}
                    {datasets.filter(ds => ds.id !== currentDataset?.id).map(ds => {
                      const Icon = getDatasetIcon(ds.icon);
                      return (
                        <DropdownMenuItem key={ds.id} onClick={() => navigate(`/dataset/${ds.id}`)} className="gap-2">
                          <Icon className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                          {ds.name}
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
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}/achievements` : '#'}>
                    <Trophy className="h-4 w-4" />
                    Achievements
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}/milestones` : '#'}>
                    <Target className="h-4 w-4" />
                    Milestones
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" asChild>
                  <Link to={currentDataset ? `/dataset/${currentDataset.id}/records` : '#'}>
                    <Award className="h-4 w-4" />
                    Records
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border border-purple-200 rounded-md mx-1 my-1 dark:bg-gradient-to-r dark:from-slate-800 dark:to-slate-900 dark:border-slate-700 dark:hover:from-slate-700 dark:hover:to-slate-800">
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
            <Link to="/" className="flex items-center gap-2 group">
              <LogoIcon className="w-10 h-10 transition-transform group-hover:scale-105" aria-label="Numbers Go Up" />
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent tracking-tight group-hover:underline" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
                  Numbers Go Up
                </h1>
                <p className="text-xs text-slate-500 font-medium">A calendar for numberphiles</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <SettingsMenu />
            <UserMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

export function SettingsMenu() {
  const { theme, setTheme } = useTheme();
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);
  const [showTips, setShowTips] = useState<boolean>(true);

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
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <User className="h-4 w-4" />
    </Button>
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
          <PatreonIcon className="w-3 h-3 fill-slate-400 group-hover:fill-pink-600 transition-colors" />
          <span className="group-hover:text-pink-600 transition-colors">Patreon</span>
        </a>

        <a
          href="https://buymeacoffee.com/metamodernmonkey"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors group"
          aria-label="Buy Me a Coffee"
        >
          <BuyMeACoffeeIcon className="w-3 h-3 fill-slate-400 group-hover:fill-yellow-600 transition-colors" />
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
