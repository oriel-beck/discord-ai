import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const getMemberByUsername: ToolFunction<{ username: string }> = async ({ username, guild }) => {
  const member =
    guild.members.cache.find(
      m => m.nickname?.toLowerCase()?.includes(username.toLowerCase()) || m.user.displayName.toLowerCase().includes(username.toLowerCase())
    ) || (await guild.members.search({ query: username, limit: 1 })).at(0);
  if (!member)
    return {
      error: `Member ${username} cannot be found`,
    };
  return { data: JSON.stringify({ ...member.toJSON()!, permissions: member.permissions.toArray() }) };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_discord_member_by_username',
    description: 'Gets a discord member by their username or nickname, used for getting any information about the member including their permissions.',
    strict: true,
    parameters: {
      type: 'object',
      required: ['username'],
      additionalProperties: false,
      properties: {
        username: {
          type: 'string',
          description: 'The username or nickname of the member to get',
        },
      },
    },
  },
};

export default getMemberByUsername;
