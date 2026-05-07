import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Goal } from '../types';

interface GoalState {
  goals: Goal[];
  addGoal: (goal: Goal) => void;
  removeGoal: (id: string) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
  updateGoalProgress: (id: string, newProgress: number) => void;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set) => ({
      goals: [],
      addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
      removeGoal: (id) => set((state) => ({ goals: state.goals.filter((g) => g.id !== id) })),
      updateGoal: (id, updates) => set((state) => ({
        goals: state.goals.map((g) => g.id === id ? { ...g, ...updates } : g)
      })),
      updateGoalProgress: (id, newProgress) => set((state) => ({
        goals: state.goals.map((g) => g.id === id ? { ...g, currentProgress: newProgress } : g)
      })),
    }),
    {
      name: 'wealthpath-goal-storage',
    }
  )
);
