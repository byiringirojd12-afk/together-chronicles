import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfile from "./tools/get-profile";
import listMessages from "./tools/list-messages";
import sendMessage from "./tools/send-message";
import listMemories from "./tools/list-memories";
import listGoals from "./tools/list-goals";
import listUpcomingEvents from "./tools/list-upcoming-events";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "together-plus-mcp",
  title: "Together+ MCP",
  version: "0.1.0",
  instructions:
    "Tools for Together+, a sanctuary for couples. Use `get_profile` to see the signed-in user and their partner, `list_messages`/`send_message` for chat, and `list_memories`, `list_goals`, `list_upcoming_events` to read shared content.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfile, listMessages, sendMessage, listMemories, listGoals, listUpcomingEvents],
});
