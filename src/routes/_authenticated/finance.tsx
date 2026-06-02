import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, TrendingDown, TrendingUp, Trash2, PiggyBank, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth, parseISO } from "date-fns";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { useTransactions, useAddTransaction, useDeleteTransaction, useSavingsGoals, useBudgets } from "@/hooks/use-finance";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finance — Together+" }] }),
  component: FinancePage,
});

const DEFAULT_CATEGORIES = ["Groceries", "Rent", "Utilities", "Dining", "Transport", "Entertainment", "Health", "Gifts", "Other"];
const COLORS = ["#c19a4b", "#7a8f6a", "#a76b54", "#5e7c8b", "#b58a72", "#8c6f9b", "#6b8e7f", "#c98787", "#7d7d7d"];

function fmt(n: number, currency = "USD") {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `$${n.toFixed(0)}`; }
}

function FinancePage() {
  const { data: profile } = useProfile();
  const { data: txs = [], isLoading } = useTransactions();
  const { data: savings = [] } = useSavingsGoals();
  const { data: budgets = [] } = useBudgets();

  const now = new Date();
  const thisMonth = useMemo(() => txs.filter((t) => isSameMonth(parseISO(t.occurred_on), now)), [txs, now]);
  const income = thisMonth.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = thisMonth.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expense;

  const trend = useMemo(() => {
    const months: { label: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const s = startOfMonth(d).getTime(); const e = endOfMonth(d).getTime();
      const ms = txs.filter((t) => { const tt = parseISO(t.occurred_on).getTime(); return tt >= s && tt <= e; });
      months.push({
        label: format(d, "MMM"),
        income: ms.filter((t) => t.kind === "income").reduce((a, t) => a + Number(t.amount), 0),
        expense: ms.filter((t) => t.kind === "expense").reduce((a, t) => a + Number(t.amount), 0),
      });
    }
    return months;
  }, [txs, now]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of thisMonth.filter((x) => x.kind === "expense")) {
      const k = t.category || "Other";
      map.set(k, (map.get(k) ?? 0) + Number(t.amount));
    }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [thisMonth]);

  if (!profile?.couple_id) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl mb-2">Pair first</h1>
        <p className="text-muted-foreground mb-4">Finance opens once you and your partner are connected.</p>
        <Link to="/pair" className="text-primary font-medium underline-offset-4 hover:underline">Go to pairing →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-deep)] mb-1">{format(now, "MMMM yyyy")}</p>
          <h1 className="font-serif text-3xl md:text-4xl">Finance</h1>
        </div>
        <AddTransactionButton />
      </header>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard icon={TrendingUp} label="Income" value={fmt(income)} accent="text-[color:var(--color-emerald)]" />
        <StatCard icon={TrendingDown} label="Expense" value={fmt(expense)} accent="text-destructive" />
        <StatCard icon={PiggyBank} label="Net" value={fmt(net)} accent={net >= 0 ? "text-[color:var(--color-emerald)]" : "text-destructive"} />
      </div>

      <BudgetAlerts thisMonth={thisMonth} budgets={budgets} />

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h2 className="font-serif text-xl mb-3">6-month trend</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7a8f6a" stopOpacity={0.4}/><stop offset="95%" stopColor="#7a8f6a" stopOpacity={0}/></linearGradient>
                  <linearGradient id="gEx" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#c98787" stopOpacity={0.4}/><stop offset="95%" stopColor="#c98787" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} width={36} />
                <Tooltip />
                <Area type="monotone" dataKey="income" stroke="#7a8f6a" fill="url(#gIn)" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#c98787" fill="url(#gEx)" name="Expense" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-5">
          <h2 className="font-serif text-xl mb-3">Spending by category</h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No expenses yet this month.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" outerRadius={75} innerRadius={45} paddingAngle={2}>
                    {byCategory.map((_e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <SavingsSection savings={savings} />
      <BudgetSection budgets={budgets} categories={DEFAULT_CATEGORIES} />

      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <h2 className="font-serif text-xl mb-3">Recent transactions</h2>
        {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p>
        : txs.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No transactions yet.</p>
        : <ul className="divide-y divide-border/40">
            {txs.slice(0, 20).map((t) => <TxRow key={t.id} t={t} />)}
          </ul>}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: string; accent: string }) {
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${accent}`} />
      </div>
      <p className={`font-serif text-3xl mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

function TxRow({ t }: { t: ReturnType<typeof useTransactions>["data"] extends Array<infer X> | undefined ? X : never }) {
  const del = useDeleteTransaction();
  return (
    <li className="py-3 flex items-center gap-3">
      <div className={`size-9 rounded-lg flex items-center justify-center ${t.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
        {t.kind === "income" ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{t.note || t.category || (t.kind === "income" ? "Income" : "Expense")}</p>
        <p className="text-xs text-muted-foreground">{t.category ?? "Uncategorized"} · {format(parseISO(t.occurred_on), "MMM d")}</p>
      </div>
      <p className={`font-medium ${t.kind === "income" ? "text-[color:var(--color-emerald)]" : "text-destructive"}`}>
        {t.kind === "income" ? "+" : "−"}{fmt(Number(t.amount), t.currency)}
      </p>
      <button onClick={() => del.mutate(t.id)} className="text-muted-foreground hover:text-destructive p-1" aria-label="Delete">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function AddTransactionButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const add = useAddTransaction();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = Number(amount);
    if (!v || v <= 0) { toast.error("Enter a positive amount"); return; }
    try {
      await add.mutateAsync({ kind, amount: v, category, note: note || undefined, occurred_on: date });
      toast.success(`${kind === "income" ? "Income" : "Expense"} added`);
      setOpen(false); setAmount(""); setNote("");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-full"><Plus className="size-4 mr-1" /> Add</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New transaction</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setKind("expense")} className={`py-2 rounded-lg border text-sm font-medium ${kind === "expense" ? "bg-destructive/10 border-destructive text-destructive" : "border-border"}`}>Expense</button>
            <button type="button" onClick={() => setKind("income")} className={`py-2 rounded-lg border text-sm font-medium ${kind === "income" ? "bg-emerald-50 border-emerald-600 text-emerald-700" : "border-border"}`}>Income</button>
          </div>
          <Input type="number" step="0.01" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            {DEFAULT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={140} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Button type="submit" className="w-full" disabled={add.isPending}>{add.isPending ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BudgetAlerts({ thisMonth, budgets }: { thisMonth: ReturnType<typeof useTransactions>["data"]; budgets: ReturnType<typeof useBudgets>["data"] }) {
  const { user } = useAuth();
  const alerts: { category: string; spent: number; limit: number; pct: number }[] = [];
  for (const b of budgets ?? []) {
    const spent = (thisMonth ?? []).filter((t) => t.kind === "expense" && t.category === b.category).reduce((s, t) => s + Number(t.amount), 0);
    const pct = (spent / Number(b.monthly_limit)) * 100;
    if (pct >= 80) alerts.push({ category: b.category, spent, limit: Number(b.monthly_limit), pct });
  }
  if (alerts.length === 0) return null;

  // best-effort: notify self once per category per session
  if (typeof window !== "undefined" && user) {
    const key = `tp_budget_notified_${new Date().toISOString().slice(0, 7)}_${user.id}`;
    const notified: string[] = JSON.parse(sessionStorage.getItem(key) || "[]");
    const toNotify = alerts.filter((a) => a.pct >= 100 && !notified.includes(a.category));
    if (toNotify.length) {
      sessionStorage.setItem(key, JSON.stringify([...notified, ...toNotify.map((a) => a.category)]));
      supabase.from("notifications").insert(toNotify.map((a) => ({
        user_id: user.id, type: "budget", title: `Budget exceeded: ${a.category}`,
        body: `You've spent ${fmt(a.spent)} of a ${fmt(a.limit)} budget.`,
      }))).then(() => {});
    }
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-amber-800"><AlertTriangle className="size-4" /> <p className="font-medium text-sm">Budget alerts</p></div>
      {alerts.map((a) => (
        <div key={a.category} className="text-sm">
          <div className="flex justify-between"><span>{a.category}</span><span className="font-medium">{fmt(a.spent)} / {fmt(a.limit)}</span></div>
          <Progress value={Math.min(a.pct, 100)} className="h-1.5 mt-1" />
        </div>
      ))}
    </div>
  );
}

function SavingsSection({ savings }: { savings: ReturnType<typeof useSavingsGoals>["data"] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");
  const { user } = useAuth();
  const { data: profile } = useProfile();

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile?.couple_id) return;
    const t = Number(target);
    if (!t || t <= 0) { toast.error("Enter a target amount"); return; }
    const { error } = await supabase.from("savings_goals" as never).insert({
      couple_id: profile.couple_id, created_by: user.id, title, target_amount: t,
      deadline: deadline || null,
    } as never);
    if (error) { toast.error(error.message); return; }
    toast.success("Savings goal created");
    setOpen(false); setTitle(""); setTarget(""); setDeadline("");
  }

  async function contribute(id: string, current: number, delta: number) {
    const { error } = await supabase.from("savings_goals" as never).update({ current_amount: Math.max(0, current + delta) } as never).eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-xl">Savings goals</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm"><Plus className="size-4 mr-1" /> New</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-serif text-2xl">New savings goal</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <Input placeholder="Title (e.g. Honeymoon)" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
              <Input type="number" step="0.01" min="1" placeholder="Target amount" value={target} onChange={(e) => setTarget(e.target.value)} required />
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              <Button type="submit" className="w-full">Create</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      {(savings ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No savings goals yet.</p>
      ) : (
        <ul className="space-y-3">
          {(savings ?? []).map((g) => {
            const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
            return (
              <li key={g.id} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{g.title}</span>
                  <span className="text-sm text-muted-foreground">{fmt(Number(g.current_amount), g.currency)} / {fmt(Number(g.target_amount), g.currency)}</span>
                </div>
                <Progress value={pct} className="h-2" />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => contribute(g.id, Number(g.current_amount), 50)}>+50</Button>
                  <Button size="sm" variant="outline" onClick={() => contribute(g.id, Number(g.current_amount), 100)}>+100</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const v = window.prompt("Add amount", "");
                    const n = Number(v);
                    if (n) contribute(g.id, Number(g.current_amount), n);
                  }}>Custom</Button>
                  {g.deadline && <span className="ml-auto self-center text-xs text-muted-foreground">by {format(parseISO(g.deadline), "MMM d, yyyy")}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function BudgetSection({ budgets, categories }: { budgets: ReturnType<typeof useBudgets>["data"]; categories: string[] }) {
  const [cat, setCat] = useState(categories[0]);
  const [limit, setLimit] = useState("");
  const { data: profile } = useProfile();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.couple_id) return;
    const n = Number(limit);
    if (!n || n <= 0) return;
    const { error } = await supabase.from("budgets" as never).upsert({
      couple_id: profile.couple_id, category: cat, monthly_limit: n,
    } as never, { onConflict: "couple_id,category" });
    if (error) { toast.error(error.message); return; }
    toast.success("Budget saved");
    setLimit("");
  }

  async function remove(id: string) {
    const { error } = await supabase.from("budgets" as never).delete().eq("id", id);
    if (error) toast.error(error.message);
  }

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-5">
      <h2 className="font-serif text-xl mb-3">Monthly budgets</h2>
      <form onSubmit={save} className="flex gap-2 mb-3">
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Input type="number" step="0.01" min="1" placeholder="Limit" value={limit} onChange={(e) => setLimit(e.target.value)} className="flex-1" />
        <Button type="submit">Set</Button>
      </form>
      {(budgets ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No budgets set.</p>
      ) : (
        <ul className="divide-y divide-border/40">
          {(budgets ?? []).map((b) => (
            <li key={b.id} className="py-2 flex items-center justify-between">
              <span className="font-medium">{b.category}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{fmt(Number(b.monthly_limit))}/mo</span>
                <button onClick={() => remove(b.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}