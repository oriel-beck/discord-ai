import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction, ToolResult } from '../../types.js';

const removeRoles: ToolFunction<{ roles: { userId: string; roleIds: string[] }[] }> = async ({ roles, guild }) => {
  console.log('removing the roles in the guild', guild.id);
  if (!roles)
    return {
      error: `No roles were provided to remove`,
    };

  const data: string[] = [];
  const errors: string[] = [];
  const res: ToolResult = {};

  for (const roleSet of roles) {
    if (!/\d{17,20}/.test(roleSet.userId))
      errors.push(`${roleSet.userId} is not a valid Discord user ID. You can get the user ID from the result of the tool get_discord_member_by_username`);
    const useableIds: string[] = [];

    for (const roleId of roleSet.roleIds) {
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

    const member = guild.members.cache.get(roleSet.userId) || (await guild.members.fetch(roleSet.userId).catch(() => null));
    if (!member) {
      errors.push(`Failed to find the member ${roleSet.userId}`);
      continue;
    }

    try {
      await member.roles.remove(useableIds);
      data.push(`removed ${useableIds.join(', ')} from ${roleSet.userId}.`);
    } catch (err) {
      errors.push(`Failed to remove roles from the member ${roleSet.userId}: ${(err as Error).message}`);
    }
  }

  if (errors.length) res.error = errors.join('\n');
  if (data.length) res.data = data.join('\n');
  return res;
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'remove_roles',
    description:
      'removes one or more Discord roles to the specific member by using one or more role IDs and a user IDs in an array. Used to remove one or multiple roles at a time to one or multiple users at a time, this should not be used more than once per userId.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['roles'],
      properties: {
        roles: {
          type: 'array',
          items: {
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
                description: 'The role ID to remove from, the specified member in the specified server',
                items: {
                  type: 'string',
                  description: 'The role ID to remove from the specified member',
                },
              },
            },
          },
        },
      },
    },
  },
};

export const permission: PermissionsString = 'ManageRoles';

export default removeRoles;
