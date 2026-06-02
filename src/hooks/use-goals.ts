import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./use-profile";
import { useAuth } from "./use-auth";

export interface Goal {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  description: string | null;
  status: "active" | "completed" | "archived";
  progress: number;
  target_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  goal_id: string;
  couple_id: string;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export function useGoals() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const query = useQuery({
    queryKey: ["goals", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase.from("goals" as never).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Goal[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`goals:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "goals", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["goals", coupleId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "goal_milestones", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["milestones"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  return query;
}

export function useMilestones(goalId: string | null) {
  return useQuery({
    queryKey: ["milestones", goalId],
    enabled: !!goalId,
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await supabase.from("goal_milestones" as never).select("*").eq("goal_id", goalId!).order("position");
      if (error) throw error;
      return (data ?? []) as unknown as Milestone[];
    },
  });
}

export function useCreateGoal() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string; target_date?: string | null }) => {
      if (!user || !profile?.couple_id) throw new Error("Not paired");
      const { error } = await supabase.from("goals" as never).insert({
        couple_id: profile.couple_id, created_by: user.id,
        title: input.title, description: input.description ?? null, target_date: input.target_date ?? null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", profile?.couple_id] }),
  });
}

export function useUpdateGoal() {
  const { data: profile } = useProfile();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Goal> }) => {
      const updates: Record<string, unknown> = { ...patch };
      if (patch.status === "completed" && !patch.completed_at) {
        updates.completed_at = new Date().toISOString();
        updates.progress = 100;
        // Fire notification to both partners
        if (profile?.couple_id && user) {
          const { data: partners } = await supabase.from("profiles").select("id").eq("couple_id", profile.couple_id);
          if (partners) {
            const goal = await supabase.from("goals" as never).select("title").eq("id", id).maybeSingle();
            const title = (goal.data as { title?: string } | null)?.title ?? "Goal";
            await supabase.from("notifications").insert(
              partners.map((p: { id: string }) => ({
                user_id: p.id, type: "goal", title: "Goal completed 🎉", body: `"${title}" has been marked complete.`,
              }))
            );
          }
        }
      }
      const { error } = await supabase.from("goals" as never).update(updates as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", profile?.couple_id] }),
  });
}

export function useDeleteGoal() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals", profile?.couple_id] }),
  });
}

export function useAddMilestone() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { goal_id: string; title: string; position?: number }) => {
      if (!profile?.couple_id) throw new Error("Not paired");
      const { error } = await supabase.from("goal_milestones" as never).insert({
        goal_id: input.goal_id, couple_id: profile.couple_id, title: input.title, position: input.position ?? 0,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["milestones", v.goal_id] }),
  });
}

export function useToggleMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed, goalId: _g }: { id: string; completed: boolean; goalId: string }) => {
      const { error } = await supabase.from("goal_milestones" as never).update({ completed } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["milestones", v.goalId] }),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, goalId: _g }: { id: string; goalId: string }) => {
      const { error } = await supabase.from("goal_milestones" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["milestones", v.goalId] }),
  });
}