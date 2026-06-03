import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, Home, Briefcase, Plus, Trash2, Pause, Play, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MapView, type MapMarker } from "@/components/map-view";
import {
  useLiveLocations, useLocationSettings, useSavedPlaces,
  useGeolocationWatcher, useLocationEvents, formatDistance,
} from "@/hooks/use-location";
import { useProfile, usePartner } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/location")({
  head: () => ({ meta: [{ title: "Location — Together+" }] }),
  component: LocationPage,
});

function LocationPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: partner } = usePartner(profile?.couple_id, user?.id);
  const { settings, update } = useLocationSettings();
  const { me, partner: partnerLoc, distance } = useLiveLocations();
  const { places, add, remove } = useSavedPlaces();
  const { active, error } = useGeolocationWatcher();
  const events = useLocationEvents(10);
  const [addingPlace, setAddingPlace] = useState<{ lat: number; lng: number } | null>(null);
  const [placeName, setPlaceName] = useState("");
  const [placeKind, setPlaceKind] = useState<"home" | "work" | "custom">("custom");

  if (!profile?.couple_id) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl mb-2">Pair first</h1>
        <p className="text-muted-foreground mb-4">Share location once you're connected.</p>
        <Link to="/pair" className="text-primary font-medium underline-offset-4 hover:underline">Go to pairing →</Link>
      </div>
    );
  }

  const markers: MapMarker[] = [];
  if (me) markers.push({ id: "me", lat: me.lat, lng: me.lng, color: "#c69b6d", label: "You" });
  if (partnerLoc) markers.push({ id: "partner", lat: partnerLoc.lat, lng: partnerLoc.lng, color: "#8b5e3c", label: partner?.display_name ?? "Partner" });
  for (const p of places) markers.push({ id: p.id, lat: p.lat, lng: p.lng, color: "#94a3b8", label: p.name, kind: "place" });

  function setMode(mode: "until_off" | "timed" | "paused", hours?: number) {
    update.mutate({
      sharing_enabled: mode !== "paused" ? true : settings?.sharing_enabled ?? true,
      share_mode: mode,
      share_until: mode === "timed" && hours ? new Date(Date.now() + hours * 3600_000).toISOString() : null,
    });
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <header className="flex items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-serif text-4xl mb-1">Location</h1>
          <p className="text-muted-foreground">{active ? "Sharing in real time" : "Sharing is off"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="share-toggle" className="text-sm text-muted-foreground">Share</Label>
          <Switch id="share-toggle" checked={!!settings?.sharing_enabled}
            onCheckedChange={(v) => update.mutate({ sharing_enabled: v, share_mode: v ? "until_off" : "paused" })} />
        </div>
      </header>

      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-card border border-border/60 rounded-2xl p-1 h-[460px] overflow-hidden">
          <MapView markers={markers} onMapClick={(c) => setAddingPlace(c)} className="h-full" />
        </div>

        <div className="space-y-4">
          <div className="bg-card border border-border/60 rounded-2xl p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Distance apart</p>
            <p className="font-serif text-3xl">{distance != null ? formatDistance(distance) : "—"}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {partnerLoc ? `${partner?.display_name ?? "Partner"} updated ${formatDistanceToNow(new Date(partnerLoc.updated_at))} ago` : "Partner is not sharing"}
            </p>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Sharing mode</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant={settings?.share_mode === "until_off" ? "default" : "outline"} size="sm" onClick={() => setMode("until_off")}><Play className="size-3.5" /> Until I stop</Button>
              <Button variant={settings?.share_mode === "paused" ? "default" : "outline"} size="sm" onClick={() => setMode("paused")}><Pause className="size-3.5" /> Pause</Button>
              <Button variant="outline" size="sm" onClick={() => setMode("timed", 1)}>1 hour</Button>
              <Button variant="outline" size="sm" onClick={() => setMode("timed", 8)}>8 hours</Button>
            </div>
            {settings?.share_until && <p className="text-xs text-muted-foreground">Until {new Date(settings.share_until).toLocaleString()}</p>}
            <div className="pt-2 border-t border-border/40 space-y-2">
              <label className="flex items-center justify-between text-sm">
                <span>Notify partner on arrival</span>
                <Switch checked={!!settings?.arrival_notify} onCheckedChange={(v) => update.mutate({ arrival_notify: v })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                <span>Notify partner on departure</span>
                <Switch checked={!!settings?.departure_notify} onCheckedChange={(v) => update.mutate({ departure_notify: v })} />
              </label>
            </div>
          </div>
        </div>
      </div>

      {addingPlace && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!placeName.trim()) return toast.error("Name required");
            add.mutate({ name: placeName.trim(), kind: placeKind, lat: addingPlace.lat, lng: addingPlace.lng });
            setPlaceName(""); setPlaceKind("custom"); setAddingPlace(null);
          }}
          className="bg-card border border-border/60 rounded-2xl p-5 flex flex-wrap gap-3 items-end animate-fade-up"
        >
          <div className="flex-1 min-w-[180px]"><Label>Name</Label><Input value={placeName} onChange={(e) => setPlaceName(e.target.value)} maxLength={50} required /></div>
          <div>
            <Label>Type</Label>
            <div className="flex gap-1 mt-1">
              {(["home", "work", "custom"] as const).map((k) => (
                <Button key={k} type="button" size="sm" variant={placeKind === k ? "default" : "outline"} onClick={() => setPlaceKind(k)}>{k}</Button>
              ))}
            </div>
          </div>
          <Button type="submit" size="sm">Save place</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAddingPlace(null)}><X className="size-4" /></Button>
        </form>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-card border border-border/60 rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Saved places</h2>
          <p className="text-xs text-muted-foreground mb-3">Tap the map to add a place. We'll notify you when either of you arrives or leaves.</p>
          {places.length === 0 ? (
            <p className="text-sm text-muted-foreground">No places saved yet.</p>
          ) : (
            <ul className="space-y-2">
              {places.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className="size-9 rounded-lg bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)] flex items-center justify-center">
                    {p.kind === "home" ? <Home className="size-4" /> : p.kind === "work" ? <Briefcase className="size-4" /> : <MapPin className="size-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.radius_m} m radius</p>
                  </div>
                  <button onClick={() => remove.mutate(p.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="bg-card border border-border/60 rounded-2xl p-6">
          <h2 className="font-serif text-2xl mb-4">Recent arrivals</h2>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No arrival or departure events yet.</p>
          ) : (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                  <div className="size-9 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center"><MapPin className="size-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm"><span className="font-medium">{e.user_id === user?.id ? "You" : partner?.display_name ?? "Partner"}</span> {e.event_type === "arrival" ? "arrived at" : "left"} {e.place_name}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.occurred_at))} ago</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}