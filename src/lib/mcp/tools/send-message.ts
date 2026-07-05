import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "send_message",
  title: "Send a chat message",
  description: "Send a text chat message to the signed-in user's partner in Together+.",
  inputSchema: { content: z.string().trim().min(1).describe("The message text to send.") },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ content }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const userId = ctx.getUserId()!;
    const { data: profile } = await client.from("profiles").select("couple_id").eq("id", userId).maybeSingle();
    if (!profile?.couple_id) return { content: [{ type: "text", text: "You are not paired with a partner yet." }], isError: true };
    const { data, error } = await client.from("messages")
      .insert({ couple_id: profile.couple_id, sender_id: userId, content })
      .select("id, created_at").maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: `Sent (id ${data?.id}).` }], structuredContent: { message: data } };
  },
});
