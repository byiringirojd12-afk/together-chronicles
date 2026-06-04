import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useProfile } from "./use-profile";

export interface Memory {
  id: string;
  couple_id: string;
  uploaded_by: string;
  title: string | null;
  caption: string | null;
  image_url: string;
  video_url: string | null;
  thumbnail_url: string | null;
  media_type: "image" | "video";
  category: string | null;
  memory_date: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryFavorite { id: string; memory_id: string; user_id: string }

export function useMemories() {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const list = useQuery({
    queryKey: ["memories", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Memory[]> => {
      const { data, error } = await supabase
        .from("memories").select("*").eq("couple_id", coupleId!)
        .order("memory_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Memory[];
    },
  });

  const favorites = useQuery({
    queryKey: ["memory-favorites", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<MemoryFavorite[]> => {
      const { data, error } = await supabase.from("memory_favorites").select("*").eq("couple_id", coupleId!);
      if (error) throw error;
      return (data ?? []) as MemoryFavorite[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`memories-room:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "memories", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["memories", coupleId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "memory_favorites", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["memory-favorites", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  return { memories: list.data ?? [], favorites: favorites.data ?? [], loading: list.isLoading };
}

export function useMemoryMutations() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Pick<Memory, "title" | "caption" | "category" | "memory_date">> }) => {
      const { error } = await supabase.from("memories").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories", profile?.couple_id] }),
  });

  const remove = useMutation({
    mutationFn: async (mem: Memory) => {
      await supabase.from("memories").delete().eq("id", mem.id);
      const paths = [mem.image_url, mem.video_url].filter(Boolean).map((u) => u!.split("/memories/")[1]).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from("memories").remove(paths);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories", profile?.couple_id] }),
  });

  const toggleFavorite = useMutation({
    mutationFn: async ({ memoryId, isFav }: { memoryId: string; isFav: boolean }) => {
      if (!user || !profile?.couple_id) return;
      if (isFav) {
        await supabase.from("memory_favorites").delete().eq("memory_id", memoryId).eq("user_id", user.id);
      } else {
        await supabase.from("memory_favorites").insert({ memory_id: memoryId, user_id: user.id, couple_id: profile.couple_id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memory-favorites", profile?.couple_id] }),
  });

  async function upload(file: File, fields: { title?: string; caption?: string; category?: string; date: string }) {
    if (!user || !profile?.couple_id) throw new Error("Not paired");
    const isVideo = file.type.startsWith("video/");
    const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
    const path = `${profile.couple_id}/${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("memories").upload(path, file, { contentType: file.type });
    if (upErr) throw upErr;
    // Bucket is private; store the storage path. UI resolves it to a signed URL on demand.
    const storedUrl = `storage://memories/${path}`;
    const row = {
      couple_id: profile.couple_id, uploaded_by: user.id,
      image_url: isVideo ? "" : storedUrl,
      video_url: isVideo ? storedUrl : null,
      media_type: isVideo ? "video" : "image",
      title: fields.title?.trim() || null, caption: fields.caption?.trim() || null,
      category: fields.category || null, memory_date: fields.date,
    };
    const { error } = await supabase.from("memories").insert(row);
    if (error) throw error;
  }

  return { update, remove, toggleFavorite, upload };
}