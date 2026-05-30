import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Full-screen luxury wedding loading splash.
 * Resolves couple names dynamically from the database when a session exists,
 * otherwise shows the Together+ brand.
 */
export function LoadingScreen({ onDone, minMs = 1400 }: { onDone?: () => void; minMs?: number }) {
  const [names, setNames] = useState<{ a?: string; b?: string } | null>(null);
  const [resolved, setResolved] = useState(false);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData.session?.user;
        if (!user) { if (!cancelled) setResolved(true); return; }
        const { data: prof } = await supabase.from("profiles").select("display_name, couple_id").eq("id", user.id).maybeSingle();
        if (!prof?.couple_id) { if (!cancelled) { setNames({ a: prof?.display_name ?? undefined }); setResolved(true); } return; }
        const { data: partners } = await supabase
          .from("profiles")
          .select("id, display_name")
          .eq("couple_id", prof.couple_id)
          .limit(2);
        if (cancelled) return;
        const self = partners?.find((p) => p.id === user.id)?.display_name ?? prof.display_name ?? undefined;
        const other = partners?.find((p) => p.id !== user.id)?.display_name ?? undefined;
        setNames({ a: self, b: other });
        setResolved(true);
      } catch {
        if (!cancelled) setResolved(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => {
      setProgress((p) => Math.min(p + Math.random() * 14, resolved ? 100 : 92));
    }, 180);
    const finish = () => {
      const elapsed = Date.now() - start;
      setTimeout(() => onDone?.(), Math.max(0, minMs - elapsed));
    };
    if (resolved) {
      setTimeout(finish, 400);
    }
    return () => clearInterval(t);
  }, [resolved, onDone, minMs]);

  const title = names?.a && names?.b
    ? `${names.a} ❤ ${names.b}`
    : names?.a
      ? names.a
      : "Together+";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[color:var(--color-cream)] overflow-hidden">
      <GeometricBackdrop />
      <div className="relative z-10 text-center px-6 animate-fade-in">
        <div className="mx-auto mb-7 size-20 rounded-full flex items-center justify-center border border-[color:var(--color-gold)]/40 bg-white/40 backdrop-blur-sm shadow-[var(--shadow-glow)]">
          <svg viewBox="0 0 32 32" className="size-10 animate-heart-pulse text-[color:var(--color-gold-deep)]" fill="currentColor" aria-hidden>
            <path d="M23.6 4c-2.5 0-4.9 1.2-6.4 3.1-.4.5-1.2.5-1.6 0C14.1 5.2 11.7 4 9.2 4 5.2 4 2 7.2 2 11.2c0 7.6 13.3 16.1 13.9 16.5.4.2.8.2 1.2 0C17.7 27.3 31 18.8 31 11.2 31 7.2 27.6 4 23.6 4z"/>
          </svg>
        </div>
        <p className="text-xs uppercase tracking-[0.4em] text-[color:var(--color-gold-deep)] mb-3">In the name of love</p>
        <h1 className="font-serif text-4xl md:text-5xl text-foreground/90 max-w-md mx-auto leading-tight">
          {title}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground italic">A sanctuary for two</p>
        <div className="mt-10 mx-auto w-56 h-[2px] bg-[color:var(--color-gold)]/15 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-[color:var(--color-gold)] to-transparent transition-[width] duration-300 ease-out"
               style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}

function GeometricBackdrop() {
  // Subtle Islamic eight-point star tile, repeated.
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.07]" aria-hidden>
      <defs>
        <pattern id="star-tile" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="oklch(0.58 0.12 75)" strokeWidth="0.8">
            <polygon points="60,10 70,50 110,60 70,70 60,110 50,70 10,60 50,50" />
            <polygon points="60,20 66,54 100,60 66,66 60,100 54,66 20,60 54,54" transform="rotate(22.5 60 60)" />
            <circle cx="60" cy="60" r="34" />
          </g>
        </pattern>
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="oklch(0.95 0.04 80 / 0.6)" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#star-tile)" />
      <rect width="100%" height="100%" fill="url(#vignette)" />
    </svg>
  );
}