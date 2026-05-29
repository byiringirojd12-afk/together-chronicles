import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/memories")({
  head: () => ({ meta: [{ title: "Memories — Together+" }] }),
  component: MemoriesPage,
});

interface Memory { id: string; title: string | null; caption: string | null; image_url: string; memory_date: string; uploaded_by: string }

function MemoriesPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!profile?.couple_id) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("memories").select("*").eq("couple_id", profile.couple_id!).order("memory_date", { ascending: false });
      if (!cancelled) { setItems((data as Memory[]) ?? []); setLoading(false); }
    })();

    const ch = supabase.channel(`memories:${profile.couple_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "memories", filter: `couple_id=eq.${profile.couple_id}` },
        (payload) => {
          if (payload.eventType === "INSERT") setItems((m) => [payload.new as Memory, ...m]);
          if (payload.eventType === "DELETE") setItems((m) => m.filter((x) => x.id !== (payload.old as Memory).id));
        })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [profile?.couple_id]);

  async function remove(m: Memory) {
    if (!confirm("Delete this memory?")) return;
    const path = m.image_url.split("/memories/")[1];
    await supabase.from("memories").delete().eq("id", m.id);
    if (path) await supabase.storage.from("memories").remove([path]);
  }

  if (!profile?.couple_id) {
    return (
      <div className="max-w-md mx-auto px-6 py-20 text-center">
        <h1 className="font-serif text-3xl mb-2">Pair first</h1>
        <p className="text-muted-foreground mb-4">Save memories together once you're paired.</p>
        <Link to="/pair" className="text-primary font-medium underline-offset-4 hover:underline">Go to pairing →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-8 animate-fade-up">
        <div>
          <h1 className="font-serif text-4xl mb-1">Memories</h1>
          <p className="text-muted-foreground">Moments worth keeping.</p>
        </div>
        <Button onClick={() => setAdding(true)} className="gap-2"><Plus className="size-4" /> Add</Button>
      </div>

      {adding && user && profile.couple_id && (
        <AddMemory coupleId={profile.couple_id} userId={user.id} onClose={() => setAdding(false)} />
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-serif text-2xl mb-1">Your vault is empty.</p>
          <p className="text-sm">Add your first memory above.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((m) => (
            <article key={m.id} className="group bg-card rounded-2xl overflow-hidden border border-border/60 animate-fade-up">
              <div className="aspect-square overflow-hidden bg-secondary">
                <img src={m.image_url} alt={m.title ?? "Memory"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {m.title && <h3 className="font-serif text-lg truncate">{m.title}</h3>}
                    <p className="text-xs text-muted-foreground">{new Date(m.memory_date).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</p>
                  </div>
                  {m.uploaded_by === user?.id && (
                    <button onClick={() => remove(m)} className="text-muted-foreground hover:text-destructive p-1 -m-1"><Trash2 className="size-4" /></button>
                  )}
                </div>
                {m.caption && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{m.caption}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemory({ coupleId, userId, onClose }: { coupleId: string; userId: string; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a photo");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10 MB");
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("memories").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("memories").getPublicUrl(path);
      const { error } = await supabase.from("memories").insert({
        couple_id: coupleId, uploaded_by: userId, image_url: publicUrl,
        title: title.trim() || null, caption: caption.trim() || null, memory_date: date,
      });
      if (error) throw error;
      toast.success("Memory saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="bg-card border border-border/60 rounded-2xl p-6 mb-6 space-y-4 animate-fade-up shadow-[var(--shadow-soft)]">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="photo">Photo</Label>
          <Input id="photo" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title (optional)</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="A sunset, a small win…" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="caption">Caption (optional)</Label>
        <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={3} />
      </div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin mr-2" />} Save memory</Button>
      </div>
    </form>
  );
}