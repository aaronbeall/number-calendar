import BuyMeACoffeeIcon from '@/assets/buymeacoffee.svg?react';
import PatreonIcon from '@/assets/patreon.svg?react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
  useParams
} from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { ErrorState } from './components/PageStates';
import { Skeleton } from './components/ui/skeleton';
import { Spinner } from './components/ui/spinner';
import { DatasetProvider } from './context/DatasetContext';
import DatasetDialog from './features/dataset/DatasetDialog';
import DuplicateDialog from './features/dataset/DuplicateDialog';
import ExportDialog from './features/dataset/ExportDialog';
import ImportDialog from './features/dataset/ImportDialog';
import type { Dataset } from './features/db/localdb';
import { useDataset, useDatasets } from './features/db/useDatasetData';
import { useAchievements } from './hooks/useAchievements';
import { useSearchParamState } from './hooks/useSearchParamState';
import { getCompletedAchievementsByDateKey } from './lib/goals';
import Achievements from './pages/Achievements';
import { Calendar } from './pages/Calendar';
import { Landing } from './pages/Landing';
import Milestones from './pages/Milestones';
import Records from './pages/Records';
import Targets from './pages/Targets';
import { Timeline } from './pages/Timeline';


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
          <DatasetLayout
            datasets={datasets}
            onOpenCreate={handleOpenCreate}
            onOpenEdit={handleOpenEdit}
            onOpenImport={handleOpenImport}
            onOpenExport={handleOpenExport}
          />
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
    <DatasetProvider dataset={dataset}>
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
            <Route path="timeline" element={<Timeline />} />
            <Route path="settings" element={<div className="max-w-4xl mx-auto p-8"><h2 className="text-2xl font-bold mb-4">Settings</h2></div>} />
          </Routes>
        </div>
        <AppFooter />
      </div>
    </DatasetProvider>
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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 flex-wrap">
        <span>
          Made with <span aria-label="love" role="img">❤️</span> and <span aria-label="banana" role="img">🍌</span> by <a href="https://metamodernmonkey.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500 transition-colors">Meta Modern Monkey</a> &copy; {new Date().getFullYear()}
        </span>

        <div className="flex items-center justify-center gap-2 flex-wrap sm:border-l sm:border-slate-300 sm:dark:border-slate-700 sm:pl-2 sm:ml-2">
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
      </div>
    </footer>
  );
}

export default App;
