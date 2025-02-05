import { PermissionsString } from 'discord.js';
import { ToolFunction } from '../../types.js';
import OpenAI from 'openai';

const deleteRoles: ToolFunction<{
  roleIds: string[];
}> = async ({ guild, roleIds, member }) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return { error: 'No roles provided for deletion' };
  }

  const deletedRoles: string[] = [];
  const errors: string[] = [];

  for (const roleId of roleIds) {
    if (!/\d{17,20}/.test(roleId)) {
      errors.push(`Role ID ${roleId} is not a valid Discord Role ID`);
      continue;
    }

    if (roleId == guild.roles.everyone.id) {
      errors.push(`Cannot delete ${roleId} as its the @everyone role`);
      continue;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      errors.push(`Role ID ${roleId} cannot be found`);
      continue;
    }

    if (member.roles.highest.position <= role.position) {
      errors.push(`${member.id} delete ${roleId} as the role's position is higher or equal to their highest role`);
      continue;
    }

    const me = guild.members.me || (await guild.members.fetchMe());
    if (me.roles.highest.position <= role.position) {
      errors.push(`The bot cannot add ${roleId} as the role's position is higher or equal to its highest role`);
      continue;
    }

    try {
      await guild.roles.delete(roleId);
      deletedRoles.push(`Deleted the role ${roleId}`);
    } catch (err) {
      errors.push(`Failed to delete the role ${roleId}: ${(err as Error).message}`);
    }
  }

  return {
    data: deletedRoles.length ? deletedRoles.join('\n') : undefined,
    error: errors.length ? errors.join('\n') : undefined,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delete_roles',
    description: 'Deletes multiple Discord roles',
    strict: true,
    parameters: {
      type: 'object',
      required: ['roleIds'],
      additionalProperties: false,
      properties: {
        roleIds: {
          type: 'array',
          description: 'An array of role IDs to delete',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
};

export const permissions: PermissionsString[] = ['ManageRoles'];

export default deleteRoles;
