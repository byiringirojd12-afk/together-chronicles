import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_profile",
  title: "Get my profile",
  description: "Get the signed-in user's Together+ profile, their couple, and their partner (if paired).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const client = sb(ctx);
    const userId = ctx.getUserId();
    const { data: profile, error } = await client.from("profiles").select("*").eq("id", userId!).maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    let couple: unknown = null;
    let partner: unknown = null;
    if (profile?.couple_id) {
      const [c, p] = await Promise.all([
        client.from("couples").select("*").eq("id", profile.couple_id).maybeSingle(),
        client.from("profiles").select("id, display_name, avatar_url").eq("couple_id", profile.couple_id).neq("id", userId!).maybeSingle(),
      ]);
      couple = c.data;
      partner = p.data;
    }
    const payload = { profile, couple, partner };
    return { content: [{ type: "text", text: JSON.stringify(payload) }], structuredContent: payload };
  },
});
