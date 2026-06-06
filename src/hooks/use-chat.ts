import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useProfile } from "./use-profile";

export interface Message {
  id: string;
  couple_id: string;
  sender_id: string;
  content: string | null;
  image_url: string | null;
  reply_to_id: string | null;
  read_at: string | null;
  edited_at: string | null;
  created_at: string;
}

export function useChat() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [partnerOnline, setPartnerOnline] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ["messages", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<Message[]> => {
      const { data, error } = await supabase.from("messages").select("*")
        .eq("couple_id", coupleId!).order("created_at", { ascending: true }).limit(500);
      if (error) throw error;
      return (data ?? []) as Message[];
    },
  });

  // Realtime + presence + typing
  useEffect(() => {
    if (!coupleId || !user) return;
    const ch = supabase.channel(`chat:${coupleId}:${Math.random().toString(36).slice(2)}`, { config: { presence: { key: user.id } } });
    channelRef.current = ch;

    ch.on("postgres_changes",
      { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
      () => qc.invalidateQueries({ queryKey: ["messages", coupleId] }));

    ch.on("broadcast", { event: "typing" }, ({ payload }) => {
      if (payload?.user_id && payload.user_id !== user.id) {
        setPartnerTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setPartnerTyping(false), 2500);
      }
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState();
      const others = Object.keys(state).filter((k) => k !== user.id);
      setPartnerOnline(others.length > 0);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ online_at: Date.now() });
    });

    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [coupleId, user, qc]);

  const sendTyping = useCallback(() => {
    if (!channelRef.current || !user) return;
    channelRef.current.send({ type: "broadcast", event: "typing", payload: { user_id: user.id } });
  }, [user]);

  const send = useMutation({
    mutationFn: async ({ content, imageFile, replyToId }: { content?: string; imageFile?: File | null; replyToId?: string | null }) => {
      if (!user || !coupleId) throw new Error("Not paired");
      let image_url: string | null = null;
      if (imageFile) {
        if (imageFile.size > 10 * 1024 * 1024) throw new Error("Image too large (max 10 MB)");
        const ext = imageFile.name.split(".").pop() ?? "jpg";
        const path = `${coupleId}/${user.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat-media").upload(path, imageFile, { contentType: imageFile.type });
        if (upErr) throw upErr;
        const { data } = await supabase.storage.from("chat-media").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
        image_url = data?.signedUrl ?? null;
      }
      const row = {
        couple_id: coupleId, sender_id: user.id,
        content: content?.trim() || null, image_url, reply_to_id: replyToId ?? null,
      };
      const { error } = await supabase.from("messages").insert(row);
      if (error) throw error;
    },
  });

  // Mark partner messages as read
  const markRead = useCallback(async () => {
    if (!coupleId || !user) return;
    await supabase.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("couple_id", coupleId).neq("sender_id", user.id).is("read_at", null);
  }, [coupleId, user]);

  return {
    messages: query.data ?? [],
    loading: query.isLoading,
    partnerTyping, partnerOnline,
    send, sendTyping, markRead,
  };
}

export function useUnreadCount() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const q = useQuery({
    queryKey: ["unread-messages", coupleId, user?.id],
    enabled: !!coupleId && !!user,
    queryFn: async () => {
      const { count } = await supabase.from("messages")
        .select("*", { count: "exact", head: true })
        .eq("couple_id", coupleId!).neq("sender_id", user!.id).is("read_at", null);
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`unread:${coupleId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["unread-messages", coupleId, user?.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, user, qc]);

  return q.data ?? 0;
}