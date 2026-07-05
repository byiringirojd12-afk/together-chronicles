import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_messages",
  title: "List recent chat messages",
  description: "List the most recent chat messages between the signed-in user and their partner.",
  inputSchema: { limit: z.number().int().min(1).max(200).optional().describe("How many messages to return (default 50).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile } = await client.from("profiles").select("couple_id").eq("id", ctx.getUserId()!).maybeSingle();
    if (!profile?.couple_id) return { content: [{ type: "text", text: "You are not paired with a partner yet." }] };
    const { data, error } = await client.from("messages")
      .select("id, sender_id, content, image_url, created_at, read_at")
      .eq("couple_id", profile.couple_id)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = (data ?? []).reverse();
    return { content: [{ type: "text", text: JSON.stringify(rows) }], structuredContent: { messages: rows } };
  },
});
