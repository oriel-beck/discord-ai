import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';
import { ColorResolvable, PermissionResolvable, PermissionsString } from 'discord.js';
import { PermissionsEnum } from '../../constants.js';

const createRoles: ToolFunction<{
  roles: { roleName: string; roleColor: ColorResolvable | null; rolePermissions: PermissionResolvable }[];
}> = async ({ guild, roles }) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return { error: 'No roles provided for creation' };
  }

  const createdRoles: string[] = [];
  const errors: string[] = [];

  for (const { roleName, roleColor, rolePermissions } of roles) {
    if (roleName.length > 100) {
      errors.push(`${roleName} cannot be longer than 100 characters`);
      continue;
    }

    try {
      const role = await guild.roles.create({ name: roleName, color: roleColor || undefined, permissions: rolePermissions });
      createdRoles.push(`Created a role called ${role.name} with the color ${role.color} and ID ${role.id}`);
    } catch (err) {
      errors.push(`Failed to create role ${roleName}: ${(err as Error).message}`);
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
