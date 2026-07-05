import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

function oauth(): OAuthNs {
  return (supabase.auth as unknown as { oauth: OAuthNs }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen flex items-center justify-center p-6 text-center">
      <p className="text-sm text-muted-foreground">Could not load this authorization request: {String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as { client?: { name?: string; logo_uri?: string } };
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    if (error) { setBusy(null); setError(error.message); return; }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) { setBusy(null); setError("No redirect returned by the authorization server."); return; }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-card border border-border/60 rounded-2xl p-7 shadow-[var(--shadow-soft)] text-center">
        <div className="mx-auto size-12 rounded-full bg-primary flex items-center justify-center mb-4">
          <Heart className="size-6 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="font-serif text-2xl mb-2">Connect {clientName} to Together+</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {clientName} is asking to access your Together+ account. It will act as you and can read and write
          data your account can access.
        </p>
        {error && <p role="alert" className="text-sm text-destructive mb-4">{error}</p>}
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-11" disabled={busy !== null} onClick={() => decide(false)}>
            {busy === "deny" && <Loader2 className="size-4 animate-spin mr-2" />}Deny
          </Button>
          <Button className="flex-1 h-11" disabled={busy !== null} onClick={() => decide(true)}>
            {busy === "approve" && <Loader2 className="size-4 animate-spin mr-2" />}Approve
          </Button>
        </div>
      </div>
    </main>
  );
}
