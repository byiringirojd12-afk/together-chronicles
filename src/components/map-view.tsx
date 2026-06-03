import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN as string | undefined;

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string;
  kind?: "me" | "partner" | "place";
}

interface MapViewProps {
  markers: MapMarker[];
  center?: { lat: number; lng: number };
  onMapClick?: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

export function MapView({ markers, center, onMapClick, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clickRef = useRef(onMapClick);
  clickRef.current = onMapClick;

  useEffect(() => {
    if (!TOKEN || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const first = center ?? markers[0] ?? { lat: 0, lng: 0 };
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [first.lng, first.lat],
      zoom: markers.length ? 12 : 2,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (e) => clickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; markerRefs.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const keep = new Set(markers.map((m) => m.id));
    markerRefs.current.forEach((mk, id) => { if (!keep.has(id)) { mk.remove(); markerRefs.current.delete(id); } });
    for (const m of markers) {
      const existing = markerRefs.current.get(m.id);
      if (existing) { existing.setLngLat([m.lng, m.lat]); continue; }
      const el = document.createElement("div");
      el.className = "tp-map-marker";
      el.style.cssText = `width:18px;height:18px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);background:${m.color ?? "#c69b6d"}`;
      const mk = new mapboxgl.Marker({ element: el }).setLngLat([m.lng, m.lat]);
      if (m.label) mk.setPopup(new mapboxgl.Popup({ offset: 16, closeButton: false }).setText(m.label));
      mk.addTo(map);
      markerRefs.current.set(m.id, mk);
    }
    if (markers.length === 1) map.easeTo({ center: [markers[0].lng, markers[0].lat], duration: 600 });
    if (markers.length > 1) {
      const b = new mapboxgl.LngLatBounds();
      markers.forEach((m) => b.extend([m.lng, m.lat]));
      map.fitBounds(b, { padding: 80, maxZoom: 14, duration: 600 });
    }
  }, [markers]);

  if (!TOKEN) {
    return (
      <div className={"flex items-center justify-center bg-secondary/60 border border-border/60 rounded-2xl text-center p-8 " + (className ?? "")}>
        <div className="max-w-sm">
          <p className="font-serif text-2xl mb-2">Map ready</p>
          <p className="text-sm text-muted-foreground">
            Add <code className="px-1.5 py-0.5 rounded bg-background border text-xs">VITE_MAPBOX_PUBLIC_TOKEN</code> in Project Settings → Environment to enable the live map. Location sharing, distance, and arrival/departure events continue to work without it.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={"w-full h-full rounded-2xl overflow-hidden " + (className ?? "")} />;
}