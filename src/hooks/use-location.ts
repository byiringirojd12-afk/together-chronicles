import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useProfile } from "./use-profile";

export interface LocationSettings {
  user_id: string;
  sharing_enabled: boolean;
  share_mode: "until_off" | "timed" | "paused";
  share_until: string | null;
  arrival_notify: boolean;
  departure_notify: boolean;
}
export interface LiveLocation {
  user_id: string; couple_id: string;
  lat: number; lng: number; accuracy: number | null;
  updated_at: string;
}
export interface SavedPlace {
  id: string; couple_id: string; created_by: string;
  name: string; kind: "home" | "work" | "custom";
  lat: number; lng: number; radius_m: number;
}
export interface LocationEvent {
  id: string; couple_id: string; user_id: string;
  place_id: string | null; place_name: string | null;
  event_type: "arrival" | "departure"; occurred_at: string;
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
export function formatDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

export function useLocationSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["location-settings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LocationSettings | null> => {
      const { data } = await supabase.from("location_settings").select("*").eq("user_id", user!.id).maybeSingle();
      if (!data) {
        const ins = await supabase.from("location_settings").insert({ user_id: user!.id }).select("*").single();
        return (ins.data ?? null) as LocationSettings | null;
      }
      return data as LocationSettings;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<LocationSettings>) => {
      if (!user) return;
      const { error } = await supabase.from("location_settings").update(patch).eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["location-settings", user?.id] }),
  });

  return { settings: q.data ?? null, loading: q.isLoading, update };
}

export function useLiveLocations() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const q = useQuery({
    queryKey: ["locations", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<LiveLocation[]> => {
      const { data } = await supabase.from("locations").select("*").eq("couple_id", coupleId!);
      return (data ?? []) as LiveLocation[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`loc:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "locations", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["locations", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  const me = q.data?.find((l) => l.user_id === user?.id) ?? null;
  const partner = q.data?.find((l) => l.user_id !== user?.id) ?? null;
  const distance = me && partner ? haversineM(me, partner) : null;

  return { me, partner, distance, all: q.data ?? [] };
}

export function useSavedPlaces() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const q = useQuery({
    queryKey: ["saved-places", coupleId],
    enabled: !!coupleId,
    queryFn: async (): Promise<SavedPlace[]> => {
      const { data } = await supabase.from("saved_places").select("*").eq("couple_id", coupleId!).order("created_at");
      return (data ?? []) as SavedPlace[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`places:${coupleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "saved_places", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["saved-places", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  const add = useMutation({
    mutationFn: async (input: { name: string; kind: SavedPlace["kind"]; lat: number; lng: number; radius_m?: number }) => {
      if (!user || !coupleId) return;
      const { error } = await supabase.from("saved_places").insert({
        couple_id: coupleId, created_by: user.id,
        name: input.name, kind: input.kind, lat: input.lat, lng: input.lng,
        radius_m: input.radius_m ?? 150,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-places", coupleId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await supabase.from("saved_places").delete().eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-places", coupleId] }),
  });

  return { places: q.data ?? [], add, remove };
}

/**
 * Watches geolocation while sharing is enabled and writes to public.locations.
 * Detects arrival/departure for saved places and writes location_events + notification for partner.
 */
export function useGeolocationWatcher() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { settings } = useLocationSettings();
  const { places } = useSavedPlaces();
  const [error, setError] = useState<string | null>(null);
  const insideRef = useRef<Set<string>>(new Set());
  const partnerIdRef = useRef<string | null>(null);

  const active = !!(settings?.sharing_enabled && settings.share_mode !== "paused" &&
    (!settings.share_until || new Date(settings.share_until).getTime() > Date.now()));

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!profile?.couple_id || !user) return;
      const { data } = await supabase.from("profiles").select("id").eq("couple_id", profile.couple_id).neq("id", user.id).maybeSingle();
      if (!cancel) partnerIdRef.current = data?.id ?? null;
    })();
    return () => { cancel = true; };
  }, [profile?.couple_id, user]);

  useEffect(() => {
    if (!active || !user || !profile?.couple_id) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      return;
    }
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        setError(null);
        const { latitude, longitude, accuracy, heading, speed } = pos.coords;
        await supabase.from("locations").upsert({
          user_id: user.id, couple_id: profile.couple_id!,
          lat: latitude, lng: longitude, accuracy, heading, speed,
          updated_at: new Date().toISOString(),
        });
        // Geofence detection
        for (const p of places) {
          const inside = insideRef.current.has(p.id);
          const dist = Math.round(haversineM({ lat: latitude, lng: longitude }, { lat: p.lat, lng: p.lng }));
          const nowInside = dist <= p.radius_m;
          if (nowInside && !inside) {
            insideRef.current.add(p.id);
            if (settings?.arrival_notify) await emitEvent(user.id, profile.couple_id!, p, "arrival", partnerIdRef.current);
          } else if (!nowInside && inside) {
            insideRef.current.delete(p.id);
            if (settings?.departure_notify) await emitEvent(user.id, profile.couple_id!, p, "departure", partnerIdRef.current);
          }
        }
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [active, user, profile?.couple_id, places, settings?.arrival_notify, settings?.departure_notify]);

  return { active, error };
}

async function emitEvent(userId: string, coupleId: string, place: SavedPlace, type: "arrival" | "departure", partnerId: string | null) {
  await supabase.from("location_events").insert({
    user_id: userId, couple_id: coupleId,
    place_id: place.id, place_name: place.name, event_type: type,
  });
  if (partnerId) {
    await supabase.from("notifications").insert({
      user_id: partnerId,
      title: type === "arrival" ? `Arrived at ${place.name}` : `Left ${place.name}`,
      body: null, type: "location",
    });
  }
}

export function useLocationEvents(limit = 20) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const coupleId = profile?.couple_id ?? null;

  const q = useQuery({
    queryKey: ["location-events", coupleId, limit],
    enabled: !!coupleId,
    queryFn: async (): Promise<LocationEvent[]> => {
      const { data } = await supabase.from("location_events").select("*")
        .eq("couple_id", coupleId!).order("occurred_at", { ascending: false }).limit(limit);
      return (data ?? []) as LocationEvent[];
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase.channel(`evt:${coupleId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_events", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["location-events", coupleId, limit] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc, limit]);

  return q.data ?? [];
}