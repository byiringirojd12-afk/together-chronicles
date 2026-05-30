import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { Bell, CalendarHeart, Plus, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { useReminders, type Reminder } from "@/hooks/use-notifications";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({ meta: [{ title: "Reminders · Together+" }] }),
  component: RemindersPage,
});

const TYPE_OPTIONS = [
  { value: "general", label: "General" },
  { value: "anniversary", label: "Anniversary" },
  { value: "finance", label: "Finance" },
  { value: "custom", label: "Custom" },
];
const RECURRENCE_OPTIONS = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function RemindersPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: reminders, isLoading } = useReminders();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  if (!profile?.couple_id) {
    return <EmptyHint />;
  }

  async function toggleActive(r: Reminder) {
    const { error } = await supabase.from("reminders").update({ active: !r.active }).eq("id", r.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["reminders", profile?.couple_id] });
  }

  async function remove(r: Reminder) {
    const { error } = await supabase.from("reminders").delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success("Reminder removed"); qc.invalidateQueries({ queryKey: ["reminders", profile?.couple_id] }); }
  }

  const upcoming = (reminders ?? []).filter((r) => r.active);
  const inactive = (reminders ?? []).filter((r) => !r.active);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <header className="flex items-end justify-between gap-4 mb-8 animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-deep)] mb-2">Reminders</p>
          <h1 className="font-serif text-4xl md:text-5xl">Never forget the little things.</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-[var(--shadow-glow)]"><Plus className="size-4" /> New</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-serif text-2xl">New reminder</DialogTitle></DialogHeader>
            <ReminderForm
              userId={user!.id}
              coupleId={profile.couple_id}
              onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["reminders", profile.couple_id] }); }}
            />
          </DialogContent>
        </Dialog>
      </header>

      {isLoading && <p className="text-muted-foreground">Loading…</p>}

      {!isLoading && upcoming.length === 0 && inactive.length === 0 && (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
          <Bell className="size-8 mx-auto mb-3 text-muted-foreground/60" />
          <p className="font-serif text-xl mb-1">No reminders yet</p>
          <p className="text-sm text-muted-foreground">Add your first to be gently nudged when it matters.</p>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="space-y-3 mb-8">
          {upcoming.map((r) => (
            <ReminderRow key={r.id} r={r} onToggle={() => toggleActive(r)} onDelete={() => remove(r)} />
          ))}
        </section>
      )}

      {inactive.length > 0 && (
        <>
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Paused</h2>
          <section className="space-y-3 opacity-70">
            {inactive.map((r) => (
              <ReminderRow key={r.id} r={r} onToggle={() => toggleActive(r)} onDelete={() => remove(r)} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="max-w-md mx-auto px-6 py-16 text-center">
      <h1 className="font-serif text-3xl mb-3">Pair first</h1>
      <p className="text-muted-foreground">Reminders are shared with your partner. Pair your account to get started.</p>
    </div>
  );
}

function ReminderRow({ r, onToggle, onDelete }: { r: Reminder; onToggle: () => void; onDelete: () => void }) {
  const due = new Date(r.due_at);
  const past = due.getTime() < Date.now();
  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 flex items-start gap-4 animate-fade-up">
      <div className="size-10 rounded-xl bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)] flex items-center justify-center shrink-0">
        {r.reminder_type === "anniversary" ? <CalendarHeart className="size-5" /> : <Bell className="size-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-serif text-lg leading-tight">{r.title}</p>
          {r.recurrence !== "none" && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              <Repeat className="size-3" /> {r.recurrence}
            </span>
          )}
        </div>
        {r.body && <p className="text-sm text-muted-foreground mt-0.5">{r.body}</p>}
        <p className="text-xs text-muted-foreground/80 mt-1">
          {past ? "Was due " : "In "}
          {formatDistanceToNow(due, { addSuffix: past })} · {format(due, "PP p")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Switch checked={r.active} onCheckedChange={onToggle} aria-label="Active" />
        <button onClick={onDelete} className="size-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center justify-center" aria-label="Delete">
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function ReminderForm({ userId, coupleId, onDone }: { userId: string; coupleId: string; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("general");
  const [recurrence, setRecurrence] = useState("none");
  const [date, setDate] = useState(() => format(new Date(Date.now() + 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"));
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("reminders").insert({
      couple_id: coupleId,
      created_by: userId,
      title: title.trim(),
      body: body.trim() || null,
      reminder_type: type,
      recurrence,
      due_at: new Date(date).toISOString(),
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Reminder saved"); onDone(); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Our anniversary dinner" required maxLength={120} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Note <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reservation at 7pm" maxLength={500} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Repeat</Label>
          <Select value={recurrence} onValueChange={setRecurrence}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{RECURRENCE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="due">When</Label>
        <Input id="due" type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save reminder"}</Button>
    </form>
  );
}