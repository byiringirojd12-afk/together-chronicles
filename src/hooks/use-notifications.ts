import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useProfile } from "./use-profile";

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  read: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  body: string | null;
  reminder_type: string;
  due_at: string;
  recurrence: "none" | "daily" | "weekly" | "monthly" | "yearly";
  active: boolean;
  last_fired_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as AppNotification[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["notifications", user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const unread = query.data?.filter((n) => !n.read).length ?? 0;
  return { ...query, unread, markRead, markAllRead };
}

export function useReminders() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id;

  const query = useQuery({
    queryKey: ["reminders", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Reminder[]> => {
      if (!coupleId) return [];
      const { data, error } = await supabase
        .from("reminders")
        .select("*")
        .eq("couple_id", coupleId)
        .order("due_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase
      .channel(`reminders:${coupleId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reminders", filter: `couple_id=eq.${coupleId}` }, () => {
        qc.invalidateQueries({ queryKey: ["reminders", coupleId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [coupleId, qc]);

  return query;
}

export interface NotificationPreferences {
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  reminders_enabled: boolean;
  daily_motivation_enabled: boolean;
  timezone: string;
}

export function usePreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["preferences", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<NotificationPreferences | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!data) {
        // Defensive: create row if missing (trigger should have done it)
        const ins = await supabase.from("notification_preferences").insert({ user_id: user.id }).select("*").single();
        if (ins.error) throw ins.error;
        return ins.data as NotificationPreferences;
      }
      return data as NotificationPreferences;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("No user");
      const { error } = await supabase.from("notification_preferences").update(patch).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["preferences", user?.id] }),
  });

  return { ...query, update };
}