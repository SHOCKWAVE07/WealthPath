import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectionConfig, SalaryStructure } from '../types';

interface ProjectionState {
  config: ProjectionConfig;
  updateConfig: (newConfig: Partial<ProjectionConfig>) => void;
  updateSalaryStructure: (s: Partial<SalaryStructure>) => void;
}

const DEFAULT_SALARY: SalaryStructure = {
  basicSalary: 0,
  hra: 0,
  specialAllowances: 0,
  pfEmployeePercent: 12,
  pfEmployerPercent: 3.67,
  npsPercent: 10,
};

const DEFAULT_CONFIG: ProjectionConfig = {
  salaryStructure: DEFAULT_SALARY,
  annualSalaryHike: 0,
  monthlyExpense: 0,
  inflationRate: 0,
  years: 10,
};

export const useProjectionStore = create<ProjectionState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      updateConfig: (newConfig) => set((state) => ({
        config: { ...state.config, ...newConfig }
      })),
      updateSalaryStructure: (s) => set((state) => ({
        config: {
          ...state.config,
          salaryStructure: { ...state.config.salaryStructure, ...s },
        },
      })),
    }),
    {
      name: 'wealthpath-projection-storage',
      // Migration: if old config had currentMonthlySalary, convert it
      migrate: (persisted: any) => {
        if (persisted && persisted.config && 'currentMonthlySalary' in persisted.config) {
          const old = persisted.config;
          return {
            config: {
              salaryStructure: {
                basicSalary: Math.round((old.currentMonthlySalary || 0) * 0.5),
                hra: Math.round((old.currentMonthlySalary || 0) * 0.25),
                specialAllowances: Math.round((old.currentMonthlySalary || 0) * 0.25),
                pfEmployeePercent: 12,
                pfEmployerPercent: 3.67,
                npsPercent: 10,
              },
              annualSalaryHike: old.annualSalaryHike || 0,
              monthlyExpense: old.monthlyExpense || 0,
              inflationRate: old.inflationRate || 0,
              years: old.years || 10,
            },
          };
        }
        return persisted;
      },
      version: 2,
    }
  )
);
