import React, { createContext, useContext } from 'react';
import type { Dataset } from '@/features/db/localdb';

interface DatasetContextValue {
  dataset: Dataset;
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

export function DatasetProvider({ dataset, children }: { dataset: Dataset; children: React.ReactNode }) {
  return <DatasetContext.Provider value={{ dataset }}>{children}</DatasetContext.Provider>;
}

export function useDatasetContext() {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDatasetContext must be used within DatasetProvider');
  }
  return context;
}
