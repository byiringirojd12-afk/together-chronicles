import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2, Plus, Heart, Play, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { useMemories, useMemoryMutations } from "@/hooks/use-memories";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/memories/")({
  head: () => ({ meta: [{ title: "Memories — Together+" }] }),
  component: MemoriesPage,
});

function MemoriesPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { memories, favorites, loading } = useMemories();
  const { toggleFavorite } = useMemoryMutations();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);
  const [adding, setAdding] = useState(false);

  const categories = useMemo(() => Array.from(new Set(memories.map((m) => m.category).filter(Boolean) as string[])), [memories]);
  const favSet = useMemo(() => new Set(favorites.filter((f) => f.user_id === user?.id).map((f) => f.memory_id)), [favorites, user]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return memories.filter((m) => {
      if (favOnly && !favSet.has(m.id)) return false;
      if (category !== "all" && m.category !== category) return false;
      if (!needle) return true;
      return (m.title ?? "").toLowerCase().includes(needle) || (m.caption ?? "").toLowerCase().includes(needle) || (m.category ?? "").toLowerCase().includes(needle);
    });
  }, [memories, q, category, favOnly, favSet]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const m of filtered) {
      const key = new Date(m.memory_date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
      const arr = map.get(key) ?? []; arr.push(m); map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

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
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      <div className="flex items-end justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="font-serif text-4xl mb-1">Memories</h1>
          <p className="text-muted-foreground">{memories.length} {memories.length === 1 ? "moment" : "moments"} kept</p>
        </div>
        <Button onClick={() => setAdding(true)} className="gap-2"><Plus className="size-4" /> Add</Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, caption, category…" className="pl-9" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button variant={favOnly ? "default" : "outline"} size="sm" onClick={() => setFavOnly((v) => !v)} className="gap-1.5">
          <Heart className={"size-3.5 " + (favOnly ? "fill-current" : "")} /> Favorites
        </Button>
      </div>

      {adding && user && profile.couple_id && <AddMemory onClose={() => setAdding(false)} />}

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : grouped.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <p className="font-serif text-2xl mb-1">{memories.length === 0 ? "Your vault is empty." : "No matches."}</p>
          <p className="text-sm">{memories.length === 0 ? "Add your first memory above." : "Try a different search."}</p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map(([month, items]) => (
            <section key={month}>
              <h2 className="font-serif text-2xl mb-4 text-muted-foreground">{month}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((m) => {
                  const isFav = favSet.has(m.id);
                  return (
                    <Link to="/memories/$id" params={{ id: m.id }} key={m.id} className="group bg-card rounded-2xl overflow-hidden border border-border/60 animate-fade-up hover:border-[color:var(--color-gold)]/40 transition-colors">
                      <div className="relative aspect-square overflow-hidden bg-secondary">
                        {m.media_type === "video" ? (
                          <>
                            <video src={m.video_url ?? undefined} className="w-full h-full object-cover" preload="metadata" muted playsInline />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="size-10 text-white drop-shadow" fill="currentColor" /></div>
                          </>
                        ) : (
                          <img src={m.image_url} alt={m.title ?? "Memory"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                        )}
                        <button
                          onClick={(e) => { e.preventDefault(); toggleFavorite.mutate({ memoryId: m.id, isFav }); }}
                          className="absolute top-2 right-2 size-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Heart className={"size-4 " + (isFav ? "fill-[color:var(--color-gold-deep)] text-[color:var(--color-gold-deep)]" : "text-foreground")} />
                        </button>
                      </div>
                      <div className="p-4">
                        {m.title && <h3 className="font-serif text-lg truncate">{m.title}</h3>}
                        <p className="text-xs text-muted-foreground">{new Date(m.memory_date).toLocaleDateString(undefined, { month: "long", day: "numeric" })}{m.category ? ` · ${m.category}` : ""}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function AddMemory({ onClose }: { onClose: () => void }) {
  const { upload } = useMemoryMutations();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return toast.error("Choose a photo or video");
    const limit = file.type.startsWith("video/") ? 100 : 10;
    if (file.size > limit * 1024 * 1024) return toast.error(`Max ${limit} MB`);
    setBusy(true);
    try {
      await upload(file, { title, caption, category: category.trim() || undefined, date });
      toast.success("Memory saved");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 animate-fade-up shadow-[var(--shadow-soft)]">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><Label htmlFor="photo">Photo or video</Label><Input id="photo" type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></div>
        <div><Label htmlFor="date">Date</Label><Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></div>
        <div><Label htmlFor="title">Title (optional)</Label><Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></div>
        <div><Label htmlFor="cat">Category (optional)</Label><Input id="cat" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} placeholder="travel, date night…" /></div>
      </div>
      <div><Label htmlFor="caption">Caption (optional)</Label><Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} rows={3} /></div>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin mr-2" />} Save memory</Button>
      </div>
    </form>
  );
}