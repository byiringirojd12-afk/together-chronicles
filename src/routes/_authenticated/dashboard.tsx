import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Heart, MessageCircle, Image as ImageIcon, Calendar, Sparkles, Bell, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useCouple, usePartner } from "@/hooks/use-profile";
import { useReminders } from "@/hooks/use-notifications";
import { useMemories } from "@/hooks/use-memories";
import { MemoryMedia } from "@/components/memory-media";
import { useUnreadCount } from "@/hooks/use-chat";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Home — Together+" }] }),
  component: Dashboard,
});

const motivations = [
  "Small daily kindnesses build a lifetime.",
  "Listen with the same care you ask to be heard with.",
  "Tonight, name one thing you're grateful they did this week.",
  "Plans grow stronger when you dream them aloud.",
  "A shared cup of tea is its own kind of love letter.",
];

function daysBetween(date: string) {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function Dashboard() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple(profile?.couple_id);
  const { data: partner } = usePartner(profile?.couple_id, user?.id);
  const { data: reminders } = useReminders();
  const coupleId = profile?.couple_id ?? null;
  const qc = useQueryClient();
  const { memories } = useMemories();
  const unread = useUnreadCount();

  const counts = useQuery({
    queryKey: ["dashboard-counts", coupleId],
    enabled: !!coupleId,
    queryFn: async () => {
      const [mem, msg] = await Promise.all([
        supabase.from("memories").select("*", { count: "exact", head: true }).eq("couple_id", coupleId!),
        supabase.from("messages").select("*", { count: "exact", head: true }).eq("couple_id", coupleId!),
      ]);
      return { memories: mem.count ?? 0, messages: msg.count ?? 0 };
    },
  });

  useEffect(() => {
    if (!coupleId) return;
    const ch = supabase
      .channel(`dashboard:${coupleId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "memories", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["dashboard-counts", coupleId] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `couple_id=eq.${coupleId}` },
        () => qc.invalidateQueries({ queryKey: ["dashboard-counts", coupleId] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [coupleId, qc]);

  const motivation = useMemo(() => motivations[new Date().getDate() % motivations.length], []);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  if (!profile) return null;

  if (!profile.couple_id) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center animate-fade-up">
        <div className="size-16 rounded-full bg-[color:var(--color-gold)]/15 mx-auto flex items-center justify-center mb-4">
          <Heart className="size-7 text-[color:var(--color-gold-deep)]" />
        </div>
        <h1 className="font-serif text-4xl mb-3">Welcome to Together+</h1>
        <p className="text-muted-foreground mb-6">First, pair with your partner so we can prepare your space.</p>
        <Link to="/pair" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-[var(--shadow-glow)] hover:opacity-90 transition-opacity">
          Pair with your partner
        </Link>
      </div>
    );
  }

  const daysTogether = couple?.created_at ? daysBetween(couple.created_at) : 0;
  const anniversaryDays = couple?.anniversary_date ? daysBetween(couple.anniversary_date) : null;
  const upcoming = (reminders ?? []).filter((r) => r.active && new Date(r.due_at).getTime() > Date.now()).slice(0, 3);
  const recentMemories = memories.slice(0, 6);
  const anniversaryMemories = couple?.anniversary_date
    ? memories.filter((m) => {
        const d = new Date(m.memory_date), a = new Date(couple.anniversary_date!);
        return d.getMonth() === a.getMonth() && d.getDate() === a.getDate();
      }).slice(0, 3)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <header className="animate-fade-up">
        <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-deep)] mb-2">{greeting}</p>
        <h1 className="font-serif text-4xl md:text-5xl">
          {profile.display_name ?? "Love"}
          {partner?.display_name && <span className="text-muted-foreground/60"> & {partner.display_name}</span>}
        </h1>
      </header>

      <div className="relative overflow-hidden border border-[color:var(--color-gold)]/30 rounded-2xl p-7 animate-fade-up [animation-delay:60ms] shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-hero)" }}>
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 text-[color:var(--color-gold-deep)] mt-1" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">A thought for today</p>
            <p className="font-serif text-2xl leading-snug">{motivation}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card title="Together for" value={`${daysTogether}`} sub={daysTogether === 1 ? "day" : "days"} icon={Heart} />
        {anniversaryDays !== null && (
          <Card title="Since anniversary" value={`${Math.abs(anniversaryDays)}`} sub="days" icon={Calendar} />
        )}
        <Card title="Memories" value={`${counts.data?.memories ?? 0}`} sub="moments saved" icon={ImageIcon} />
        <Card title="Messages" value={`${counts.data?.messages ?? 0}`} sub="shared" icon={MessageCircle} />
      </div>

      {upcoming.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl">Coming up</h2>
            <Link to="/reminders" className="text-sm text-[color:var(--color-gold-deep)] hover:underline">View all</Link>
          </div>
          <ul className="space-y-2">
            {upcoming.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div className="size-9 rounded-lg bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)] flex items-center justify-center"><Bell className="size-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">In {formatDistanceToNow(new Date(r.due_at))}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentMemories.length > 0 && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-2xl">Recent memories</h2>
            <Link to="/memories" className="text-sm text-[color:var(--color-gold-deep)] hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {recentMemories.map((m) => (
              <Link key={m.id} to="/memories/$id" params={{ id: m.id }} className="aspect-square rounded-xl overflow-hidden bg-secondary group">
                <MemoryMedia url={m.media_type === "video" ? m.video_url : m.image_url} type={m.media_type} alt={m.title ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {anniversaryMemories.length > 0 && (
        <div className="bg-card border border-[color:var(--color-gold)]/40 rounded-2xl p-6 animate-fade-up">
          <h2 className="font-serif text-2xl mb-1">On this day in your story</h2>
          <p className="text-xs text-muted-foreground mb-4">Memories from your anniversary date.</p>
          <div className="grid grid-cols-3 gap-2">
            {anniversaryMemories.map((m) => (
              <Link key={m.id} to="/memories/$id" params={{ id: m.id }} className="aspect-square rounded-xl overflow-hidden bg-secondary">
                <MemoryMedia url={m.image_url} type="image" className="w-full h-full object-cover" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <QuickLink to="/chat" title={unread > 0 ? `${unread} new message${unread === 1 ? "" : "s"}` : "Send a message"} body="Your private chat is one tap away." icon={MessageCircle} />
        <QuickLink to="/memories" title="Add a memory" body="Save a moment from today, big or small." icon={ImageIcon} />
        <QuickLink to="/location" title="See where they are" body="Live location sharing — your call to enable it." icon={MapPin} />
        <QuickLink to="/goals" title="Plan together" body="Set a goal you'll chase as a team." icon={Heart} />
      </div>
    </div>
  );
}

function Card({ title, value, sub, icon: Icon }: { title: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border/60 animate-fade-up">
      <div className="size-10 rounded-xl flex items-center justify-center mb-4 bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)]"><Icon className="size-5" /></div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <p className="font-serif text-3xl leading-none">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

function QuickLink({ to, title, body, icon: Icon }: { to: "/chat" | "/memories" | "/location" | "/goals"; title: string; body: string; icon: React.ElementType }) {
  return (
    <Link to={to} className="group bg-card rounded-2xl p-6 border border-border/60 hover:border-[color:var(--color-gold)]/50 hover:shadow-[var(--shadow-soft)] transition-all flex items-start gap-4 animate-fade-up">
      <div className="size-11 rounded-xl bg-[color:var(--color-gold)]/15 flex items-center justify-center"><Icon className="size-5 text-[color:var(--color-gold-deep)]" /></div>
      <div className="flex-1">
        <h3 className="font-serif text-xl mb-1 group-hover:text-[color:var(--color-gold-deep)] transition-colors">{title}</h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
    </Link>
  );
}