import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const { data, unread, markRead, markAllRead } = useNotifications();
  const items = data ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className={cn(
            "relative inline-flex items-center justify-center rounded-xl transition-colors hover:bg-secondary/60",
            compact ? "size-9" : "size-10"
          )}
        >
          <Bell className="size-5 text-foreground/70" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-4 h-4 px-1 rounded-full bg-[color:var(--color-gold-deep)] text-[10px] font-semibold text-white flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-border/60">
          <p className="font-serif text-lg">Notifications</p>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">No notifications yet.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex gap-3 hover:bg-secondary/40 transition-colors",
                      !n.read && "bg-[color:var(--color-gold)]/8"
                    )}
                  >
                    <span className={cn("mt-1.5 size-2 rounded-full shrink-0", !n.read ? "bg-[color:var(--color-gold-deep)]" : "bg-transparent")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-snug", !n.read && "font-medium")}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}