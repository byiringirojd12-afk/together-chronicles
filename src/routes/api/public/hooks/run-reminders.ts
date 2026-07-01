import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Reminder runner. Called by pg_cron every minute.
 * - Finds active reminders due now.
 * - Inserts a notification row for each member of the couple (respecting prefs).
 * - Advances recurring reminders to their next occurrence; deactivates one-offs.
 * Inserts via supabase realtime push notifications to the in-app feed.
 */
export const Route = createFileRoute("/api/public/hooks/run-reminders")({
  server: {
    handlers: {
      POST: handle,
      GET: handle, // permit GET so pg_cron and manual smoke tests both work
    },
  },
});

function isAuthorized(request: Request): boolean {
  const expected = process.env.CRON_SECRET ?? "";
  if (!expected) return false;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    request.headers.get("x-cron-secret") ??
    "";
  if (provided.length !== expected.length) return false;
  // constant-time compare
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0;
}

async function handle({ request }: { request: Request }) {
  if (!isAuthorized(request)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const now = new Date();
  const nowIso = now.toISOString();

  const { data: due, error } = await supabaseAdmin
    .from("reminders")
    .select("*")
    .eq("active", true)
    .lte("due_at", nowIso)
    .limit(200);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  let fired = 0;
  for (const r of due ?? []) {
    // Find couple members
    const { data: members } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("couple_id", r.couple_id);
    const memberIds = (members ?? []).map((m: { id: string }) => m.id);
    if (memberIds.length === 0) continue;

    // Filter by preferences
    const { data: prefs } = await supabaseAdmin
      .from("notification_preferences")
      .select("user_id, reminders_enabled, in_app_enabled")
      .in("user_id", memberIds);
    const allowed = (prefs ?? [])
      .filter((p: { reminders_enabled: boolean; in_app_enabled: boolean }) => p.reminders_enabled && p.in_app_enabled)
      .map((p: { user_id: string }) => p.user_id);
    const targets = allowed.length ? allowed : memberIds;

    const rows = targets.map((uid: string) => ({
      user_id: uid,
      title: r.title,
      body: r.body,
      type: `reminder:${r.reminder_type}`,
    }));
    if (rows.length) {
      await supabaseAdmin.from("notifications").insert(rows);
      fired += rows.length;
    }

    const next = nextOccurrence(new Date(r.due_at), r.recurrence);
    if (next) {
      await supabaseAdmin.from("reminders").update({ due_at: next.toISOString(), last_fired_at: nowIso }).eq("id", r.id);
    } else {
      await supabaseAdmin.from("reminders").update({ active: false, last_fired_at: nowIso }).eq("id", r.id);
    }
  }

  return Response.json({ ok: true, processed: due?.length ?? 0, notifications: fired });
}

function nextOccurrence(from: Date, recurrence: string): Date | null {
  const d = new Date(from);
  switch (recurrence) {
    case "daily": d.setUTCDate(d.getUTCDate() + 1); return d;
    case "weekly": d.setUTCDate(d.getUTCDate() + 7); return d;
    case "monthly": d.setUTCMonth(d.getUTCMonth() + 1); return d;
    case "yearly": d.setUTCFullYear(d.getUTCFullYear() + 1); return d;
    default: return null;
  }
}