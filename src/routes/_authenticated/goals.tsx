import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Target, CheckCircle2, Circle, Trash2, ChevronRight } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useMilestones, useAddMilestone, useToggleMilestone, useDeleteMilestone, type Goal } from "@/hooks/use-goals";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({ meta: [{ title: "Goals — Together+" }] }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: profile } = useProfile();
  const { data: goals = [], isLoading } = useGoals();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!profile?.couple_id) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl mb-2">Pair first</h1>
        <p className="text-muted-foreground mb-4">Goals open once you and your partner are connected.</p>
        <Link to="/pair" className="text-primary font-medium underline-offset-4 hover:underline">Go to pairing →</Link>
      </div>
    );
  }

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-deep)] mb-1">Together</p>
          <h1 className="font-serif text-3xl md:text-4xl">Goals</h1>
        </div>
        <NewGoalButton />
      </header>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <>
          <section className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Active ({active.length})</h2>
            {active.length === 0 ? (
              <div className="bg-card border border-dashed border-border/60 rounded-2xl p-8 text-center">
                <Target className="size-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No active goals yet. Dream something together.</p>
              </div>
            ) : active.map((g) => <GoalCard key={g.id} goal={g} expanded={expanded === g.id} onToggle={() => setExpanded(expanded === g.id ? null : g.id)} />)}
          </section>
          {completed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Completed ({completed.length})</h2>
              {completed.map((g) => <GoalCard key={g.id} goal={g} expanded={expanded === g.id} onToggle={() => setExpanded(expanded === g.id ? null : g.id)} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function GoalCard({ goal, expanded, onToggle }: { goal: Goal; expanded: boolean; onToggle: () => void }) {
  const update = useUpdateGoal();
  const del = useDeleteGoal();
  const done = goal.status === "completed";
  const daysLeft = goal.target_date ? differenceInDays(parseISO(goal.target_date), new Date()) : null;

  return (
    <div className={`bg-card border rounded-2xl overflow-hidden ${done ? "border-emerald-200" : "border-border/60"}`}>
      <button onClick={onToggle} className="w-full p-5 text-left flex items-start gap-3">
        <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${done ? "bg-emerald-100 text-emerald-700" : "bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)]"}`}>
          {done ? <CheckCircle2 className="size-5" /> : <Target className="size-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`font-serif text-xl ${done ? "line-through text-muted-foreground" : ""}`}>{goal.title}</h3>
            <ChevronRight className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
          </div>
          {goal.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{goal.description}</p>}
          <div className="mt-3 space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{goal.progress}%</span>
              {daysLeft !== null && <span>{daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Today" : `${-daysLeft}d overdue`}</span>}
            </div>
            <Progress value={goal.progress} className="h-1.5" />
          </div>
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-border/40 pt-4">
          <MilestoneList goalId={goal.id} />
          <div className="flex flex-wrap gap-2 pt-2">
            {!done && (
              <>
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: goal.id, patch: { progress: Math.min(100, goal.progress + 10) } })}>+10%</Button>
                <Button size="sm" variant="outline" onClick={() => update.mutate({ id: goal.id, patch: { progress: Math.min(100, goal.progress + 25) } })}>+25%</Button>
                <Button size="sm" onClick={() => update.mutate({ id: goal.id, patch: { status: "completed" } })}>Mark complete</Button>
              </>
            )}
            {done && (
              <Button size="sm" variant="outline" onClick={() => update.mutate({ id: goal.id, patch: { status: "active", completed_at: null } })}>Reopen</Button>
            )}
            <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => { if (confirm("Delete this goal?")) del.mutate(goal.id); }}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function MilestoneList({ goalId }: { goalId: string }) {
  const { data: items = [] } = useMilestones(goalId);
  const [title, setTitle] = useState("");
  const add = useAddMilestone();
  const toggle = useToggleMilestone();
  const del = useDeleteMilestone();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    await add.mutateAsync({ goal_id: goalId, title: title.trim(), position: items.length });
    setTitle("");
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Milestones</p>
      <ul className="space-y-1.5">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-2 group">
            <button onClick={() => toggle.mutate({ id: m.id, completed: !m.completed, goalId })} className="shrink-0">
              {m.completed ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Circle className="size-4 text-muted-foreground" />}
            </button>
            <span className={`text-sm flex-1 ${m.completed ? "line-through text-muted-foreground" : ""}`}>{m.title}</span>
            <button onClick={() => del.mutate({ id: m.id, goalId })} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-2 mt-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a milestone…" className="h-8 text-sm" maxLength={120} />
        <Button type="submit" size="sm" variant="outline" disabled={!title.trim()}>Add</Button>
      </form>
    </div>
  );
}

function NewGoalButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const create = useCreateGoal();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ title: title.trim(), description: description || undefined, target_date: date || null });
      toast.success("Goal created");
      setOpen(false); setTitle(""); setDescription(""); setDate("");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full"><Plus className="size-4 mr-1" /> New goal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New goal</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          <Textarea placeholder="Why does it matter? (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}