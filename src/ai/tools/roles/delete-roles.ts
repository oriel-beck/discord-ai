import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const deleteRoles: ToolFunction<{
  roleIds: string[];
}> = async ({ guild, roleIds, member }) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return { error: 'No roles provided for deletion' };
  }

  const promises = roleIds.map(async roleId => {
    if (!/\d{17,20}/.test(roleId)) {
      throw `Role ID ${roleId} is not a valid Discord Role ID`;
    }

    if (roleId == guild.roles.everyone.id) {
      throw `Cannot delete ${roleId} as it's the @everyone role`;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      throw `Role ID ${roleId} cannot be found`;
    }

    if (member.roles.highest.position <= role.position) {
      throw `${member.id} can't delete ${roleId} as the role's position is higher or equal to their highest role`;
    }

    const me = await guild.members.fetchMe();
    if (me.roles.highest.position <= role.position) {
      throw `The bot cannot add ${roleId} as the role's position is higher or equal to its highest role`;
    }

    try {
      await guild.roles.delete(roleId);
      return roleId;
    } catch (err) {
      throw `Failed ${roleId}: ${(err as Error).message}`;
    }
  });

  const tasks = await Promise.allSettled(promises);

  const deletedRoles: string[] = [];
  const errors: string[] = [];
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      deletedRoles.push(task.value);
    } else {
      errors.push(task.reason);
    }
  }

  return {
    data: deletedRoles.length ? `Deleted the roles ${deletedRoles.join(', ')}` : undefined,
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
