import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction, ToolResult } from '../../types.js';

const addRoles: ToolFunction<{ roles: { userId: string; roleIds: string[] }[] }> = async ({ roles, guild, member }) => {
  if (!roles)
    return {
      error: `No roles were provided to add`,
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

      if (roleId == guild.roles.everyone.id) {
        errors.push(`Cannot add ${roleId} as its the @everyone role`);
        continue;
      }

      const role = guild.roles.cache.get(roleId);
      if (!role) {
        errors.push(`Role ID ${roleId} cannot be found`);
        continue;
      }

      if (member.roles.highest.position <= role.position) {
        errors.push(`${member.id} cannot add ${roleId} as the role's position is higher or equal to their highest role`);
        continue;
      }

      const me = await guild.members.fetchMe();
      if (me.roles.highest.position <= role.position) {
        errors.push(`The bot cannot add ${roleId} as the role's position is higher or equal to the bot's`);
        continue;
      }

      useableIds.push(role.id);
    }

    try {
      const guildMember = await guild.members.fetch(roleSet.userId);

      if (!guildMember) {
        errors.push(`Failed to find the member ${roleSet.userId}`);
        continue;
      }

      if (guildMember.roles.highest.position >= member.roles.highest.position) {
        errors.push(`${member.id} cannot add roles to ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to ${member.id}'s`);
        continue;
      }

      await guildMember.roles.add(useableIds);
      data.push(`Added ${useableIds.join(', ')} to ${roleSet.userId}.`);
    } catch (err) {
      errors.push(`Failed to add roles to the member ${roleSet.userId}: ${(err as Error).message}`);
    }
  }

  if (errors.length) res.error = errors.join('\n');
  if (data.length) res.data = data.join('\n');
  return res;
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'add_roles',
    description:
      'Adds one or more Discord roles to the specific member by using one or more role IDs and a user IDs in an array. Used to add one or multiple roles at a time to one or multiple users at a time, this should not be used more than once per userId.',
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
                description: 'The user ID of the member to add the role to',
              },
              roleIds: {
                type: 'array',
                description: 'The role ID to add to the specified member in the specified server',
                items: {
                  type: 'string',
                  description: 'The role ID to add to the specified member',
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

export default addRoles;
