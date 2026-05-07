import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInvestmentStore } from '@/store/investmentStore';
import { InvestmentVehicle } from '@/types';
import { formatCurrency } from '@/lib/finance';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { PieChart, Pencil, Trash2, Link2, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Investments() {
  const { vehicles, addVehicle, removeVehicle, updateVehicle } = useInvestmentStore();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [currentBalance, setCurrentBalance] = useState('');
  const [expectedAnnualReturn, setExpectedAnnualReturn] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [stepUp, setStepUp] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAutoLinked, setEditingAutoLinked] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setCategory('');
    setCurrentBalance('');
    setExpectedAnnualReturn('');
    setMonthlyContribution('');
    setStepUp(false);
    setEditingId(null);
    setEditingAutoLinked(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !currentBalance || !expectedAnnualReturn) return;

    const returnRate = Number(expectedAnnualReturn);
    if (returnRate < 0 || returnRate > 100) {
      toast('Expected return must be between 0% and 100%.', 'error');
      return;
    }
    if (Number(currentBalance) < 0) {
      toast('Balance cannot be negative.', 'error');
      return;
    }

    if (editingId) {
      const updates: Partial<InvestmentVehicle> = {
        currentBalance: Number(currentBalance),
        expectedAnnualReturn: returnRate / 100,
      };
      if (!editingAutoLinked) {
        // Only update these for manual vehicles
        updates.name = name;
        updates.category = category;
        updates.monthlyContribution = Number(monthlyContribution) || 0;
        updates.stepUpWithSalary = stepUp;
      }
      updateVehicle(editingId, updates);
      toast('Investment updated.');
      resetForm();
    } else {
      const newVehicle: InvestmentVehicle = {
        id: crypto.randomUUID(),
        name,
        category,
        currentBalance: Number(currentBalance),
        expectedAnnualReturn: returnRate / 100,
        monthlyContribution: Number(monthlyContribution) || 0,
        stepUpWithSalary: stepUp,
      };
      addVehicle(newVehicle);
      toast('Investment added.');
      resetForm();
    }
  };

  const handleEdit = (v: InvestmentVehicle) => {
    setEditingId(v.id);
    setEditingAutoLinked(!!v.isAutoLinked);
    setName(v.name);
    setCategory(v.category);
    setCurrentBalance(v.currentBalance.toString());
    setExpectedAnnualReturn((v.expectedAnnualReturn * 100).toString());
    setMonthlyContribution(v.monthlyContribution.toString());
    setStepUp(!!v.stepUpWithSalary);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      const vehicle = vehicles.find((v) => v.id === deleteTarget);
      if (vehicle?.isAutoLinked) {
        toast('Auto-linked vehicles (PF/NPS) are managed via Settings. Update your salary structure instead.', 'error');
        setDeleteTarget(null);
        return;
      }
      removeVehicle(deleteTarget);
      toast('Investment removed.', 'info');
      setDeleteTarget(null);
    }
  };

  const autoLinkedVehicles = vehicles.filter((v) => v.isAutoLinked);
  const manualVehicles = vehicles.filter((v) => !v.isAutoLinked);
  const totalPortfolio = vehicles.reduce((s, v) => s + v.currentBalance, 0);

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Investment Portfolio</h2>
        <p className="text-muted-foreground">
          Your complete portfolio. PF & NPS are auto-managed via salary structure — add discretionary investments here.
        </p>
      </div>

      {/* Auto-linked vehicles summary */}
      {autoLinkedVehicles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" /> Salary-Linked Investments
            <span className="text-xs font-normal text-muted-foreground">(Auto-managed from Settings → Salary Structure)</span>
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {autoLinkedVehicles.map((v) => (
              <Card key={v.id} className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{v.name}</CardTitle>
                    <Badge variant="outline" className="text-xs border-primary/30 text-primary">Auto-Linked</Badge>
                  </div>
                  <CardDescription>{v.category}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(v.currentBalance)}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(v.monthlyContribution)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-bold text-green-500">{(v.expectedAnnualReturn * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full" onClick={() => handleEdit(v)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit Balance & Return
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add manual investment form */}
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? (editingAutoLinked ? "Edit Auto-Linked Vehicle" : "Edit Investment") : "Add Investment Vehicle"}</CardTitle>
          <CardDescription>
            {editingAutoLinked
              ? "You can update the current balance and expected return. Name, category, and contribution are managed via salary structure."
              : "Add a discretionary investment like Mutual Funds, Gold, Fixed Deposits, or Stocks."
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
            {!editingAutoLinked && (
              <>
                <div className="grid w-full max-w-[200px] items-center gap-1.5">
                  <Label htmlFor="name">Investment Name</Label>
                  <Input type="text" id="name" placeholder="e.g. Nifty 50 Index" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="grid w-full max-w-[180px] items-center gap-1.5">
                  <Label htmlFor="category">Category</Label>
                  <Input type="text" id="category" placeholder="e.g. Mutual Fund" value={category} onChange={(e) => setCategory(e.target.value)} required />
                </div>
              </>
            )}
            <div className="grid w-full max-w-[150px] items-center gap-1.5">
              <Label htmlFor="currentBalance">Balance (₹)</Label>
              <Input type="number" id="currentBalance" min="0" placeholder="500000" value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} required />
            </div>
            {!editingAutoLinked && (
              <div className="grid w-full max-w-[150px] items-center gap-1.5">
                <Label htmlFor="monthlyContribution">Monthly SIP (₹)</Label>
                <Input type="number" id="monthlyContribution" min="0" placeholder="20000" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} />
              </div>
            )}
            <div className="grid w-full max-w-[150px] items-center gap-1.5">
              <Label htmlFor="expectedAnnualReturn">Return (%/yr)</Label>
              <Input type="number" step="0.1" min="0" max="100" id="expectedAnnualReturn" placeholder="12.0" value={expectedAnnualReturn} onChange={(e) => setExpectedAnnualReturn(e.target.value)} required />
            </div>
            {!editingAutoLinked && (
              <div className="flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  id="stepUp"
                  checked={stepUp}
                  onChange={(e) => setStepUp(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="stepUp" className="text-sm cursor-pointer">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" /> Step-up SIP
                  </span>
                </Label>
              </div>
            )}
            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Update" : "Add Vehicle"}</Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>}
            </div>
          </form>
          {!editingAutoLinked && (
            <p className="text-xs text-muted-foreground mt-3">
              <strong>Step-up SIP:</strong> If checked, the monthly SIP will automatically increase with your annual salary hike in projections.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Manual vehicles */}
      {manualVehicles.length === 0 && autoLinkedVehicles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <PieChart className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
            <p className="text-lg font-medium text-muted-foreground">No investments yet</p>
            <p className="text-sm text-muted-foreground">Set up your salary structure in Settings to auto-create PF/NPS, or add investments above.</p>
          </CardContent>
        </Card>
      ) : manualVehicles.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Discretionary Investments</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {manualVehicles.map((v) => (
              <Card key={v.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{v.name}</CardTitle>
                    {v.stepUpWithSalary && (
                      <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-500">
                        <TrendingUp className="h-3 w-3 mr-1" /> Step-up
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{v.category}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(v.currentBalance)}</p>
                  </div>
                  <div className="flex justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly SIP</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(v.monthlyContribution)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Expected Return</p>
                      <p className="text-lg font-bold text-green-500">{(v.expectedAnnualReturn * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(v)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => setDeleteTarget(v.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Portfolio summary */}
      {vehicles.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPortfolio)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Vehicles</p>
                <p className="text-2xl font-bold">{vehicles.length} <span className="text-sm font-normal text-muted-foreground">({autoLinkedVehicles.length} auto + {manualVehicles.length} manual)</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Investment"
        description="This investment vehicle will be permanently removed from your portfolio. This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
