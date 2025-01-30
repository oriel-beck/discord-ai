import OpenAI from "openai";
import { ToolFunction } from "../../types.js";

const getAllRoles: ToolFunction = async ({ guild }) => {
  console.log("Getting role list for", guild.id);
  if (!guild.members.me) await guild.members.fetchMe();
  let roles = guild.roles.cache
    .filter(
      (r) => !r.managed && r.position < guild.members.me!.roles.highest.position
    )
    .map((r) => `Position ${r.position}: ${r.name} - ${r.id}`)
    .join("\n");
  if (!roles) return { error: `Failed to get role list` };
  return {
    data: `If you can't find the role you are looking for here skip the operation and report to the executor\n\n${roles}`,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_all_discord_roles",
    description:
      "Gets all the roles, used for finding one or multiple role IDs by names",
  },
};

export default getAllRoles;
