import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProjectionStore } from '@/store/projectionStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertCircle, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  formatCurrency, getTotalGrossEarnings, getTotalDeductions, getNetTakeHome,
  getSavings, safeDivide, getGrossMonthlySalary
} from '@/lib/finance';

export function Comparisons() {
  const config = useProjectionStore((state) => state.config);
  const { entries } = useLedgerStore();

  const plannedGross = getGrossMonthlySalary(config.salaryStructure);
  const plannedExpense = config.monthlyExpense;
  const ss = config.salaryStructure;
  const plannedDeductions = Math.round(ss.basicSalary * ss.pfEmployeePercent / 100) +
                            Math.round(ss.basicSalary * ss.npsPercent / 100);
  const plannedNetTakeHome = plannedGross - plannedDeductions;

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const chartData = useMemo(() => {
    return sortedEntries.map(entry => {
      const gross = getTotalGrossEarnings(entry);
      const netTakeHome = getNetTakeHome(entry);
      return {
        month: format(parseISO(entry.date + "-01"), 'MMM'),
        'Planned Income': plannedGross,
        'Actual Income': gross,
        'Planned Expense': plannedExpense,
        'Actual Expense': entry.actualExpense,
        'Planned Net': plannedNetTakeHome,
        'Actual Net': netTakeHome,
      };
    });
  }, [sortedEntries, plannedGross, plannedExpense, plannedNetTakeHome]);

  const summary = useMemo(() => {
    if (entries.length === 0) return null;

    const totalActualGross = entries.reduce((acc, curr) => acc + getTotalGrossEarnings(curr), 0);
    const totalPlannedGross = plannedGross * entries.length;

    const totalActualExpense = entries.reduce((acc, curr) => acc + curr.actualExpense, 0);
    const totalPlannedExpense = plannedExpense * entries.length;

    const totalActualSavings = entries.reduce((acc, curr) => acc + getSavings(curr), 0);
    const totalPlannedSavings = (plannedNetTakeHome - plannedExpense) * entries.length;

    return {
      incomeAchievement: safeDivide(totalActualGross, totalPlannedGross) * 100,
      budgetAdherence: safeDivide(totalActualExpense, totalPlannedExpense) * 100,
      totalNetSurplus: totalActualSavings - totalPlannedSavings,
      avgSavingsRate: safeDivide(
        entries.reduce((acc, curr) => acc + getSavings(curr), 0),
        entries.reduce((acc, curr) => acc + getTotalGrossEarnings(curr), 0)
      ) * 100,
    };
  }, [entries, plannedGross, plannedExpense, plannedNetTakeHome]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border p-3 rounded-lg shadow-xl text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((p: any, i: number) => (
            <div key={i} className="flex justify-between gap-4 py-1">
              <span style={{ color: p.color }}>{p.name}:</span>
              <span className="font-mono">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const planNotConfigured = plannedGross === 0 && plannedExpense === 0;

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Plan Analysis</h2>
          <p className="text-muted-foreground">Detailed comparison between your financial blueprint and reality.</p>
        </div>
        {!planNotConfigured && (
          <Badge variant="outline" className="px-4 py-1 text-sm font-medium border-primary/20 bg-primary/5">
            <Target className="w-4 h-4 mr-2 text-primary" />
            Plan: {formatCurrency(plannedGross)} Gross / {formatCurrency(plannedExpense)} Expense
          </Badge>
        )}
      </div>

      {!summary || planNotConfigured ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-20 text-center space-y-4">
            <div className="flex justify-center"><AlertCircle className="w-12 h-12 text-muted-foreground" /></div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">No Comparison Data Available</p>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {planNotConfigured
                  ? 'Set your salary structure and expense targets in Settings first.'
                  : 'Add monthly entries in the Ledger to unlock analysis.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-medium">Income Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.incomeAchievement.toFixed(1)}%</div>
                <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${Math.min(summary.incomeAchievement, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-medium">Budget Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.budgetAdherence.toFixed(1)}%</div>
                <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-500 ${summary.budgetAdherence > 100 ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${Math.min(summary.budgetAdherence, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-medium">Extra Wealth Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.totalNetSurplus >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {summary.totalNetSurplus >= 0 ? "+" : ""}{formatCurrency(summary.totalNetSurplus)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Above planned savings</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground font-medium">Real Savings Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.avgSavingsRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground mt-1">Average across all logs</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Income vs Plan</CardTitle>
                <CardDescription>Monthly actual gross earnings vs your planned target.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Planned Income" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="Actual Income" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                    <ReferenceLine y={plannedGross} stroke="#3b82f6" strokeDasharray="3 3" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Expenses vs Budget</CardTitle>
                <CardDescription>Monthly actual spending vs your maximum budget limit.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="Planned Expense" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="Actual Expense" radius={[4, 4, 0, 0]} barSize={40}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry['Actual Expense'] > entry['Planned Expense'] ? '#ef4444' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Performance Log</CardTitle>
                <CardDescription>Monthly audit of financial discipline.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Month</TableHead>
                      <TableHead>Gross Income</TableHead>
                      <TableHead>Budget Discipline</TableHead>
                      <TableHead>Net Savings Delta</TableHead>
                      <TableHead className="text-right">Verdict</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...sortedEntries].reverse().map((entry) => {
                      const gross = getTotalGrossEarnings(entry);
                      const savings = getSavings(entry);
                      const plannedSavings = plannedNetTakeHome - plannedExpense;
                      const savingsDelta = savings - plannedSavings;

                      const earningsMet = gross >= plannedGross;
                      const expenseMet = entry.actualExpense <= plannedExpense;
                      const incomePercent = safeDivide(gross, plannedGross) * 100;
                      const expensePercent = safeDivide(entry.actualExpense, plannedExpense) * 100;

                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="font-medium">{format(parseISO(entry.date + "-01"), 'MMMM yyyy')}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-mono">{formatCurrency(gross)}</div>
                              <div className={`text-xs flex items-center ${earningsMet ? "text-green-500" : "text-red-500"}`}>
                                {earningsMet ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                                {incomePercent.toFixed(0)}% of plan
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm font-mono">{formatCurrency(entry.actualExpense)}</div>
                              <div className={`text-xs flex items-center ${expenseMet ? "text-green-500" : "text-red-500"}`}>
                                {expenseMet ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                {expensePercent.toFixed(0)}% of budget
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className={`font-bold ${savingsDelta >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {savingsDelta >= 0 ? "+" : ""}{formatCurrency(savingsDelta)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {earningsMet && expenseMet ? (
                              <Badge className="bg-green-500 hover:bg-green-600">Perfect</Badge>
                            ) : (earningsMet || expenseMet) ? (
                              <Badge variant="secondary">Partial</Badge>
                            ) : (
                              <Badge variant="destructive">Review</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
