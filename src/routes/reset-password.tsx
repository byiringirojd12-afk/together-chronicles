import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — Together+" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  // Supabase emits PASSWORD_RECOVERY when the user arrives via the reset link
  // and the access token is processed from the URL fragment.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setRecoveryReady(true);
      }
    });
    // Also check immediately in case event already fired
    supabase.auth.getSession().then(({ data }) => { if (data.session) setRecoveryReady(true); });
    return () => subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. Welcome back.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="px-6 py-5">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="size-8 rounded-full bg-primary flex items-center justify-center">
            <Heart className="size-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-serif text-xl font-semibold">Together+</span>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-up">
            <h1 className="font-serif text-4xl mb-2">Choose a new password</h1>
            <p className="text-muted-foreground">At least 8 characters.</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-[var(--shadow-soft)] animate-fade-up [animation-delay:80ms]">
            {!recoveryReady ? (
              <div className="text-center text-sm text-muted-foreground py-6">
                <Loader2 className="size-5 animate-spin mx-auto mb-3 text-muted-foreground" />
                Validating your reset link…
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="pw">New password</Label>
                  <Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={72} autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pw2">Confirm password</Label>
                  <Input id="pw2" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} maxLength={72} />
                </div>
                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin mr-2" />} Update password
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}