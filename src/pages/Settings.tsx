import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useProjectionStore } from '@/store/projectionStore';
import { useInvestmentStore } from '@/store/investmentStore';
import { useGoalStore } from '@/store/goalStore';
import { useLedgerStore } from '@/store/ledgerStore';
import { useToast } from '@/components/ui/toast';
import { Download, Upload, AlertTriangle, IndianRupee, Shield } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency, getGrossMonthlySalary, getMonthlyPFEmployee, getMonthlyPFEmployer, getMonthlyNPS } from '@/lib/finance';

export function Settings() {
  const { config, updateConfig, updateSalaryStructure } = useProjectionStore();
  const { vehicles, ensureAutoLinkedVehicle } = useInvestmentStore();
  const { goals } = useGoalStore();
  const { entries } = useLedgerStore();
  const { toast } = useToast();

  const ss = config.salaryStructure;

  // Salary structure form
  const [basic, setBasic] = useState(ss.basicSalary.toString());
  const [hra, setHRA] = useState(ss.hra.toString());
  const [allowances, setAllowances] = useState(ss.specialAllowances.toString());
  const [pfEmpRate, setPfEmpRate] = useState(ss.pfEmployeePercent.toString());
  const [pfErRate, setPfErRate] = useState(ss.pfEmployerPercent.toString());
  const [npsRate, setNpsRate] = useState(ss.npsPercent.toString());

  // Plan targets form
  const [hike, setHike] = useState((config.annualSalaryHike * 100).toString());
  const [expense, setExpense] = useState(config.monthlyExpense.toString());
  const [inflation, setInflation] = useState((config.inflationRate * 100).toString());
  const [years, setYears] = useState(config.years.toString());
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Computed preview
  const previewBasic = Number(basic) || 0;
  const previewGross = previewBasic + (Number(hra) || 0) + (Number(allowances) || 0);
  const previewPFEmp = Math.round(previewBasic * (Number(pfEmpRate) || 0) / 100);
  const previewPFEr = Math.round(previewBasic * (Number(pfErRate) || 0) / 100);
  const previewNPS = Math.round(previewBasic * (Number(npsRate) || 0) / 100);
  const previewNetTakeHome = previewGross - previewPFEmp - previewNPS;

  const handleSaveSalary = (e: React.FormEvent) => {
    e.preventDefault();

    const basicNum = Number(basic);
    if (basicNum < 0 || Number(hra) < 0 || Number(allowances) < 0) {
      toast('Salary components cannot be negative.', 'error');
      return;
    }

    const newSS = {
      basicSalary: basicNum,
      hra: Number(hra) || 0,
      specialAllowances: Number(allowances) || 0,
      pfEmployeePercent: Number(pfEmpRate) || 0,
      pfEmployerPercent: Number(pfErRate) || 0,
      npsPercent: Number(npsRate) || 0,
    };

    updateSalaryStructure(newSS);

    // Auto-create/update PF & NPS investment vehicles
    const pfContrib = Math.round(newSS.basicSalary * (newSS.pfEmployeePercent / 100)) +
                      Math.round(newSS.basicSalary * (newSS.pfEmployerPercent / 100));
    const npsContrib = Math.round(newSS.basicSalary * (newSS.npsPercent / 100));

    if (pfContrib > 0) ensureAutoLinkedVehicle('pf', pfContrib);
    if (npsContrib > 0) ensureAutoLinkedVehicle('nps', npsContrib);

    toast('Salary structure saved. PF/NPS investment vehicles updated.');
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    const hikeNum = Number(hike);
    const expenseNum = Number(expense);
    const inflationNum = Number(inflation);
    const yearsNum = Number(years);

    if (expenseNum < 0) { toast('Expense cannot be negative.', 'error'); return; }
    if (hikeNum < 0 || hikeNum > 100) { toast('Hike must be 0-100%.', 'error'); return; }
    if (inflationNum < 0 || inflationNum > 50) { toast('Inflation must be 0-50%.', 'error'); return; }
    if (yearsNum < 1 || yearsNum > 50) { toast('Years must be 1-50.', 'error'); return; }

    updateConfig({
      annualSalaryHike: hikeNum / 100,
      monthlyExpense: expenseNum,
      inflationRate: inflationNum / 100,
      years: yearsNum,
    });
    toast('Financial plan targets saved.');
  };

  const handleExport = () => {
    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      config,
      vehicles,
      goals,
      entries,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthpath-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Data exported successfully.');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (!data.config) {
            toast('Invalid backup file format.', 'error');
            return;
          }
          if (data.config) updateConfig(data.config);
          if (data.vehicles) {
            const investmentStore = useInvestmentStore.getState();
            investmentStore.vehicles.forEach((v) => investmentStore.removeVehicle(v.id));
            data.vehicles.forEach((v: any) => investmentStore.addVehicle(v));
          }
          if (data.goals) {
            const goalStore = useGoalStore.getState();
            goalStore.goals.forEach((g) => goalStore.removeGoal(g.id));
            data.goals.forEach((g: any) => goalStore.addGoal(g));
          }
          if (data.entries) {
            const ledgerStore = useLedgerStore.getState();
            ledgerStore.entries.forEach((ent) => ledgerStore.removeEntry(ent.id));
            data.entries.forEach((ent: any) => ledgerStore.addEntry(ent));
          }
          toast('Data imported successfully. Please refresh.');
        } catch {
          toast('Failed to parse backup file.', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetAll = () => {
    localStorage.removeItem('wealthpath-investment-storage');
    localStorage.removeItem('wealthpath-goal-storage');
    localStorage.removeItem('wealthpath-ledger-storage');
    localStorage.removeItem('wealthpath-projection-storage');
    localStorage.removeItem('wealthpath-theme-storage');
    window.location.reload();
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings & Planning</h2>
        <p className="text-muted-foreground">Define your salary structure, deduction rates, and economic assumptions.</p>
      </div>

      {/* ── Salary Structure ─────────────────────────────────────── */}
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Salary Structure</CardTitle>
              <CardDescription>Break down your CTC. PF & NPS rates are auto-applied to your Basic salary.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveSalary} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="basic">Basic Salary (₹/mo)</Label>
                <Input id="basic" type="number" min="0" value={basic} onChange={(e) => setBasic(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hra">HRA (₹/mo)</Label>
                <Input id="hra" type="number" min="0" value={hra} onChange={(e) => setHRA(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="allowances">Special Allowances (₹/mo)</Label>
                <Input id="allowances" type="number" min="0" value={allowances} onChange={(e) => setAllowances(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pfEmpRate">PF Employee Rate (%)</Label>
                <Input id="pfEmpRate" type="number" step="0.01" min="0" max="100" value={pfEmpRate} onChange={(e) => setPfEmpRate(e.target.value)} />
                <p className="text-xs text-muted-foreground">= {formatCurrency(previewPFEmp)}/mo deducted</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pfErRate">PF Employer Rate (%)</Label>
                <Input id="pfErRate" type="number" step="0.01" min="0" max="100" value={pfErRate} onChange={(e) => setPfErRate(e.target.value)} />
                <p className="text-xs text-muted-foreground">= {formatCurrency(previewPFEr)}/mo (added to PF corpus)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="npsRate">NPS Rate (%)</Label>
                <Input id="npsRate" type="number" step="0.01" min="0" max="100" value={npsRate} onChange={(e) => setNpsRate(e.target.value)} />
                <p className="text-xs text-muted-foreground">= {formatCurrency(previewNPS)}/mo deducted</p>
              </div>
            </div>

            {/* Live preview */}
            <div className="p-4 rounded-lg bg-muted/50 border grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Gross Salary</p>
                <p className="text-lg font-bold">{formatCurrency(previewGross)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-bold text-red-500">-{formatCurrency(previewPFEmp + previewNPS)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Take-Home</p>
                <p className="text-lg font-bold text-green-500">{formatCurrency(previewNetTakeHome)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total to PF Corpus</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(previewPFEmp + previewPFEr)}</p>
              </div>
            </div>

            <Button type="submit" className="w-full">Save Salary Structure & Sync PF/NPS Vehicles</Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Plan Targets ─────────────────────────────────────── */}
      <Card className="max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Plan Targets & Assumptions</CardTitle>
              <CardDescription>Economic assumptions for projections and the Planned vs Actual comparison.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSavePlan} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense">Planned Monthly Expense (₹)</Label>
                <Input id="expense" type="number" min="0" value={expense} onChange={(e) => setExpense(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hike">Expected Annual Hike (%)</Label>
                <Input id="hike" type="number" step="0.1" min="0" max="100" value={hike} onChange={(e) => setHike(e.target.value)} required />
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inflation">Expected Inflation (%)</Label>
                <Input id="inflation" type="number" step="0.1" min="0" max="50" value={inflation} onChange={(e) => setInflation(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="years">Default Projection Years</Label>
                <Input id="years" type="number" min="1" max="50" value={years} onChange={(e) => setYears(e.target.value)} required />
              </div>
            </div>
            <Button type="submit" className="w-full">Save Plan Targets</Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Data Management ─────────────────────────────────── */}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>Export a backup or restore from a previous backup file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button variant="outline" className="w-full" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export All Data
            </Button>
            <Button variant="outline" className="w-full" onClick={handleImport}>
              <Upload className="h-4 w-4 mr-2" /> Import Backup
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Your data ({vehicles.length} investments, {goals.length} goals, {entries.length} ledger entries) is stored locally in your browser.
          </p>
        </CardContent>
      </Card>

      {/* ── Danger Zone ──────────────────────────────────────── */}
      <Card className="max-w-3xl border-red-500/20">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect all your data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowResetConfirm(true)}>
            Reset All Data
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showResetConfirm}
        title="Reset All Data"
        description="This will permanently delete all your investments, goals, ledger entries, and settings. Consider exporting a backup first."
        confirmLabel="Reset Everything"
        onConfirm={handleResetAll}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
