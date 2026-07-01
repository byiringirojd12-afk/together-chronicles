import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  couple_id: string | null;
  invite_code: string;
}

export interface Couple {
  id: string;
  name: string | null;
  anniversary_date: string | null;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

export function useCouple(coupleId: string | null | undefined) {
  return useQuery({
    queryKey: ["couple", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Couple | null> => {
      if (!coupleId) return null;
      const { data, error } = await supabase.from("couples").select("*").eq("id", coupleId).maybeSingle();
      if (error) throw error;
      return data as Couple | null;
    },
  });
}

export function usePartner(coupleId: string | null | undefined, selfId: string | undefined) {
  return useQuery({
    queryKey: ["partner", coupleId, selfId],
    enabled: !!coupleId && !!selfId,
    refetchInterval: (q) => (q.state.data ? false : 5000),
    queryFn: async (): Promise<Profile | null> => {
      if (!coupleId || !selfId) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("couple_id", coupleId).neq("id", selfId).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}