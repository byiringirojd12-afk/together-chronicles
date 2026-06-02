import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "./use-profile";
import { useAuth } from "./use-auth";

export interface FinanceTx {
  id: string;
  couple_id: string;
  created_by: string;
  kind: "income" | "expense";
  amount: number;
  currency: string;
  category: string | null;
  note: string | null;
  occurred_on: string;
  created_at: string;
}

export interface SavingsGoal {
  id: string;
  couple_id: string;
  created_by: string;
  title: string;
  target_amount: number;
  current_amount: number;
  currency: string;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  couple_id: string;
  category: string;
  monthly_limit: number;
  created_at: string;
  updated_at: string;
}

export function useTransactions() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const query = useQuery({
    queryKey: ["finance-tx", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<FinanceTx[]> => {
      const { data, error } = await supabase
        .from("finance_transactions" as never)
        .select("*")
        .order("occurred_on", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as FinanceTx[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`finance-tx:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "finance_transactions", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["finance-tx", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  return query;
}

export function useAddTransaction() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { kind: "income" | "expense"; amount: number; category?: string; note?: string; occurred_on?: string; currency?: string }) => {
      if (!user || !profile?.couple_id) throw new Error("Not paired");
      const { error } = await supabase.from("finance_transactions" as never).insert({
        couple_id: profile.couple_id,
        created_by: user.id,
        kind: input.kind,
        amount: input.amount,
        category: input.category ?? null,
        note: input.note ?? null,
        occurred_on: input.occurred_on ?? new Date().toISOString().slice(0, 10),
        currency: input.currency ?? "USD",
      } as never);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-tx", profile?.couple_id] }),
  });
}

export function useDeleteTransaction() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_transactions" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["finance-tx", profile?.couple_id] }),
  });
}

export function useSavingsGoals() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const query = useQuery({
    queryKey: ["savings-goals", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<SavingsGoal[]> => {
      const { data, error } = await supabase.from("savings_goals" as never).select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavingsGoal[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`sg:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "savings_goals", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["savings-goals", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  return query;
}

export function useBudgets() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const query = useQuery({
    queryKey: ["budgets", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase.from("budgets" as never).select("*").order("category");
      if (error) throw error;
      return (data ?? []) as unknown as Budget[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`bg:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "budgets", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["budgets", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  return query;
}