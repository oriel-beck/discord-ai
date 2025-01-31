import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';
import { ColorResolvable, PermissionsString } from 'discord.js';

const createRoles: ToolFunction<{
  roles: { roleName: string; roleColor: ColorResolvable }[];
}> = async ({ guild, roles }) => {
  if (!Array.isArray(roles) || roles.length === 0) {
    return { error: 'No roles provided for creation' };
  }

  const createdRoles = [];
  const errors = [];

  for (const { roleName, roleColor } of roles) {
    if (roleName.length > 100) {
      errors.push({ roleName, error: `${roleName} cannot be longer than 100 characters` });
      continue;
    }

    try {
      const role = await guild.roles.create({ name: roleName, color: roleColor });
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
            required: ['roleName', 'roleColor'],
            properties: {
              roleName: {
                type: 'string',
                description: 'The name for the role, max 100 characters',
              },
              roleColor: {
                type: ['string', 'null'],
                description: 'Hex color code',
              },
            },
          },
        },
      },
    },
  },
};

export const permission: PermissionsString = 'ManageRoles';

export default createRoles;
