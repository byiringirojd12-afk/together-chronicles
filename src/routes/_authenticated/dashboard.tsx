import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Heart, MessageCircle, Image as ImageIcon, Calendar, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useCouple, usePartner } from "@/hooks/use-profile";

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

  const motivation = useMemo(() => motivations[new Date().getDate() % motivations.length], []);
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  if (!profile) return null;

  if (!profile.couple_id) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center animate-fade-up">
        <div className="size-16 rounded-full bg-[color:var(--color-clay)]/15 mx-auto flex items-center justify-center mb-4">
          <Heart className="size-7 text-[color:var(--color-clay)]" />
        </div>
        <h1 className="font-serif text-4xl mb-3">Welcome to Together+</h1>
        <p className="text-muted-foreground mb-6">First, pair with your partner so we can prepare your space.</p>
        <Link to="/pair" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium shadow-[var(--shadow-soft)] hover:opacity-90 transition-opacity">
          Pair with your partner
        </Link>
      </div>
    );
  }

  const daysTogether = couple?.created_at ? daysBetween(couple.created_at) : 0;
  const anniversaryDays = couple?.anniversary_date ? daysBetween(couple.anniversary_date) : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <header className="animate-fade-up">
        <p className="text-muted-foreground text-sm">{greeting},</p>
        <h1 className="font-serif text-4xl md:text-5xl">{profile.display_name ?? "love"}.</h1>
      </header>

      <div className="bg-[var(--gradient-hero)] border border-border/40 rounded-2xl p-7 animate-fade-up [animation-delay:60ms] shadow-[var(--shadow-soft)]">
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 text-[color:var(--color-clay)] mt-1" />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">A thought for today</p>
            <p className="font-serif text-2xl leading-snug">{motivation}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card title="Together for" value={`${daysTogether} ${daysTogether === 1 ? "day" : "days"}`} icon={Heart} color="sage" />
        {anniversaryDays !== null && (
          <Card title="Since your anniversary" value={`${Math.abs(anniversaryDays)} days`} icon={Calendar} color="clay" />
        )}
        <Card title="Your partner" value={partner?.display_name ?? "Waiting…"} icon={Heart} color="sage" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <QuickLink to="/chat" title="Send a message" body="Your private chat is one tap away." icon={MessageCircle} />
        <QuickLink to="/memories" title="Add a memory" body="Save a moment from today, big or small." icon={ImageIcon} />
      </div>
    </div>
  );
}

function Card({ title, value, icon: Icon, color }: { title: string; value: string; icon: React.ElementType; color: "sage" | "clay" }) {
  const bg = color === "sage" ? "bg-[color:var(--color-sage)]/15 text-[color:var(--color-sage-deep)]" : "bg-[color:var(--color-clay)]/15 text-[color:var(--color-clay)]";
  return (
    <div className="bg-card rounded-2xl p-6 border border-border/60 animate-fade-up">
      <div className={`size-10 rounded-xl flex items-center justify-center mb-4 ${bg}`}><Icon className="size-5" /></div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  );
}

function QuickLink({ to, title, body, icon: Icon }: { to: "/chat" | "/memories"; title: string; body: string; icon: React.ElementType }) {
  return (
    <Link to={to} className="group bg-card rounded-2xl p-6 border border-border/60 hover:shadow-[var(--shadow-soft)] transition-shadow flex items-start gap-4 animate-fade-up">
      <div className="size-11 rounded-xl bg-secondary flex items-center justify-center"><Icon className="size-5 text-secondary-foreground" /></div>
      <div className="flex-1">
        <h3 className="font-serif text-xl mb-1 group-hover:text-[color:var(--color-clay)] transition-colors">{title}</h3>
        <p className="text-muted-foreground text-sm">{body}</p>
      </div>
    </Link>
  );
}