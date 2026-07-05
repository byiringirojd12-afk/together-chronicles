import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_memories",
  title: "List memories",
  description: "List the couple's memories (shared moments) most recent first.",
  inputSchema: { limit: z.number().int().min(1).max(100).optional() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: profile } = await client.from("profiles").select("couple_id").eq("id", ctx.getUserId()!).maybeSingle();
    if (!profile?.couple_id) return { content: [{ type: "text", text: "You are not paired with a partner yet." }] };
    const { data, error } = await client.from("memories").select("*")
      .eq("couple_id", profile.couple_id).order("created_at", { ascending: false }).limit(limit ?? 25);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: { memories: data } };
  },
});
