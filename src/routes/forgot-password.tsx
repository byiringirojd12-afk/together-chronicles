import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Together+" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
      toast.success("Check your email for the reset link.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send reset email");
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
            <h1 className="font-serif text-4xl mb-2">Forgot your password?</h1>
            <p className="text-muted-foreground">We'll email you a link to reset it.</p>
          </div>
          <div className="bg-card border border-border/60 rounded-2xl p-7 shadow-[var(--shadow-soft)] animate-fade-up [animation-delay:80ms]">
            {sent ? (
              <div className="text-center space-y-3">
                <p className="font-serif text-xl">Check your inbox.</p>
                <p className="text-sm text-muted-foreground">If an account exists for <span className="text-foreground">{email}</span>, a reset link is on its way.</p>
                <Link to="/login"><Button variant="outline" className="mt-2">Back to sign in</Button></Link>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} autoFocus />
                </div>
                <Button type="submit" className="w-full h-11" disabled={submitting || !email}>
                  {submitting && <Loader2 className="size-4 animate-spin mr-2" />} Send reset link
                </Button>
              </form>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Remembered it? <Link to="/login" className="text-foreground font-medium underline-offset-4 hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}