import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MonthlyEntry } from '../types';

interface LedgerState {
  entries: MonthlyEntry[];
  addEntry: (entry: MonthlyEntry) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<MonthlyEntry>) => void;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set) => ({
      entries: [],
      addEntry: (entry) => set((state) => ({ entries: [...state.entries, entry] })),
      removeEntry: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map((e) => e.id === id ? { ...e, ...updates } : e)
      })),
    }),
    {
      name: 'wealthpath-ledger-storage',
    }
  )
);
