import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGoalStore } from '@/store/goalStore';
import { useInvestmentStore } from '@/store/investmentStore';
import { Goal } from '@/types';
import { calculateRequiredMonthlyContribution } from '@/calculations/engine';
import { formatCurrency, getWeightedReturn } from '@/lib/finance';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { format } from 'date-fns';
import { Target, Pencil, Trash2, Link2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function Goals() {
  const { goals, addGoal, removeGoal, updateGoal } = useGoalStore();
  const { vehicles } = useInvestmentStore();
  const { toast } = useToast();

  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [linkedVehicleIds, setLinkedVehicleIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const weightedReturn = getWeightedReturn(vehicles);

  // Compute actual progress for goals with linked vehicles
  const getGoalProgress = (goal: Goal): number => {
    if (goal.linkedVehicleIds && goal.linkedVehicleIds.length > 0) {
      return goal.linkedVehicleIds.reduce((sum, vid) => {
        const vehicle = vehicles.find((v) => v.id === vid);
        return sum + (vehicle?.currentBalance || 0);
      }, 0);
    }
    return goal.currentProgress;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount || !targetDate) return;

    const amt = Number(targetAmount);
    if (amt <= 0) {
      toast('Target amount must be positive.', 'error');
      return;
    }

    if (editingId) {
      updateGoal(editingId, {
        title,
        targetAmount: amt,
        targetDate,
        linkedVehicleIds: linkedVehicleIds.length > 0 ? linkedVehicleIds : undefined,
      });
      setEditingId(null);
      toast('Goal updated.');
    } else {
      const newGoal: Goal = {
        id: crypto.randomUUID(),
        title,
        targetAmount: amt,
        targetDate,
        currentProgress: 0,
        linkedVehicleIds: linkedVehicleIds.length > 0 ? linkedVehicleIds : undefined,
        inflationAdjusted: true,
      };
      addGoal(newGoal);
      toast('Goal created.');
    }

    setTitle('');
    setTargetAmount('');
    setTargetDate('');
    setLinkedVehicleIds([]);
  };

  const handleEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setTitle(goal.title);
    setTargetAmount(goal.targetAmount.toString());
    setTargetDate(goal.targetDate);
    setLinkedVehicleIds(goal.linkedVehicleIds || []);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      removeGoal(deleteTarget);
      toast('Goal deleted.', 'info');
      setDeleteTarget(null);
    }
  };

  const toggleVehicleLink = (vehicleId: string) => {
    setLinkedVehicleIds((prev) =>
      prev.includes(vehicleId)
        ? prev.filter((id) => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 flex-1 overflow-auto">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Financial Goals</h2>
        <p className="text-muted-foreground">Define milestones and optionally link them to investment vehicles for auto-tracked progress.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit Goal" : "Create Goal"}</CardTitle>
          <CardDescription>Set a financial milestone. Link investment vehicles to auto-track progress.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="grid w-full max-w-xs items-center gap-1.5">
                <Label htmlFor="title">Goal Name</Label>
                <Input type="text" id="title" placeholder="e.g. House Downpayment" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div className="grid w-full max-w-xs items-center gap-1.5">
                <Label htmlFor="targetAmount">Target Amount (₹)</Label>
                <Input type="number" id="targetAmount" min="1" placeholder="5000000" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} required />
              </div>
              <div className="grid w-full max-w-xs items-center gap-1.5">
                <Label htmlFor="targetDate">Target Date</Label>
                <Input type="month" id="targetDate" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} required />
              </div>
            </div>

            {/* Vehicle linking */}
            {vehicles.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Link2 className="h-4 w-4" /> Link Investment Vehicles
                  <span className="text-xs font-normal text-muted-foreground">(Optional — progress auto-derived from linked balances)</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {vehicles.map((v) => {
                    const isLinked = linkedVehicleIds.includes(v.id);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => toggleVehicleLink(v.id)}
                        className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                          isLinked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {v.name}
                        {v.isAutoLinked && <span className="ml-1 text-xs opacity-70">⚡</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit">{editingId ? "Update Goal" : "Add Goal"}</Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingId(null);
                  setTitle(''); setTargetAmount(''); setTargetDate(''); setLinkedVehicleIds([]);
                }}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {goals.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center space-y-3">
            <Target className="h-10 w-10 mx-auto text-muted-foreground opacity-30" />
            <p className="text-lg font-medium text-muted-foreground">No goals yet</p>
            <p className="text-sm text-muted-foreground">Create your first financial milestone above to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const effectiveReturn = weightedReturn > 0 ? weightedReturn : 0.10;
            const progress = getGoalProgress(goal);
            const requiredMonthly = calculateRequiredMonthlyContribution(
              { ...goal, currentProgress: progress },
              effectiveReturn
            );
            const progressPercent = Math.min((progress / goal.targetAmount) * 100, 100);
            const isLinked = goal.linkedVehicleIds && goal.linkedVehicleIds.length > 0;

            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    {isLinked && (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                        <Link2 className="h-3 w-3 mr-1" /> Auto-Progress
                      </Badge>
                    )}
                  </div>
                  <CardDescription>Target: {format(new Date(goal.targetDate), 'MMM yyyy')}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-sm text-muted-foreground">Progress</p>
                        <p className="text-xl font-bold">{formatCurrency(progress)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Target</p>
                        <p className="text-xl font-bold">{formatCurrency(goal.targetAmount)}</p>
                      </div>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2.5">
                      <div
                        className="bg-primary h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    {isLinked && (
                      <div className="flex flex-wrap gap-1">
                        {goal.linkedVehicleIds!.map((vid) => {
                          const v = vehicles.find((veh) => veh.id === vid);
                          return v ? (
                            <Badge key={vid} variant="secondary" className="text-xs">
                              {v.name}: {formatCurrency(v.currentBalance)}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Required Monthly</p>
                      <p className="text-lg font-bold text-primary">{formatCurrency(requiredMonthly)}/mo</p>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(goal)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="flex-1" onClick={() => setDeleteTarget(goal.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Goal"
        description="This goal will be permanently removed. This action cannot be undone."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
