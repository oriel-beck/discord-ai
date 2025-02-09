import { ColorResolvable, PermissionResolvable, PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { PermissionsEnum } from '../../constants.js';
import { ToolFunction } from '../../types.js';

const editRoles: ToolFunction<{
  roles: { roleName: string | null; roleColor: ColorResolvable | null; rolePermissions: PermissionResolvable | null; roleId: string }[];
}> = async ({ guild, roles, member }) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return { error: 'No roles provided for creation' };
  }

  const promises = roles.map(async ({ roleName, roleColor, rolePermissions, roleId }) => {
    if (!/\d{17,20}/.test(roleId)) {
      throw `Role ID ${roleId} is not a valid Discord Role ID`;
    }

    if (roleName && roleName.length > 100) {
      throw `${roleName} cannot be longer than 100 characters`;
    }

    if (roleId == guild.roles.everyone.id) {
      if (roleColor || roleName) {
        throw `Cannot edit ${roleId}'s color and name as it's the @everyone role`;
      }
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      throw `Role ID ${roleId} cannot be found`;
    }

    if (member.roles.highest.position <= role.position) {
      throw `${member.id} can't edit ${roleId} as the role's position is higher or equal to their highest role`;
    }

    const me = await guild.members.fetchMe();
    if (me.roles.highest.position <= role.position) {
      throw `The bot cannot add ${roleId} as the role's position is higher or equal to its highest role`;
    }

    try {
      const role = await guild.roles.edit(roleId, {
        name: roleName || undefined,
        color: roleColor || undefined,
        permissions: rolePermissions || undefined,
      });
      return `Edited ${role.id}: ${JSON.stringify(role.toJSON())}`;
    } catch (err) {
      throw `Failed ${roleId}: ${(err as Error).message}`;
    }
  });

  const tasks = await Promise.allSettled(promises);

  const editedRoles: string[] = [];
  const errors: string[] = [];
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      editedRoles.push(task.value);
    } else {
      errors.push(task.reason);
    }
  }

  return {
    data: editedRoles.length ? editedRoles.join('\n') : undefined,
    error: errors.length ? errors.join('\n') : undefined,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'edit_roles',
    description: 'Edits multiple Discord roles',
    strict: true,
    parameters: {
      type: 'object',
      required: ['roles'],
      additionalProperties: false,
      properties: {
        roles: {
          type: 'array',
          description: 'An array of roles to edit',
          items: {
            additionalProperties: false,
            type: 'object',
            required: ['roleName', 'roleColor', 'rolePermissions', 'roleId'],
            properties: {
              roleName: {
                type: ['string', 'null'],
                description: 'The new name for the role, max 100 characters. null when not requested to change.',
              },
              roleColor: {
                type: ['string', 'null'],
                description: 'Hex color code. null when not requested to change.',
              },
              rolePermissions: {
                type: ['array', 'null'],
                description: 'The permissions to apply to the role. null when not requested to change.',
                items: {
                  type: 'string',
                  enum: PermissionsEnum,
                },
              },
              roleId: {
                type: 'string',
                description: 'The role Id',
              },
            },
          },
        },
      },
    },
  },
};

export const permissions: PermissionsString[] = ['ManageRoles'];

export default editRoles;
