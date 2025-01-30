import OpenAI from "openai";
import { ToolFunction } from "../../types.js";

const getDiscordMemberByUsername: ToolFunction<{ username: string }> = async ({
  username,
  guild,
}) => {
  console.log(`Getting member from ${guild.id} by username ${username}`);
  const member =
    guild.members.cache.find(
      (m) =>
        m.nickname?.toLowerCase()?.includes(username.toLowerCase()) ||
        m.user.displayName.toLowerCase().includes(username.toLowerCase())
    ) || (await guild.members.search({ query: username, limit: 1 })).at(0);
  if (!member)
    return {
      error: `Member ${username} cannot be found`,
    };
  return { data: member.id };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_discord_member_by_username",
    description:
      "Gets a discord member by their username or nickname, used for getting the user ID of the target(s)",
    strict: true,
    parameters: {
      type: "object",
      required: ["username"],
      additionalProperties: false,
      properties: {
        username: {
          type: "string",
          description: "The username or nickname of the member to get",
        },
      },
    },
  },
}

export default getDiscordMemberByUsername;
