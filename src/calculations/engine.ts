import { ProjectionConfig, ProjectionPoint, Goal, InvestmentVehicle } from "../types";
import { differenceInMonths } from "date-fns";
import { getGrossMonthlySalary } from "../lib/finance";

export function generateProjections(config: ProjectionConfig, vehicles: InvestmentVehicle[]): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  const ss = config.salaryStructure;

  let currentBasic = ss.basicSalary;
  let currentHRA = ss.hra;
  let currentAllowances = ss.specialAllowances;
  let currentExpense = config.monthlyExpense;

  const projectedVehicles = vehicles.map((v) => ({ ...v }));

  for (let year = 1; year <= config.years; year++) {
    const currentSalary = currentBasic + currentHRA + currentAllowances;
    const annualIncome = currentSalary * 12;
    const annualExpense = currentExpense * 12;

    // Update auto-linked contributions based on current basic salary
    projectedVehicles.forEach((v) => {
      if (v.isAutoLinked && v.linkType === 'pf') {
        // PF employee + employer combined contribution
        v.monthlyContribution = Math.round(
          currentBasic * (ss.pfEmployeePercent / 100) +
          currentBasic * (ss.pfEmployerPercent / 100)
        );
      } else if (v.isAutoLinked && v.linkType === 'nps') {
        v.monthlyContribution = Math.round(currentBasic * (ss.npsPercent / 100));
      }
    });

    // Compound monthly: balance grows + contribution added
    for (let month = 1; month <= 12; month++) {
      projectedVehicles.forEach((v) => {
        v.currentBalance = v.currentBalance * (1 + v.expectedAnnualReturn / 12) + v.monthlyContribution;
      });
    }

    const totalNetWorth = projectedVehicles.reduce((sum, v) => sum + v.currentBalance, 0);
    const inflationAdjustedWorth = totalNetWorth / Math.pow(1 + config.inflationRate, year);

    // Savings rate accounts for deductions going to investments
    const totalDeductions = Math.round(
      currentBasic * (ss.pfEmployeePercent / 100) +
      currentBasic * (ss.npsPercent / 100)
    );
    const netTakeHome = currentSalary - totalDeductions;
    const annualSavings = (netTakeHome - currentExpense) * 12;
    const projectedSavingsRate = annualIncome > 0 ? (annualSavings / annualIncome) : 0;

    const investmentsMap: { [id: string]: number } = {};
    projectedVehicles.forEach((v) => investmentsMap[v.id] = v.currentBalance);

    points.push({
      year,
      monthlySalary: currentSalary,
      annualIncome,
      totalNetWorth,
      inflationAdjustedWorth,
      projectedSavingsRate,
      investments: investmentsMap
    });

    // Apply annual hike to salary components
    currentBasic *= (1 + config.annualSalaryHike);
    currentHRA *= (1 + config.annualSalaryHike);
    currentAllowances *= (1 + config.annualSalaryHike);
    currentExpense *= (1 + config.inflationRate);

    // Scale manual vehicle contributions only if stepUpWithSalary is true
    projectedVehicles.forEach((v) => {
      if (!v.isAutoLinked && v.stepUpWithSalary) {
        v.monthlyContribution *= (1 + config.annualSalaryHike);
      }
      // Auto-linked vehicles are recalculated at the top of each year loop
    });
  }

  return points;
}

export function calculateRequiredMonthlyContribution(goal: Goal, expectedReturnRate: number): number {
  const monthsRemaining = differenceInMonths(new Date(goal.targetDate), new Date());
  if (monthsRemaining <= 0) return 0;

  const remainingAmount = goal.targetAmount - goal.currentProgress;
  if (remainingAmount <= 0) return 0;

  const monthlyRate = expectedReturnRate / 12;

  if (monthlyRate === 0) return remainingAmount / monthsRemaining;

  const pmt = (remainingAmount * monthlyRate) / (Math.pow(1 + monthlyRate, monthsRemaining) - 1);
  return pmt;
}
