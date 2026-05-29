import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Heart, LayoutDashboard, MessageCircle, Image as ImageIcon, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/memories", label: "Memories", icon: ImageIcon },
  { to: "/pair", label: "Partner", icon: Users },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-border/60 bg-card/50 backdrop-blur">
        <div className="px-6 py-5 flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Heart className="size-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-serif text-xl font-semibold">Together+</span>
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
                <item.icon className="size-4" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3">
          <button onClick={signOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 md:pl-64 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border/60">
        <div className="grid grid-cols-4">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            return (
              <Link key={item.to} to={item.to} className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="size-5" /> {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}