import { useMemo, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectionStore } from '@/store/projectionStore';
import { useGoalStore } from '@/store/goalStore';
import { useInvestmentStore } from '@/store/investmentStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { generateProjections, calculateRequiredMonthlyContribution } from '@/calculations/engine';
import { formatCurrency, getSavingsRate, getWeightedReturn, getGrossMonthlySalary, getTotalInvested } from '@/lib/finance';
import { format, parseISO } from 'date-fns';
import { TrendingUp, Wallet, PiggyBank, BarChart3, ArrowRight, BookOpen, PieChart as PieChartIcon, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

export function Dashboard() {
  const config = useProjectionStore((state) => state.config);
  const { goals } = useGoalStore();
  const { vehicles } = useInvestmentStore();
  const { entries } = useLedgerStore();

  const [projectionYears, setProjectionYears] = useState(config.years || 10);

  const projections = useMemo(() =>
    generateProjections({ ...config, years: projectionYears }, vehicles),
  [config, vehicles, projectionYears]);

  const totalPortfolioValue = vehicles.reduce((sum, v) => sum + v.currentBalance, 0);
  const weightedReturn = getWeightedReturn(vehicles);
  const totalRequiredSavings = goals.reduce((acc, goal) => acc + calculateRequiredMonthlyContribution(goal, weightedReturn || 0.10), 0);
  const yearXWorth = projections.length > 0 ? projections[projections.length - 1].totalNetWorth : 0;

  const grossSalary = getGrossMonthlySalary(config.salaryStructure);

  // Latest entry savings rate
  const latestEntry = useMemo(() =>
    entries.length > 0 ? [...entries].sort((a, b) => b.date.localeCompare(a.date))[0] : null
  , [entries]);

  const actualSavingsRatio = useMemo(() => {
    if (!latestEntry) return 0;
    return getSavingsRate(latestEntry);
  }, [latestEntry]);

  // Historical data
  const historicalSavingsData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => ({
        date: format(parseISO(entry.date + "-01"), 'MMM yy'),
        rate: Math.round(getSavingsRate(entry)),
      }));
  }, [entries]);

  // Actual net worth history from ledger (accumulated invested amounts per month)
  const actualNetWorthData = useMemo(() => {
    return [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(entry => ({
        date: format(parseISO(entry.date + "-01"), 'MMM yy'),
        invested: getTotalInvested(entry),
      }));
  }, [entries]);

  const hasData = vehicles.length > 0 || entries.length > 0 || goals.length > 0;

  // Auto-linked vs manual split for display
  const autoLinkedVehicles = vehicles.filter(v => v.isAutoLinked);
  const manualVehicles = vehicles.filter(v => !v.isAutoLinked);

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Your wealth trajectory at a glance.</p>
        </div>
        <div className="flex items-center gap-4 bg-card p-3 rounded-lg border">
          <div className="grid gap-1">
            <Label htmlFor="projectionYears" className="text-xs uppercase text-muted-foreground">Projection Horizon</Label>
            <div className="flex items-center gap-2">
              <Input
                id="projectionYears"
                type="number"
                className="w-20 h-8"
                min={1}
                max={50}
                value={projectionYears}
                onChange={(e) => setProjectionYears(Math.max(1, Math.min(50, Number(e.target.value))))}
              />
              <span className="text-sm font-medium">Years</span>
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding */}
      {!hasData && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-10 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-semibold">Welcome to WealthPath!</p>
              <p className="text-muted-foreground max-w-md mx-auto">
                Start by setting up your salary structure in Settings. PF & NPS will be auto-created as investment vehicles.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Button asChild variant="default">
                <Link to="/settings"><span className="flex items-center gap-2">Set Salary Structure <ArrowRight className="h-4 w-4" /></span></Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/investments"><span className="flex items-center gap-2">Add Investments <ArrowRight className="h-4 w-4" /></span></Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/ledger"><span className="flex items-center gap-2">Log First Month <ArrowRight className="h-4 w-4" /></span></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPortfolioValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {autoLinkedVehicles.length > 0 && `Incl. PF/NPS`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected {projectionYears}-Year NW</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(yearXWorth)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{actualSavingsRatio.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">From latest ledger entry</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Target Savings</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalRequiredSavings)}</div>
            <p className="text-xs text-muted-foreground mt-1">{goals.length} goals @ {weightedReturn > 0 ? (weightedReturn * 100).toFixed(0) : 10}% return</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio & salary snapshot */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Allocation</CardTitle>
            <CardDescription>Current asset distribution (including PF & NPS)</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center">
            {vehicles.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={vehicles} dataKey="currentBalance" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={2}>
                    {vehicles.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-muted-foreground text-sm text-center w-full flex flex-col items-center gap-2">
                <PieChartIcon className="h-8 w-8 opacity-30" />
                <span>No investments added yet.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salary Snapshot</CardTitle>
            <CardDescription>Current monthly structure from Settings</CardDescription>
          </CardHeader>
          <CardContent>
            {grossSalary > 0 ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Basic</span>
                  <span className="font-medium">{formatCurrency(config.salaryStructure.basicSalary)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">HRA</span>
                  <span className="font-medium">{formatCurrency(config.salaryStructure.hra)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Allowances</span>
                  <span className="font-medium">{formatCurrency(config.salaryStructure.specialAllowances)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-sm font-semibold">Gross Monthly</span>
                  <span className="font-bold text-lg">{formatCurrency(grossSalary)}</span>
                </div>
                <div className="flex justify-between text-red-500">
                  <span className="text-sm">PF + NPS Deductions</span>
                  <span className="font-medium">
                    -{formatCurrency(
                      Math.round(config.salaryStructure.basicSalary * config.salaryStructure.pfEmployeePercent / 100) +
                      Math.round(config.salaryStructure.basicSalary * config.salaryStructure.npsPercent / 100)
                    )}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-sm">
                <p>Set your salary structure in Settings.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Net Worth Growth (Nominal vs Real)</CardTitle>
            <CardDescription>Projection over {projectionYears} years</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {projections.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projections} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="year" tickFormatter={(val) => `Yr ${val}`} />
                  <YAxis tickFormatter={(val) => `₹${(val / 100000).toFixed(0)}L`} />
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <Tooltip formatter={(value: any) => formatCurrency(Number(value))} labelFormatter={(label) => `Year ${label}`} />
                  <Area type="monotone" dataKey="totalNetWorth" name="Nominal Net Worth" stroke="#6366f1" fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="inflationAdjustedWorth" name="Real Net Worth" stroke="#22c55e" fillOpacity={1} fill="url(#colorReal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <TrendingUp className="h-8 w-8 opacity-30" />
                <span>Add investments to see growth projections.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historical Savings Rate</CardTitle>
            <CardDescription>Month-on-month savings efficiency (%)</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {historicalSavingsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalSavingsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(val) => `${val}%`} />
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <Tooltip formatter={(val: any) => `${val}%`} />
                  <Line type="monotone" dataKey="rate" name="Savings Rate" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BookOpen className="h-8 w-8 opacity-30" />
                <span>Log monthly entries to see trends.</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
