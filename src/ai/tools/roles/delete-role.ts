import { PermissionsString } from 'discord.js';
import { ToolFunction } from '../../types.js';
import OpenAI from 'openai';

const deleteRoles: ToolFunction<{
  roleIds: string[];
}> = async ({ guild, roleIds }) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    return { error: 'No roles provided for creation' };
  }

  const deletedRoles = [];
  const errors = [];

  for (const roleId of roleIds) {
    if (!/\d{17,20}/.test(roleId)) {
      errors.push(`${roleId} is not a valid role ID`)
      continue;
    }
    try {
      const role = await guild.roles.delete(roleId);
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

export const permission: PermissionsString = 'ManageRoles';

export default deleteRoles;
