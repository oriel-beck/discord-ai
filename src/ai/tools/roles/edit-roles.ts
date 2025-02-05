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

  const editedRoles: string[] = [];
  const errors: string[] = [];

  for (const { roleName, roleColor, rolePermissions, roleId } of roles) {
    if (!/\d{17,20}/.test(roleId)) {
      errors.push(`Role ID ${roleId} is not a valid Discord Role ID`);
      continue;
    }

    if (roleName && roleName.length > 100) {
      errors.push(`${roleName} cannot be longer than 100 characters`);
      continue;
    }

    if (roleId == guild.roles.everyone.id) {
      if (roleColor || roleName) {
        errors.push(`Cannot edit ${roleId}'s color and name as it's the @everyone role`);
        continue;
      }
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      errors.push(`Role ID ${roleId} cannot be found`);
      continue;
    }

    if (member.roles.highest.position <= role.position) {
      errors.push(`${member.id} can't edit ${roleId} as the role's position is higher or equal to their highest role`);
      continue;
    }

    const me = await guild.members.fetchMe();
    if (me.roles.highest.position <= role.position) {
      errors.push(`The bot cannot add ${roleId} as the role's position is higher or equal to its highest role`);
      continue;
    }

    try {
      const role = await guild.roles.edit(roleId, {
        name: roleName || undefined,
        color: roleColor || undefined,
        permissions: rolePermissions || undefined,
      });
      editedRoles.push(`Edited the role ${role.id}: ${JSON.stringify(role.toJSON())}`);
    } catch (err) {
      errors.push(`Failed to edit role ${roleId}: ${(err as Error).message}`);
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
