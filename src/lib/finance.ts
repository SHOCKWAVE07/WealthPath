import { MonthlyEntry, InvestmentVehicle, EarningsBreakdown, Deductions, SalaryStructure } from '../types';

/**
 * Format a number as Indian Rupee currency.
 */
export function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

// ── Migration helpers for old data shape ──────────────────────────

/**
 * Normalize earnings from a MonthlyEntry, handling legacy data shapes.
 * Old entries had: { fixedSalary, bonus, pfContribution, npsContribution, otherIncome }
 * New entries have: { grossSalary, bonus, otherIncome }
 */
export function getEarnings(entry: MonthlyEntry): EarningsBreakdown {
  if (entry.earnings && 'grossSalary' in entry.earnings) {
    return entry.earnings;
  }
  // Legacy migration
  const legacy = entry.earnings as Record<string, unknown>;
  const oldEntry = entry as Record<string, unknown>;
  const fixedSalary = Number(legacy?.fixedSalary) || Number(oldEntry?.actualSalary) || 0;
  const pfContribution = Number(legacy?.pfContribution) || 0;
  const npsContribution = Number(legacy?.npsContribution) || 0;
  return {
    grossSalary: fixedSalary + pfContribution + npsContribution,
    bonus: Number(legacy?.bonus) || Number(oldEntry?.actualBonus) || 0,
    otherIncome: Number(legacy?.otherIncome) || 0,
  };
}

/**
 * Get deductions from a MonthlyEntry, handling legacy entries that didn't have them.
 */
export function getDeductions(entry: MonthlyEntry): Deductions {
  if (entry.deductions) return entry.deductions;
  // Legacy migration — pull PF/NPS from old earnings
  const legacy = entry.earnings as Record<string, unknown>;
  return {
    pfEmployee: Number(legacy?.pfContribution) || 0,
    pfEmployer: 0,
    nps: Number(legacy?.npsContribution) || 0,
    tax: 0,
  };
}

// ── Computed values ──────────────────────────────────────────────

/**
 * Total gross earnings (salary + bonus + other income).
 */
export function getTotalGrossEarnings(entry: MonthlyEntry): number {
  const e = getEarnings(entry);
  return e.grossSalary + e.bonus + e.otherIncome;
}

/**
 * Total deductions from salary (PF employee + NPS + tax).
 * Note: PF employer is NOT deducted from salary (it's added by employer).
 */
export function getTotalDeductions(entry: MonthlyEntry): number {
  const d = getDeductions(entry);
  return d.pfEmployee + d.nps + d.tax;
}

/**
 * Net take-home = Gross - Deductions.
 */
export function getNetTakeHome(entry: MonthlyEntry): number {
  return getTotalGrossEarnings(entry) - getTotalDeductions(entry);
}

/**
 * Savings = Net take-home - expenses.
 */
export function getSavings(entry: MonthlyEntry): number {
  return getNetTakeHome(entry) - entry.actualExpense;
}

/**
 * Total invested in that month (PF + NPS + employer PF + SIPs).
 */
export function getTotalInvested(entry: MonthlyEntry): number {
  const d = getDeductions(entry);
  const sipTotal = (entry.investments || []).reduce((sum, inv) => sum + inv.amount, 0);
  return d.pfEmployee + d.pfEmployer + d.nps + sipTotal;
}

/**
 * Savings rate as percentage.
 */
export function getSavingsRate(entry: MonthlyEntry): number {
  const gross = getTotalGrossEarnings(entry);
  if (gross <= 0) return 0;
  return (getSavings(entry) / gross) * 100;
}

// ── Portfolio helpers ────────────────────────────────────────────

/**
 * Compute the portfolio-weighted average expected annual return.
 */
export function getWeightedReturn(vehicles: InvestmentVehicle[]): number {
  const totalValue = vehicles.reduce((sum, v) => sum + v.currentBalance, 0);
  if (totalValue <= 0) return 0;
  return vehicles.reduce((sum, v) => sum + v.currentBalance * v.expectedAnnualReturn, 0) / totalValue;
}

/**
 * Get the gross monthly salary from a salary structure.
 */
export function getGrossMonthlySalary(s: SalaryStructure): number {
  return s.basicSalary + s.hra + s.specialAllowances;
}

/**
 * Compute monthly PF (employee contribution) from salary structure.
 */
export function getMonthlyPFEmployee(s: SalaryStructure): number {
  return Math.round(s.basicSalary * (s.pfEmployeePercent / 100));
}

/**
 * Compute monthly PF (employer contribution) from salary structure.
 */
export function getMonthlyPFEmployer(s: SalaryStructure): number {
  return Math.round(s.basicSalary * (s.pfEmployerPercent / 100));
}

/**
 * Compute monthly NPS contribution from salary structure.
 */
export function getMonthlyNPS(s: SalaryStructure): number {
  return Math.round(s.basicSalary * (s.npsPercent / 100));
}

/**
 * Safely divide a by b. Returns 0 when b is 0.
 */
export function safeDivide(a: number, b: number): number {
  if (b === 0) return 0;
  return a / b;
}
