import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Send, Loader2, ImagePlus, X, Reply, Search, Check, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, usePartner } from "@/hooks/use-profile";
import { useChat, type Message } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "Chat — Together+" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: partner } = usePartner(profile?.couple_id, user?.id);
  const { messages, loading, partnerTyping, partnerOnline, send, sendTyping, markRead } = useChat();
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  useEffect(() => { if (messages.length) markRead(); }, [messages.length, markRead]);

  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return messages;
    return messages.filter((m) => (m.content ?? "").toLowerCase().includes(needle));
  }, [messages, q]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((!draft.trim() && !file) || !profile?.couple_id) return;
    const content = draft.trim().slice(0, 2000);
    setDraft(""); const f = file; setFile(null); const reply = replyTo; setReplyTo(null);
    try {
      await send.mutateAsync({ content, imageFile: f, replyToId: reply?.id ?? null });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
      setDraft(content); setFile(f); setReplyTo(reply);
    }
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
      <header className="px-6 py-4 border-b border-border/60 bg-card/50 backdrop-blur flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl truncate">{partner?.display_name ?? "Your chat"}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className={"size-2 rounded-full " + (partnerOnline ? "bg-emerald-500" : "bg-muted-foreground/40")} />
            {partnerOnline ? "Online" : "Offline"} · Real-time
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSearchOpen((v) => !v)}><Search className="size-4" /></Button>
      </header>

      {searchOpen && (
        <div className="px-4 py-2 border-b border-border/40 bg-card/30">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages…" />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
        {loading ? (
          <div className="flex justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p className="font-serif text-xl">{q ? "Nothing matches." : "Nothing here yet."}</p>
            {!q && <p className="text-sm mt-1">Say something sweet.</p>}
          </div>
        ) : visible.map((m) => {
          const mine = m.sender_id === user?.id;
          const reply = m.reply_to_id ? byId.get(m.reply_to_id) : null;
          const isLastMine = mine && m.id === [...visible].reverse().find((x) => x.sender_id === user?.id)?.id;
          return (
            <div key={m.id} className={`flex group ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[78%]">
                {reply && (
                  <div className={`text-[11px] mb-1 px-3 py-1.5 rounded-lg border-l-2 border-[color:var(--color-gold)] bg-secondary/60 truncate ${mine ? "ml-auto text-right" : ""}`}>
                    <span className="text-muted-foreground">Replying to: </span>
                    {reply.content ?? "Photo"}
                  </div>
                )}
                <div className={`relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed animate-fade-up ${
                  mine ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}>
                  {m.image_url && <img src={m.image_url} alt="" className="rounded-lg max-h-72 mb-2 cursor-pointer" onClick={() => window.open(m.image_url!, "_blank")} />}
                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                  <div className={`text-[10px] mt-1 flex items-center gap-1 ${mine ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {mine && isLastMine && (m.read_at ? <CheckCheck className="size-3" /> : <Check className="size-3" />)}
                  </div>
                  <button onClick={() => setReplyTo(m)} className="absolute -top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-background border border-border rounded-full p-1 shadow-sm" style={{ [mine ? "left" : "right"]: -28 } as React.CSSProperties}>
                    <Reply className="size-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground px-4 py-2 rounded-2xl rounded-bl-md text-sm flex gap-1 items-center">
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:120ms]" />
              <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:240ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {(replyTo || file) && (
        <div className="px-4 py-2 border-t border-border/40 bg-card/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            {replyTo && <span className="truncate"><Reply className="size-3 inline mr-1" />Replying to: {replyTo.content ?? "Photo"}</span>}
            {file && <span className="truncate"><ImagePlus className="size-3 inline mr-1" />{file.name}</span>}
          </div>
          <button onClick={() => { setReplyTo(null); setFile(null); }}><X className="size-4" /></button>
        </div>
      )}

      <form onSubmit={submit} className="px-4 py-3 border-t border-border/60 bg-card/50 backdrop-blur flex gap-2 items-center">
        <label className="cursor-pointer text-muted-foreground hover:text-foreground p-2">
          <ImagePlus className="size-5" />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); sendTyping(); }}
          maxLength={2000}
          placeholder="Write a message…"
          className="flex-1 px-4 py-2.5 rounded-full bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="icon" disabled={send.isPending || (!draft.trim() && !file)} className="rounded-full size-10">
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}