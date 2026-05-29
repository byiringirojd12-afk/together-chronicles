import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, usePartner } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — Together+" }] }),
  component: ChatPage,
});

interface Message { id: string; sender_id: string; content: string; created_at: string; couple_id: string }

function ChatPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: partner } = usePartner(profile?.couple_id, user?.id);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.couple_id) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.from("messages")
        .select("*").eq("couple_id", profile.couple_id!).order("created_at", { ascending: true }).limit(200);
      if (!cancelled) {
        if (!error && data) setMessages(data as Message[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`messages:${profile.couple_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `couple_id=eq.${profile.couple_id}` },
        (payload) => setMessages((m) => [...m, payload.new as Message])
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [profile?.couple_id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !profile?.couple_id || !user) return;
    setSending(true);
    const content = draft.trim().slice(0, 2000);
    setDraft("");
    const { error } = await supabase.from("messages").insert({ content, sender_id: user.id, couple_id: profile.couple_id });
    if (error) setDraft(content);
    setSending(false);
  }

  if (!profile?.couple_id) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl mb-2">Pair first</h1>
        <p className="text-muted-foreground mb-4">Chat opens once you and your partner are connected.</p>
        <Link to="/pair" className="text-primary font-medium underline-offset-4 hover:underline">Go to pairing →</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] md:h-screen max-w-3xl mx-auto">
      <header className="px-6 py-4 border-b border-border/60 bg-card/50 backdrop-blur">
        <h1 className="font-serif text-2xl">{partner?.display_name ?? "Your chat"}</h1>
        <p className="text-xs text-muted-foreground">Just the two of you · Real-time</p>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p className="font-serif text-xl">Nothing here yet.</p>
            <p className="text-sm mt-1">Say something sweet.</p>
          </div>
        ) : messages.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed animate-fade-up ${
                mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="px-4 py-3 border-t border-border/60 bg-card/50 backdrop-blur flex gap-2">
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={2000}
          placeholder="Write a message…"
          className="flex-1 px-4 py-2.5 rounded-full bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="icon" disabled={sending || !draft.trim()} className="rounded-full size-10">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  );
}