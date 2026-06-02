import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight, Trash2, Cake, Heart, Bell, Calendar as CalendarIcon } from "lucide-react";
import { addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek, eachDayOfInterval } from "date-fns";
import { useCalendarEvents, useCreateEvent, useDeleteEvent, expandOccurrences, type EventType, type Recurrence } from "@/hooks/use-calendar";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({ meta: [{ title: "Calendar — Together+" }] }),
  component: CalendarPage,
});

const typeIcon: Record<EventType, React.ElementType> = { event: CalendarIcon, anniversary: Heart, birthday: Cake, reminder: Bell };

function CalendarPage() {
  const { data: profile } = useProfile();
  const [cursor, setCursor] = useState(new Date());
  const monthStart = startOfMonth(cursor); const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart); const gridEnd = endOfWeek(monthEnd);
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);
  const { data: events = [] } = useCalendarEvents(gridStart, gridEnd);
  const occurrences = useMemo(() => expandOccurrences(events, gridStart, gridEnd), [events, gridStart, gridEnd]);
  const [selected, setSelected] = useState<Date>(new Date());

  if (!profile?.couple_id) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl mb-2">Pair first</h1>
        <p className="text-muted-foreground mb-4">Calendar opens once you and your partner are connected.</p>
        <Link to="/pair" className="text-primary font-medium underline-offset-4 hover:underline">Go to pairing →</Link>
      </div>
    );
  }

  const selectedEvents = occurrences.filter((o) => isSameDay(o.occursAt, selected));

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, -1))}><ChevronLeft className="size-4" /></Button>
          <h1 className="font-serif text-2xl md:text-3xl min-w-40 text-center">{format(cursor, "MMMM yyyy")}</h1>
          <Button variant="ghost" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}><ChevronRight className="size-4" /></Button>
        </div>
        <NewEventButton defaultDate={selected} />
      </header>

      <div className="bg-card border border-border/60 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-7 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border/40">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="px-2 py-2 text-center">{d}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const dayEv = occurrences.filter((o) => isSameDay(o.occursAt, d));
            const inMonth = isSameMonth(d, cursor);
            const isSelected = isSameDay(d, selected);
            const today = isSameDay(d, new Date());
            return (
              <button key={d.toISOString()} onClick={() => setSelected(d)}
                className={`min-h-16 md:min-h-20 p-1.5 border-r border-b border-border/40 last:border-r-0 text-left flex flex-col gap-0.5 ${inMonth ? "" : "bg-muted/30 text-muted-foreground"} ${isSelected ? "bg-[color:var(--color-gold)]/15" : ""}`}>
                <span className={`text-xs font-medium ${today ? "size-5 rounded-full bg-[color:var(--color-gold-deep)] text-white flex items-center justify-center" : ""}`}>{format(d, "d")}</span>
                <div className="space-y-0.5 overflow-hidden">
                  {dayEv.slice(0, 2).map((e, i) => (
                    <div key={i} className="text-[10px] truncate px-1 rounded bg-[color:var(--color-emerald)]/15 text-[color:var(--color-emerald-deep)]">{e.title}</div>
                  ))}
                  {dayEv.length > 2 && <div className="text-[10px] text-muted-foreground px-1">+{dayEv.length - 2}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-5">
        <h2 className="font-serif text-xl mb-3">{format(selected, "EEEE, MMMM d")}</h2>
        {selectedEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nothing scheduled.</p>
        ) : (
          <ul className="divide-y divide-border/40">
            {selectedEvents.map((e, i) => <EventRow key={`${e.id}-${i}`} ev={e} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

function EventRow({ ev }: { ev: ReturnType<typeof expandOccurrences>[number] }) {
  const del = useDeleteEvent();
  const Icon = typeIcon[ev.event_type] ?? CalendarIcon;
  return (
    <li className="py-3 flex items-center gap-3 group">
      <div className="size-9 rounded-lg bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)] flex items-center justify-center"><Icon className="size-4" /></div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{ev.title}</p>
        <p className="text-xs text-muted-foreground">
          {ev.all_day ? "All day" : format(ev.occursAt, "h:mm a")}
          {ev.location && ` · ${ev.location}`}
          {ev.recurrence !== "none" && ` · repeats ${ev.recurrence}`}
        </p>
        {ev.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{ev.description}</p>}
      </div>
      <button onClick={() => { if (confirm("Delete this event?")) del.mutate(ev.id); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function NewEventButton({ defaultDate }: { defaultDate: Date }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [time, setTime] = useState("18:00");
  const [allDay, setAllDay] = useState(false);
  const [eventType, setEventType] = useState<EventType>("event");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");
  const create = useCreateEvent();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const starts_at = allDay ? new Date(`${date}T00:00:00`).toISOString() : new Date(`${date}T${time}:00`).toISOString();
    try {
      await create.mutateAsync({ title: title.trim(), description: description || undefined, location: location || undefined, starts_at, all_day: allDay, event_type: eventType, recurrence });
      toast.success("Event added");
      setOpen(false); setTitle(""); setDescription(""); setLocation("");
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setDate(format(defaultDate, "yyyy-MM-dd")); }}>
      <DialogTrigger asChild><Button className="rounded-full"><Plus className="size-4 mr-1" /> New event</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-serif text-2xl">New event</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          <div className="grid grid-cols-2 gap-2">
            <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="event">Event</option><option value="anniversary">Anniversary</option><option value="birthday">Birthday</option><option value="reminder">Reminder</option>
            </select>
            <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)} className="h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              <option value="none">No repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            {!allDay && <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />}
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} /> All day</label>
          <Input placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={140} />
          <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Saving…" : "Save"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}