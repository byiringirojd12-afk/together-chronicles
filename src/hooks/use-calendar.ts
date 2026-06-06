import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./use-profile";
import { useAuth } from "./use-auth";

export type EventType = "event" | "anniversary" | "birthday" | "reminder";
export type Recurrence = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface CalendarEvent {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  event_type: EventType;
  recurrence: Recurrence;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export function useCalendarEvents(rangeStart?: Date, rangeEnd?: Date) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const query = useQuery({
    queryKey: ["calendar", coupleId, rangeStart?.toISOString(), rangeEnd?.toISOString()],
    enabled: !!coupleId,
    queryFn: async (): Promise<CalendarEvent[]> => {
      let q = supabase.from("calendar_events" as never).select("*").order("starts_at");
      if (rangeStart && rangeEnd) {
        // Include recurring events (we'll expand client-side) — fetch all non-future-only
        q = q.lte("starts_at", rangeEnd.toISOString());
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CalendarEvent[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`cal:${coupleId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["calendar", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  return query;
}

export function useCreateEvent() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<CalendarEvent> & { title: string; starts_at: string }) => {
      if (!user || !profile?.couple_id) throw new Error("Not paired");
      const { error } = await supabase.from("calendar_events" as never).insert({
        couple_id: profile.couple_id, created_by: user.id,
        title: input.title, description: input.description ?? null, location: input.location ?? null,
        starts_at: input.starts_at, ends_at: input.ends_at ?? null,
        all_day: input.all_day ?? false, event_type: input.event_type ?? "event",
        recurrence: input.recurrence ?? "none", color: input.color ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar", profile?.couple_id] }),
  });
}

export function useDeleteEvent() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calendar_events" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar", profile?.couple_id] }),
  });
}

/** Expand recurring events into occurrences within [start, end]. */
export function expandOccurrences(events: CalendarEvent[], start: Date, end: Date): Array<CalendarEvent & { occursAt: Date }> {
  const out: Array<CalendarEvent & { occursAt: Date }> = [];
  for (const e of events) {
    const base = new Date(e.starts_at);
    if (e.recurrence === "none") {
      if (base >= start && base <= end) out.push({ ...e, occursAt: base });
      continue;
    }
    // iterate up to end
    const cur = new Date(base);
    // Fast-forward to first occurrence >= start
    const safety = 2000;
    let i = 0;
    while (cur < start && i < safety) { advance(cur, e.recurrence); i++; }
    i = 0;
    while (cur <= end && i < safety) {
      if (cur >= start) out.push({ ...e, occursAt: new Date(cur) });
      advance(cur, e.recurrence); i++;
    }
  }
  return out.sort((a, b) => a.occursAt.getTime() - b.occursAt.getTime());
}

function advance(d: Date, r: Recurrence) {
  if (r === "daily") d.setDate(d.getDate() + 1);
  else if (r === "weekly") d.setDate(d.getDate() + 7);
  else if (r === "monthly") d.setMonth(d.getMonth() + 1);
  else if (r === "yearly") d.setFullYear(d.getFullYear() + 1);
}