import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { InvestmentVehicle } from '../types';

interface InvestmentState {
  vehicles: InvestmentVehicle[];
  addVehicle: (vehicle: InvestmentVehicle) => void;
  removeVehicle: (id: string) => void;
  updateVehicle: (id: string, updates: Partial<InvestmentVehicle>) => void;
  getAutoLinkedVehicle: (linkType: 'pf' | 'nps') => InvestmentVehicle | undefined;
  ensureAutoLinkedVehicle: (linkType: 'pf' | 'nps', contribution: number) => void;
}

export const useInvestmentStore = create<InvestmentState>()(
  persist(
    (set, get) => ({
      vehicles: [],
      addVehicle: (vehicle) => set((state) => ({ vehicles: [...state.vehicles, vehicle] })),
      removeVehicle: (id) => set((state) => ({ vehicles: state.vehicles.filter((v) => v.id !== id) })),
      updateVehicle: (id, updates) => set((state) => ({
        vehicles: state.vehicles.map((v) => v.id === id ? { ...v, ...updates } : v)
      })),
      getAutoLinkedVehicle: (linkType) => {
        return get().vehicles.find((v) => v.isAutoLinked && v.linkType === linkType);
      },
      ensureAutoLinkedVehicle: (linkType, contribution) => {
        const existing = get().vehicles.find((v) => v.isAutoLinked && v.linkType === linkType);
        if (existing) {
          // Update contribution to match current salary structure
          set((state) => ({
            vehicles: state.vehicles.map((v) =>
              v.id === existing.id
                ? { ...v, monthlyContribution: contribution }
                : v
            ),
          }));
        } else {
          const defaults: Record<string, Partial<InvestmentVehicle>> = {
            pf: { name: 'Provident Fund (PF)', category: 'Retirement', expectedAnnualReturn: 0.0825 },
            nps: { name: 'National Pension System (NPS)', category: 'Retirement', expectedAnnualReturn: 0.10 },
          };
          const d = defaults[linkType];
          set((state) => ({
            vehicles: [
              ...state.vehicles,
              {
                id: crypto.randomUUID(),
                name: d.name!,
                category: d.category!,
                currentBalance: 0,
                expectedAnnualReturn: d.expectedAnnualReturn!,
                monthlyContribution: contribution,
                isAutoLinked: true,
                linkType,
                stepUpWithSalary: true,
              },
            ],
          }));
        }
      },
    }),
    {
      name: 'wealthpath-investment-storage',
    }
  )
);
