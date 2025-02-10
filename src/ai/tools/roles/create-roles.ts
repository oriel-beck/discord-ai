import { ColorResolvable, PermissionResolvable, PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { PermissionsEnum, validateStringArray } from '../../constants.js';
import { ToolFunction } from '../../types.js';

const createRoles: ToolFunction<{
  roles: { roleName: string; roleColor: ColorResolvable | null; rolePermissions: PermissionResolvable }[];
}> = async ({ guild, roles }) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return { error: 'No roles provided for creation' };
  }

  const promises = roles.map(async ({ roleName, roleColor, rolePermissions }) => {
    if (roleName.length > 100) {
      throw `${roleName} cannot be longer than 100 characters`;
    }

    rolePermissions ??= [];

    const validPermissions = !rolePermissions || validateStringArray(rolePermissions);
    if (!validPermissions) throw `Invalid permissions overwrites for ${roleName}`;

    try {
      const role = await guild.roles.create({ name: roleName, color: roleColor || undefined, permissions: rolePermissions });
      return `Created ${role.name} - ${role.color} - ${role.id}`;
    } catch (err) {
      throw `Failed ${roleName}: ${(err as Error).message}`;
    }
  });
  const tasks = await Promise.allSettled(promises);

  const createdRoles: string[] = [];
  const errors: string[] = [];
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      createdRoles.push(task.value);
    } else {
      errors.push(task.reason);
    }
  }

  return {
    data: createdRoles.length ? createdRoles.join('\n') : undefined,
    error: errors.length ? errors.join('\n') : undefined,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'create_roles',
    description: 'Creates multiple Discord roles',
    strict: true,
    parameters: {
      type: 'object',
      required: ['roles'],
      additionalProperties: false,
      properties: {
        roles: {
          type: 'array',
          description: 'An array of roles to create',
          items: {
            additionalProperties: false,
            type: 'object',
            required: ['roleName', 'roleColor', 'rolePermissions'],
            properties: {
              roleName: {
                type: 'string',
                description: 'The name for the role, max 100 characters.',
              },
              roleColor: {
                type: ['string', 'null'],
                description: 'Hex color code. null when not requested.',
              },
              rolePermissions: {
                type: 'array',
                description: 'The permissions to apply to the role',
                items: {
                  type: 'string',
                  enum: PermissionsEnum,
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

export default createRoles;
