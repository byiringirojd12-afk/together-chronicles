import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Download, Heart, Pencil, Trash2, Loader2, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useMemoryMutations, type Memory } from "@/hooks/use-memories";
import { useSignedMemoryUrl } from "@/components/memory-media";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/memories/$id")({
  head: () => ({ meta: [{ title: "Memory — Together+" }] }),
  component: MemoryDetail,
});

function MemoryDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { update, remove } = useMemoryMutations();
  const [mem, setMem] = useState<Memory | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("memories").select("*").eq("id", id).maybeSingle();
      if (data) { setMem(data as Memory); setTitle(data.title ?? ""); setCaption(data.caption ?? ""); setCategory(data.category ?? ""); }
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!mem) return <div className="text-center py-20 text-muted-foreground">Memory not found. <Link to="/memories" className="underline">Back to memories</Link></div>;

  const rawUrl = mem.media_type === "video" ? (mem.video_url ?? mem.image_url) : mem.image_url;
  const url = useSignedMemoryUrl(rawUrl);
  const own = mem.uploaded_by === user?.id;

  async function download() {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${mem!.title || "memory"}.${mem!.media_type === "video" ? "mp4" : "jpg"}`;
      link.click(); URL.revokeObjectURL(link.href);
    } catch { toast.error("Download failed"); }
  }

  async function save() {
    await update.mutateAsync({ id: mem!.id, patch: { title: title.trim() || null, caption: caption.trim() || null, category: category.trim() || null } });
    setMem({ ...mem!, title: title.trim() || null, caption: caption.trim() || null, category: category.trim() || null });
    setEditing(false);
    toast.success("Saved");
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
      <button onClick={() => navigate({ to: "/memories" })} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"><ArrowLeft className="size-4" /> Back</button>

      <div className="rounded-2xl overflow-hidden bg-secondary border border-border/60">
        {!url ? (
          <div className="w-full h-64 bg-muted animate-pulse" />
        ) : mem.media_type === "video" ? (
          <video src={url} controls className="w-full h-auto max-h-[70vh] bg-black" />
        ) : (
          <img src={url} alt={mem.title ?? "Memory"} className="w-full h-auto max-h-[70vh] object-contain" />
        )}
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4">
        {editing ? (
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></div>
            <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} placeholder="travel, anniversary…" /></div>
            <div><Label>Caption</Label><Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} maxLength={500} /></div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditing(false)}><X className="size-4" /> Cancel</Button>
              <Button onClick={save} disabled={update.isPending}><Check className="size-4" /> Save</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                {mem.title && <h1 className="font-serif text-3xl">{mem.title}</h1>}
                <p className="text-sm text-muted-foreground mt-1">
                  {new Date(mem.memory_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                  {mem.category && <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary text-xs">{mem.category}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={download} title="Download"><Download className="size-4" /></Button>
                {own && <Button variant="outline" size="icon" onClick={() => setEditing(true)} title="Edit"><Pencil className="size-4" /></Button>}
                {own && <Button variant="outline" size="icon" onClick={async () => { if (confirm("Delete this memory?")) { await remove.mutateAsync(mem); navigate({ to: "/memories" }); } }} title="Delete"><Trash2 className="size-4" /></Button>}
              </div>
            </div>
            {mem.caption && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{mem.caption}</p>}
          </>
        )}
      </div>
    </div>
  );
}