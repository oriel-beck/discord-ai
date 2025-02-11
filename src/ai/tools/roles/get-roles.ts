import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const getAllRoles: ToolFunction = ({ guild }) => {
  const roles = guild.roles.cache.map(r => r.toJSON());
  if (!roles) return { error: 'Failed to get role list' };

  return {
    data: JSON.stringify(roles),
    information: `If you can't find the role you are looking for here skip the operation and report to the executor. Note: The role @everyone cannot have its color, name and position edited, nor can it be added/removed from users.`,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_all_discord_roles',
    description: 'Gets all the roles, used for finding one or multiple role IDs by names',
  },
};

export default getAllRoles;
