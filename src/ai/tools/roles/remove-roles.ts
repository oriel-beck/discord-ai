import OpenAI from 'openai';
import { ToolFunction, ToolResult } from '../../types.js';
import { PermissionsString } from 'discord.js';

const removeRoles: ToolFunction<{
  userId: string;
  roleIds: string[];
}> = async ({ roleIds, guild, userId }) => {
  console.log('Remove the roles', roleIds, 'from the user', userId, 'in the guild', guild.id);
  if (!roleIds.length)
    return {
      error: `No roles were provided to remove from ${userId}`,
    };

  if (!/\d{17,20}/.test(userId))
    return {
      error: `${userId} is not a valid Discord user ID. You can get the user ID from the result of the tool get_discord_member_by_username`,
    };

  const useableIds: string[] = [];
  const errors: string[] = [];

  for (const roleId of roleIds) {
    if (!/\d{17,20}/.test(roleId)) {
      errors.push(`Role ID ${roleId} is not a valid Discord Role ID`);
      continue;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      errors.push(`Role ID ${roleId} cannot be found`);
      continue;
    }

    useableIds.push(role.id);
  }

  const member = guild.members.cache.get(userId) || (await guild.members.fetch(userId).catch(() => null));
  if (!member) return { error: `Failed to find the member ${userId}` };
  const res: ToolResult = {};

  try {
    await member.roles.remove(useableIds);
    res.data = `Removed ${useableIds.join(', ')} from ${userId}.`;
    if (errors.length) res.error = errors.join('\n');
    return res;
  } catch (err) {
    return {
      error: `Failed to remove the roles ${useableIds.join(', ')} from the member ${userId}: ${(err as Error).message}`,
    };
  }
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'remove_roles',
    description:
      'Removes one or more Discord roles from a specific member by using one or more role IDs and a user ID. Used to remove one or multiple roles at a time, this should not be used more than once per userId.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['userId', 'roleIds'],
      properties: {
        userId: {
          type: 'string',
          description: 'The user ID of the member to remove the role from',
        },
        roleIds: {
          type: 'array',
          description: 'The role ID to remove from the specified member in the specified server',
          items: {
            type: 'string',
            description: 'The role ID to remove to the specified member',
          },
        },
      },
    },
  },
};

export const permission: PermissionsString = 'ManageRoles';

export default removeRoles;
