import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Heart, LayoutDashboard, MessageCircle, Image as ImageIcon, LogOut, Wallet, Target, Calendar as CalendarIcon, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notification-bell";
import { InstallButton } from "@/components/install-button";
import { useUnreadCount } from "@/hooks/use-chat";

const nav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
  { to: "/chat", label: "Chat", icon: MessageCircle },
] as const;

const moreNav = [
  { to: "/memories", label: "Memories", icon: ImageIcon },
  { to: "/location", label: "Location", icon: MapPin },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const unread = useUnreadCount();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border/60 bg-card/50 backdrop-blur">
        <div className="px-6 py-5 flex items-center gap-2">
          <div className="size-9 rounded-full bg-gradient-to-br from-[color:var(--color-gold)] to-[color:var(--color-gold-deep)] flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Heart className="size-4 text-white" fill="currentColor" />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">Together+</span>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}>
                <item.icon className="size-4" /> <span className="flex-1">{item.label}</span>
                {item.to === "/chat" && unread > 0 && <span className="text-[10px] bg-[color:var(--color-gold-deep)] text-white rounded-full px-1.5 py-0.5 min-w-5 text-center">{unread}</span>}
              </Link>
            );
          })}
          {moreNav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}>
                <item.icon className="size-4" /> {item.label}
              </Link>
            );
          })}
          <Link to="/reminders" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", location.pathname.startsWith("/reminders") ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}>
            <Heart className="size-4" /> Reminders
          </Link>
          <Link to="/pair" className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors", location.pathname.startsWith("/pair") ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}>
            <Heart className="size-4" /> Partner
          </Link>
        </nav>
        <div className="p-3 space-y-2">
          <div className="px-1"><InstallButton /></div>
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 md:pl-64 pb-20 md:pb-0 flex flex-col min-h-screen">
        <div className="md:hidden sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border/40 px-4 py-2.5 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-gradient-to-br from-[color:var(--color-gold)] to-[color:var(--color-gold-deep)] flex items-center justify-center">
              <Heart className="size-3.5 text-white" fill="currentColor" />
            </div>
            <span className="font-serif text-lg font-semibold">Together+</span>
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell compact />
          </div>
        </div>
        <div className="hidden md:flex sticky top-0 z-20 bg-background/70 backdrop-blur-md border-b border-border/30 px-6 h-14 items-center justify-end gap-2">
          <InstallButton />
          <NotificationBell />
        </div>
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border/60">
        <div className="grid grid-cols-5">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-[color:var(--color-gold-deep)]" : "text-muted-foreground"
              )}>
                <div className="relative">
                  <item.icon className="size-5" />
                  {item.to === "/chat" && unread > 0 && <span className="absolute -top-1 -right-2 text-[9px] bg-[color:var(--color-gold-deep)] text-white rounded-full px-1 min-w-4 text-center">{unread}</span>}
                </div>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}