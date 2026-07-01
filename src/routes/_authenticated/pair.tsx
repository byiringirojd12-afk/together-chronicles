import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Copy, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile, useCouple, usePartner } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/pair")({
  head: () => ({ meta: [{ title: "Partner — Together+" }] }),
  component: PairPage,
});

function PairPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: couple } = useCouple(profile?.couple_id);
  const { data: partner } = usePartner(profile?.couple_id, user?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("pair_with_code", { _code: code.trim().toUpperCase() });
      if (error) throw error;
      toast.success("Paired! Welcome to your sanctuary.");
      await qc.invalidateQueries();
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't pair");
    } finally { setSubmitting(false); }
  }

  async function createSolo(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("create_couple", {
        _name: "Us",
        _anniversary: anniversary || (null as unknown as string),
      });
      if (error) throw error;
      toast.success("Your space is ready. Share your code with your partner.");
      await qc.invalidateQueries();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't create");
    } finally { setSubmitting(false); }
  }

  function copyCode() {
    if (!profile?.invite_code) return;
    navigator.clipboard.writeText(profile.invite_code);
    toast.success("Code copied");
  }

  if (!profile) return null;

  // Already paired with partner
  if (couple && partner) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-[var(--shadow-soft)] text-center animate-fade-up">
          <div className="size-16 rounded-full bg-[color:var(--color-sage)]/15 mx-auto flex items-center justify-center mb-4">
            <Heart className="size-7 text-[color:var(--color-sage-deep)]" fill="currentColor" />
          </div>
          <h1 className="font-serif text-3xl mb-2">You're paired</h1>
          <p className="text-muted-foreground">You and <span className="text-foreground font-medium">{partner.display_name}</span> are sharing this space.</p>
          {couple.anniversary_date && (
            <p className="text-sm text-muted-foreground mt-2">Anniversary: {new Date(couple.anniversary_date).toLocaleDateString()}</p>
          )}
          <Button className="mt-6" onClick={() => navigate({ to: "/dashboard" })}>
            Enter your sanctuary <ArrowRight className="size-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Waiting for partner (couple exists, partner doesn't)
  if (couple && !partner) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-[var(--shadow-soft)] text-center animate-fade-up">
          <h1 className="font-serif text-3xl mb-2">Share this code with your partner</h1>
          <p className="text-muted-foreground mb-6">They'll enter it on their sign-up to join you.</p>
          <button onClick={copyCode} className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-secondary text-secondary-foreground font-mono text-2xl tracking-[0.3em] hover:bg-secondary/80 transition-colors">
            {profile.invite_code} <Copy className="size-4" />
          </button>
          <p className="text-xs text-muted-foreground mt-6 flex items-center justify-center gap-2">
            <Loader2 className="size-3 animate-spin" /> Waiting for your partner to join…
          </p>
        </div>
      </div>
    );
  }

  // Not paired yet — choose
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-serif text-4xl mb-2">Pair with your partner</h1>
        <p className="text-muted-foreground">Together+ is for two. Create your space or join theirs.</p>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-[var(--shadow-soft)] animate-fade-up">
        <h2 className="font-serif text-2xl mb-4">Join your partner</h2>
        <form onSubmit={joinByCode} className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Enter their 6-character code" maxLength={6} className="font-mono tracking-widest text-center uppercase" />
          <Button type="submit" disabled={submitting || code.length !== 6}>
            {submitting && <Loader2 className="size-4 animate-spin mr-2" />} Join
          </Button>
        </form>
      </div>

      <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-[var(--shadow-soft)] animate-fade-up">
        <h2 className="font-serif text-2xl mb-1">Or start a new space</h2>
        <p className="text-muted-foreground text-sm mb-4">You'll get a code to share with your partner.</p>
        <form onSubmit={createSolo} className="space-y-3">
          <div>
            <Label htmlFor="anniv">Anniversary date (optional)</Label>
            <Input id="anniv" type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={submitting}>Create our space</Button>
        </form>
        <p className="text-xs text-muted-foreground mt-4">Your invite code: <span className="font-mono tracking-widest">{profile.invite_code}</span></p>
      </div>
    </div>
  );
}