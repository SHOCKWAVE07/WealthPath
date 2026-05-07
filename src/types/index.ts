// ── Salary Structure ──────────────────────────────────────────────
export type SalaryStructure = {
  basicSalary: number;
  hra: number;
  specialAllowances: number;
  pfEmployeePercent: number;   // % of basic (e.g. 12)
  pfEmployerPercent: number;   // % of basic (e.g. 3.67)
  npsPercent: number;          // % of basic (e.g. 10)
};

// ── Investment Vehicles ──────────────────────────────────────────
export type InvestmentVehicle = {
  id: string;
  name: string;
  category: string;
  currentBalance: number;
  expectedAnnualReturn: number;
  monthlyContribution: number;
  isAutoLinked?: boolean;
  linkType?: 'pf' | 'nps';
  stepUpWithSalary?: boolean;  // if true, contribution scales with hike
};

// ── Projection ───────────────────────────────────────────────────
export type ProjectionConfig = {
  salaryStructure: SalaryStructure;
  annualSalaryHike: number;
  monthlyExpense: number;
  inflationRate: number;
  years: number;
};

export type ProjectionPoint = {
  year: number;
  monthlySalary: number;
  annualIncome: number;
  totalNetWorth: number;
  inflationAdjustedWorth: number;
  projectedSavingsRate: number;
  investments: {
    [vehicleId: string]: number;
  };
};

// ── Monthly Ledger ───────────────────────────────────────────────
export type EarningsBreakdown = {
  grossSalary: number;
  bonus: number;
  otherIncome: number;
};

export type Deductions = {
  pfEmployee: number;
  pfEmployer: number;
  nps: number;
  tax: number;
};

export type MonthlyEntry = {
  id: string;
  date: string; // YYYY-MM
  earnings: EarningsBreakdown;
  deductions: Deductions;
  actualExpense: number;
  investments: {
    vehicleId: string;
    amount: number;
  }[];
  liabilities?: {
    category: string;
    amount: number;
  }[];
};

// ── Goals ─────────────────────────────────────────────────────────
export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  currentProgress: number;
  linkedVehicleIds?: string[];
  inflationAdjusted: boolean;
};
