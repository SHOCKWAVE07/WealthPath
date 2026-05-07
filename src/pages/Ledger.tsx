import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLedgerStore } from '@/store/ledgerStore';
import { useGoalStore } from '@/store/goalStore';
import { useInvestmentStore } from '@/store/investmentStore';
import { useProjectionStore } from '@/store/projectionStore';
import { MonthlyEntry } from '@/types';
import { calculateRequiredMonthlyContribution } from '@/calculations/engine';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import {
  formatCurrency, getEarnings, getDeductions, getTotalGrossEarnings,
  getTotalDeductions, getNetTakeHome, getSavings, getTotalInvested,
  getWeightedReturn, getGrossMonthlySalary, getMonthlyPFEmployee,
  getMonthlyPFEmployer, getMonthlyNPS
} from '@/lib/finance';
import { BookOpen, Trash2, Pencil, ArrowDown, ArrowRight } from 'lucide-react';

export function Ledger() {
  const { entries, addEntry, removeEntry, updateEntry } = useLedgerStore();
  const { goals } = useGoalStore();
  const { vehicles } = useInvestmentStore();
  const config = useProjectionStore((s) => s.config);
  const { toast } = useToast();

  const ss = config.salaryStructure;

  // Form state — earnings
  const [date, setDate] = useState('');
  const [grossSalary, setGrossSalary] = useState('');
  const [bonus, setBonus] = useState('');
  const [otherIncome, setOtherIncome] = useState('');

  // Form state — deductions (auto-filled from salary structure)
  const [pfEmployee, setPfEmployee] = useState('');
  const [pfEmployer, setPfEmployer] = useState('');
  const [nps, setNps] = useState('');
  const [tax, setTax] = useState('');

  // Form state — expenses
  const [actualExpense, setActualExpense] = useState('');

  // Form state — SIP investments
  const [sipAmounts, setSipAmounts] = useState<Record<string, string>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const manualVehicles = vehicles.filter((v) => !v.isAutoLinked);

  const weightedReturn = getWeightedReturn(vehicles);
  const totalRequiredSavings = goals.reduce(
    (acc, goal) => acc + calculateRequiredMonthlyContribution(goal, weightedReturn || 0.10), 0
  );

  // Auto-fill from salary structure
  const handleAutoFill = () => {
    setGrossSalary(getGrossMonthlySalary(ss).toString());
    setPfEmployee(getMonthlyPFEmployee(ss).toString());
    setPfEmployer(getMonthlyPFEmployer(ss).toString());
    setNps(getMonthlyNPS(ss).toString());
    // Pre-fill SIP amounts from vehicle monthly contributions
    const sips: Record<string, string> = {};
    manualVehicles.forEach((v) => {
      sips[v.id] = v.monthlyContribution.toString();
    });
    setSipAmounts(sips);
    toast('Auto-filled from your salary structure.', 'info');
  };

  const resetForm = () => {
    setGrossSalary('');
    setBonus('');
    setOtherIncome('');
    setPfEmployee('');
    setPfEmployer('');
    setNps('');
    setTax('');
    setActualExpense('');
    setSipAmounts({});
    setEditingId(null);
  };

  // Computed preview
  const previewGross = (Number(grossSalary) || 0) + (Number(bonus) || 0) + (Number(otherIncome) || 0);
  const previewDeductions = (Number(pfEmployee) || 0) + (Number(nps) || 0) + (Number(tax) || 0);
  const previewNetTakeHome = previewGross - previewDeductions;
  const previewSavings = previewNetTakeHome - (Number(actualExpense) || 0);
  const previewSIPTotal = Object.values(sipAmounts).reduce((s, v) => s + (Number(v) || 0), 0);
  const previewTotalInvested = (Number(pfEmployee) || 0) + (Number(pfEmployer) || 0) + (Number(nps) || 0) + previewSIPTotal;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !grossSalary || !actualExpense) return;

    const investmentEntries = Object.entries(sipAmounts)
      .filter(([, amt]) => Number(amt) > 0)
      .map(([vehicleId, amt]) => ({ vehicleId, amount: Number(amt) }));

    const entryData = {
      date,
      earnings: {
        grossSalary: Number(grossSalary) || 0,
        bonus: Number(bonus) || 0,
        otherIncome: Number(otherIncome) || 0,
      },
      deductions: {
        pfEmployee: Number(pfEmployee) || 0,
        pfEmployer: Number(pfEmployer) || 0,
        nps: Number(nps) || 0,
        tax: Number(tax) || 0,
      },
      actualExpense: Number(actualExpense) || 0,
      investments: investmentEntries,
    };

    if (editingId) {
      updateEntry(editingId, entryData);
      toast('Ledger entry updated.');
    } else {
      if (entries.some((ent) => ent.date === date)) {
        toast('An entry for this month already exists. Edit it instead.', 'error');
        return;
      }
      addEntry({ id: crypto.randomUUID(), ...entryData });
      toast('Ledger entry saved.');
    }
    resetForm();
  };

  const handleEdit = (entry: MonthlyEntry) => {
    setEditingId(entry.id);
    setDate(entry.date);
    const e = getEarnings(entry);
    const d = getDeductions(entry);
    setGrossSalary(e.grossSalary.toString());
    setBonus(e.bonus.toString());
    setOtherIncome(e.otherIncome.toString());
    setPfEmployee(d.pfEmployee.toString());
    setPfEmployer(d.pfEmployer.toString());
    setNps(d.nps.toString());
    setTax(d.tax.toString());
    setActualExpense(entry.actualExpense.toString());
    const sips: Record<string, string> = {};
    (entry.investments || []).forEach((inv) => {
      sips[inv.vehicleId] = inv.amount.toString();
    });
    setSipAmounts(sips);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      removeEntry(deleteTarget);
      toast('Entry deleted.', 'info');
      setDeleteTarget(null);
    }
  };

  const latestEntry = entries.length > 0 ? [...entries].sort((a, b) => b.date.localeCompare(a.date))[0] : null;
  const latestSavings = latestEntry ? getSavings(latestEntry) : 0;
  const recoveryAmount = totalRequiredSavings - latestSavings;

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Monthly Ledger</h2>
        <p className="text-muted-foreground">Track the real flow: Gross → Deductions → Net → Expenses → Savings.</p>
      </div>

      {goals.length > 0 && latestEntry && (
        <Card className={recoveryAmount > 0 ? "border-red-500/50 bg-red-500/5" : "border-green-500/50 bg-green-500/5"}>
          <CardHeader>
            <CardTitle>On-Track Intelligence</CardTitle>
            <CardDescription>Based on your latest entry ({latestEntry.date})</CardDescription>
          </CardHeader>
          <CardContent>
            {recoveryAmount > 0 ? (
              <div>
                <p className="text-red-500 font-bold flex items-center gap-2">
                  <Badge variant="destructive">Critical Deviation</Badge> You are falling behind your goals.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Net savings of {formatCurrency(latestSavings)} missed the required {formatCurrency(totalRequiredSavings)}.
                  <br /><strong className="text-foreground">Recovery needed next month: {formatCurrency(recoveryAmount)}</strong>
                </p>
              </div>
            ) : (
              <div>
                <p className="text-green-500 font-bold flex items-center gap-2">
                  <Badge className="bg-green-500 hover:bg-green-600 text-white">On Track</Badge> Behavior aligns with projections.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Net savings of {formatCurrency(latestSavings)} met the required {formatCurrency(totalRequiredSavings)}.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{editingId ? "Edit Entry" : "Log Monthly Entry"}</CardTitle>
              <CardDescription>Record your actual earnings, deductions, expenses, and investments.</CardDescription>
            </div>
            {!editingId && (
              <Button type="button" variant="outline" size="sm" onClick={handleAutoFill}>
                Auto-fill from Salary Structure
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="date">Month</Label>
              <Input type="month" id="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Column 1: Earnings */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-green-500/20 text-green-500 text-xs flex items-center justify-center font-bold">1</span>
                  Earnings
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="grossSalary">Gross Salary (₹)</Label>
                  <Input type="number" id="grossSalary" min="0" placeholder="e.g. 100000" value={grossSalary} onChange={(e) => setGrossSalary(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bonus">Bonus / Variable Pay (₹)</Label>
                  <Input type="number" id="bonus" min="0" placeholder="0" value={bonus} onChange={(e) => setBonus(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="otherIncome">Other Income (₹)</Label>
                  <Input type="number" id="otherIncome" min="0" placeholder="0" value={otherIncome} onChange={(e) => setOtherIncome(e.target.value)} />
                </div>
              </div>

              {/* Column 2: Deductions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-red-500/20 text-red-500 text-xs flex items-center justify-center font-bold">2</span>
                  Deductions
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="pfEmployee">PF Employee (₹)</Label>
                  <Input type="number" id="pfEmployee" min="0" placeholder="0" value={pfEmployee} onChange={(e) => setPfEmployee(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pfEmployer">PF Employer (₹)</Label>
                  <Input type="number" id="pfEmployer" min="0" placeholder="0" value={pfEmployer} onChange={(e) => setPfEmployer(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Not deducted from salary, but adds to your PF corpus.</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nps">NPS (₹)</Label>
                  <Input type="number" id="nps" min="0" placeholder="0" value={nps} onChange={(e) => setNps(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="tax">TDS / Tax (₹)</Label>
                  <Input type="number" id="tax" min="0" placeholder="0" value={tax} onChange={(e) => setTax(e.target.value)} />
                </div>
              </div>

              {/* Column 3: Spending & SIPs */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-blue-500/20 text-blue-500 text-xs flex items-center justify-center font-bold">3</span>
                  Spending & SIPs
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="actualExpense">Total Expenses (₹)</Label>
                  <Input type="number" id="actualExpense" min="0" placeholder="e.g. 45000" value={actualExpense} onChange={(e) => setActualExpense(e.target.value)} required />
                </div>
                {manualVehicles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-sm font-medium text-muted-foreground">SIP Investments This Month:</p>
                    {manualVehicles.map((v) => (
                      <div key={v.id} className="grid gap-1">
                        <Label className="text-xs">{v.name}</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder={v.monthlyContribution.toString()}
                          value={sipAmounts[v.id] || ''}
                          onChange={(e) => setSipAmounts((prev) => ({ ...prev, [v.id]: e.target.value }))}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live preview strip */}
            <div className="p-4 rounded-lg bg-muted/50 border flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Gross</p>
                <p className="font-bold">{formatCurrency(previewGross)}</p>
              </div>
              <ArrowRight className="h-4 w-4 mt-5 text-muted-foreground hidden md:block" />
              <div>
                <p className="text-muted-foreground">Deductions</p>
                <p className="font-bold text-red-500">-{formatCurrency(previewDeductions)}</p>
              </div>
              <ArrowRight className="h-4 w-4 mt-5 text-muted-foreground hidden md:block" />
              <div>
                <p className="text-muted-foreground">Net Take-Home</p>
                <p className="font-bold">{formatCurrency(previewNetTakeHome)}</p>
              </div>
              <ArrowRight className="h-4 w-4 mt-5 text-muted-foreground hidden md:block" />
              <div>
                <p className="text-muted-foreground">Expenses</p>
                <p className="font-bold">-{formatCurrency(Number(actualExpense) || 0)}</p>
              </div>
              <ArrowRight className="h-4 w-4 mt-5 text-muted-foreground hidden md:block" />
              <div>
                <p className="text-muted-foreground">Net Savings</p>
                <p className={`font-bold ${previewSavings >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(previewSavings)}</p>
              </div>
              <div className="ml-auto">
                <p className="text-muted-foreground">Total Invested</p>
                <p className="font-bold text-primary">{formatCurrency(previewTotalInvested)}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="lg">{editingId ? "Update Entry" : "Save Entry"}</Button>
              {editingId && <Button type="button" variant="outline" size="lg" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* History table */}
      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
              <p className="text-muted-foreground">No entries yet. Log your first month above.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Take-Home</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Savings</TableHead>
                    <TableHead>Total Invested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
                    const gross = getTotalGrossEarnings(entry);
                    const deductions = getTotalDeductions(entry);
                    const netTakeHome = getNetTakeHome(entry);
                    const savings = getSavings(entry);
                    const invested = getTotalInvested(entry);
                    const isOnTrack = savings >= totalRequiredSavings;
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">{entry.date}</TableCell>
                        <TableCell>{formatCurrency(gross)}</TableCell>
                        <TableCell className="text-red-500">{formatCurrency(deductions)}</TableCell>
                        <TableCell>{formatCurrency(netTakeHome)}</TableCell>
                        <TableCell>{formatCurrency(entry.actualExpense)}</TableCell>
                        <TableCell className={`font-bold ${savings >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCurrency(savings)}</TableCell>
                        <TableCell className="text-primary">{formatCurrency(invested)}</TableCell>
                        <TableCell>
                          {goals.length === 0 ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : isOnTrack ? (
                            <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">On Track</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">Behind</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEdit(entry)}>
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(entry.id)}>
                              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Ledger Entry"
        description="This monthly entry will be permanently removed. This cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
