import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction, ToolResult } from '../../types.js';

const removeRoles: ToolFunction<{ roles: { userId: string; roleIds: string[] }[] }> = async ({ roles, guild, member }) => {
  if (!roles)
    return {
      error: `No roles were provided to add`,
    };

  const promises = roles.map(async roleSet => {
    if (!/\d{17,20}/.test(roleSet.userId))
      throw `${roleSet.userId} is not a valid Discord user ID. You can get the user ID from the result of the tool get_discord_member_by_username`;

    const guildMember = await guild.members.fetch(roleSet.userId);

    if (!guildMember) {
      throw `Failed to find the member ${roleSet.userId}`;
    }

    // if the current user is trying to edit another user, check
    if (member.id !== guildMember.id && guildMember.roles.highest.position >= member.roles.highest.position) {
      throw `${member.id} cannot remove roles from ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to ${member.id}'s`;
    }

    const innerPromises = roleSet.roleIds.map(async roleId => {
      if (!/\d{17,20}/.test(roleId)) {
        throw `Role ID ${roleId} is not a valid Discord Role ID`;
      }

      if (roleId == guild.roles.everyone.id) {
        throw `Cannot remove ${roleId} as its the @everyone role`;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        throw `Role ID ${roleId} cannot be found`;
      }

      if (member.roles.highest.position <= role.position) {
        throw `${member.id} cannot remove ${roleId} as the role's position is higher or equal to their highest role`;
      }

      const me = await guild.members.fetchMe();
      if (me.roles.highest.position <= role.position) {
        throw `The bot cannot remove ${roleId} as the role's position is higher or equal to the bot's`;
      }

      return role.id;
    });

    const useableIds = (await Promise.allSettled(innerPromises)).reduce((acc, p) => (p.status === 'fulfilled' ? [...acc, p.value] : acc), [] as string[]);

    try {
      await guildMember.roles.remove(useableIds);
      return `Removed ${useableIds.join(', ')} from ${roleSet.userId}.`;
    } catch (err) {
      throw `Failed ${roleSet.userId}: ${(err as Error).message}`;
    }
  });

  const tasks = await Promise.allSettled(promises);

  const addedRoles: string[] = [];
  const errors: string[] = [];
  const res: ToolResult = {};
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      addedRoles.push(task.value);
    } else {
      errors.push(task.reason);
    }
  }

  if (errors.length) res.error = errors.join('\n');
  if (addedRoles.length) res.data = addedRoles.join('\n');
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

export const permissions: PermissionsString[] = ['ManageRoles'];

export default removeRoles;
