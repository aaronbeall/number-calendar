import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useNavigate,
  useParams
} from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { AppFooter } from './components/AppFooter';
import { ErrorState } from './components/PageStates';
import { Skeleton } from './components/ui/skeleton';
import { Spinner } from './components/ui/spinner';
import { DatasetProvider } from './context/DatasetContext';
import type { Dataset } from './features/db/localdb';
import { useDataset, useDatasets } from './features/db/useDatasetData';
import { useAchievements } from './hooks/useAchievements';
import { useSearchParamState } from './hooks/useSearchParamState';
import { getCompletedAchievementsByDateKey } from './lib/goals';
import { PwaPrompts } from './features/pwa/PwaPrompts';
import { RouteHead } from './features/seo/RouteHead';

// Every app page is split into its own chunk so the first load stays light.
// The service worker precaches all chunks, so they are still available offline.
const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Achievements = lazy(() => import('./pages/Achievements'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Calendar = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const Milestones = lazy(() => import('./pages/Milestones'));
const Records = lazy(() => import('./pages/Records'));
const Targets = lazy(() => import('./pages/Targets'));
const Timeline = lazy(() => import('./pages/Timeline').then(m => ({ default: m.Timeline })));
const TestError = lazy(() => import('./pages/TestError'));
const DatasetDialog = lazy(() => import('./features/dataset/DatasetDialog'));
const DuplicateDialog = lazy(() => import('./features/dataset/DuplicateDialog'));
const ExportDialog = lazy(() => import('./features/dataset/ExportDialog'));
const ImportDialog = lazy(() => import('./features/dataset/ImportDialog'));

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center py-24">
      <Spinner />
    </div>
  );
}


function App() {
  const basename = import.meta.env.VITE_BASE || '/';
  return (
    <TooltipProvider delayDuration={300}>
      <ErrorBoundary>
        <Router basename={basename}>
          <RouteHead />
          <AppLayout />
        </Router>
      </ErrorBoundary>
      <Toaster/>
      <PwaPrompts />
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

  const appLoading = (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-slate-900/80">
      <Spinner className="mb-4" />
      <div className="text-center text-slate-400 text-lg animate-pulse">Loading...</div>
      <AppFooter />
    </div>
  );

  return (
    <>
      <ErrorBoundary>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* The homepage is a separate page (index.html + src/home.tsx), so leave the app for it. */}
            <Route index element={<HomepageRedirect />} />
            {/* The app itself. The installed PWA starts here. */}
            <Route path="app/*" element={datasetsLoading ? appLoading : (
              <Routes>
                <Route index element={
                  <div className="min-h-screen flex flex-col bg-white dark:bg-slate-900/80">
                    <Landing
                      datasets={datasets}
                      onSelectDataset={id => navigate(`/app/dataset/${id}`)}
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
                <Route path="test-error" element={<TestError />} />
                <Route path="dataset/:datasetId/*" element={
                  <DatasetLayout
                    datasets={datasets}
                    onOpenCreate={handleOpenCreate}
                    onOpenEdit={handleOpenEdit}
                    onOpenImport={handleOpenImport}
                    onOpenExport={handleOpenExport}
                  />
                } />
                <Route path="*" element={<Navigate to="/app" replace />} />
              </Routes>
            )} />
            <Route path="*" element={<HomepageRedirect />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      
      {/* Global Dialogs - outside ErrorBoundary so they remain accessible even if a route crashes */}
      <Suspense fallback={null}>
      { datasetDialog && (
        <DatasetDialog
          open={!!datasetDialog}
          onOpenChange={handleCloseDialog}
          onCreated={id => navigate(`/app/dataset/${id}`)}
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
          onDuplicated={id => navigate(`/app/dataset/${id}`)}
          dataset={datasets.find(d => d.id === duplicateDialog)!}
        />
      )}
      </Suspense>
    </>
  );
}

/**
 * The app bundle only serves /app. Static hosts also hand it unknown paths (GitHub Pages' 404.html
 * is the app shell), so anything that isn't an app route goes to the homepage with a full page load.
 */
function HomepageRedirect() {
  useEffect(() => {
    window.location.replace(import.meta.env.BASE_URL);
  }, []);
  return null;
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
        actions={[{ label: 'Back to your data', to: '/app' }]}
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
        <ErrorBoundary variant="inline">
          <div className="flex-1 w-full">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route index element={<Calendar dataset={dataset} achievementResultsByDateKey={achievementResultsByDateKey} />} />
                <Route path="achievements" element={<Achievements />} />
                <Route path="analysis" element={<Analysis />} />
                <Route path="targets" element={<Targets />} />
                <Route path="milestones" element={<Milestones />} />
                <Route path="records" element={<Records datasetId={dataset.id} />} />
                <Route path="timeline" element={<Timeline />} />
                <Route path="test-error" element={<TestError />} />
                <Route path="settings" element={<div className="max-w-4xl mx-auto p-8"><h2 className="text-2xl font-bold mb-4">Settings</h2></div>} />
              </Routes>
            </Suspense>
          </div>
        </ErrorBoundary>
        <AppFooter />
      </div>
    </DatasetProvider>
  );
}

export default App;
