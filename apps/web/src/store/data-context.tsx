"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface DataContextType {
  dataset: any | null;
  correlations: any | null;
  file: File | null;
  setDatasetData: (data: any, correlations: any, file: File | null) => void;
  clearDataset: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<any | null>(null);
  const [correlations, setCorrelations] = useState<any | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const setDatasetData = (data: any, correlations: any, file: File | null) => {
    setDataset(data);
    setCorrelations(correlations);
    setFile(file);
  };

  const clearDataset = () => {
    setDataset(null);
    setCorrelations(null);
    setFile(null);
  };

  return (
    <DataContext.Provider value={{ dataset, correlations, file, setDatasetData, clearDataset }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
}
