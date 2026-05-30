import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useNotifications, usePreferences } from "@/hooks/use-notifications";
import { useWebPush } from "@/hooks/use-push";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Together+" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data, unread, markRead, markAllRead, isLoading } = useNotifications();
  const { data: prefs, update } = usePreferences();
  const push = useWebPush();

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4 animate-fade-up">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--color-gold-deep)] mb-2">Notifications</p>
          <h1 className="font-serif text-4xl md:text-5xl">Everything in one place.</h1>
        </div>
        {unread > 0 && (
          <Button variant="outline" className="gap-2" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        )}
      </header>

      <section className="bg-card border border-border/60 rounded-2xl p-6 animate-fade-up [animation-delay:60ms]">
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-[color:var(--color-gold)]/15 text-[color:var(--color-gold-deep)] flex items-center justify-center">
            <Smartphone className="size-5" />
          </div>
          <div>
            <h2 className="font-serif text-xl">Preferences</h2>
            <p className="text-sm text-muted-foreground">How and when we reach out.</p>
          </div>
        </div>

        <div className="space-y-4">
          <PrefRow
            label="In-app notifications"
            description="See updates from your partner inside Together+"
            checked={prefs?.in_app_enabled ?? true}
            onChange={(v) => update.mutate({ in_app_enabled: v })}
          />
          <PrefRow
            label="Reminder alerts"
            description="Anniversaries, dates, and custom reminders."
            checked={prefs?.reminders_enabled ?? true}
            onChange={(v) => update.mutate({ reminders_enabled: v })}
          />
          <PrefRow
            label="Daily motivation"
            description="A short, kind thought each morning."
            checked={prefs?.daily_motivation_enabled ?? true}
            onChange={(v) => update.mutate({ daily_motivation_enabled: v })}
          />
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label className="text-sm font-medium">Browser push notifications</Label>
                <p className="text-xs text-muted-foreground mt-1 max-w-md">
                  Get notified even when the app is closed. Works best when Together+ is installed to your home screen.
                  {!push.supported && " Your browser doesn't support push notifications."}
                </p>
              </div>
              <Switch
                disabled={!push.supported || push.busy}
                checked={push.subscribed || prefs?.push_enabled || false}
                onCheckedChange={async (v) => {
                  if (v) {
                    const ok = await push.enable();
                    if (ok) { update.mutate({ push_enabled: true }); toast.success("Push enabled"); }
                    else toast.error("Couldn't enable push");
                  } else {
                    await push.disable();
                    update.mutate({ push_enabled: false });
                  }
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="animate-fade-up [animation-delay:120ms]">
        <h2 className="font-serif text-2xl mb-4">Recent</h2>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && (data?.length ?? 0) === 0 && (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/60">
            <Bell className="size-8 mx-auto mb-3 text-muted-foreground/60" />
            <p className="font-serif text-xl">All quiet here.</p>
            <p className="text-sm text-muted-foreground mt-1">New notifications will appear in this list.</p>
          </div>
        )}
        <ul className="space-y-2">
          {(data ?? []).map((n) => (
            <li key={n.id}>
              <button
                onClick={() => !n.read && markRead.mutate(n.id)}
                className={cn(
                  "w-full text-left bg-card border border-border/60 rounded-xl px-4 py-3 flex gap-3 hover:border-[color:var(--color-gold)]/50 transition-colors",
                  !n.read && "bg-[color:var(--color-gold)]/8"
                )}
              >
                <span className={cn("mt-2 size-2 rounded-full shrink-0", !n.read ? "bg-[color:var(--color-gold-deep)]" : "bg-transparent")} />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", !n.read && "font-medium")}>{n.title}</p>
                  {n.body && <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>}
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PrefRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground mt-1 max-w-md">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}