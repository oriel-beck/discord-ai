import { PermissionsString } from 'discord.js';
import { ToolFunction } from '../../types.js';
import OpenAI from 'openai';

const deleteRole: ToolFunction<{ roleId: string }> = async ({ guild, roleId }) => {
  if (!/\d{17,20}/.test(roleId)) return { data: `The role ${roleId} is not a valid role ID` };
  const deleted = await guild.roles.delete(roleId).catch(() => null);
  if (deleted) return { data: `${roleId} was deleted` };
  else return { error: `Failed to delete ${roleId}` };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delete_role',
    description: 'Deletes a Discord role',
    strict: true,
    parameters: {
      type: 'object',
      required: ['roleId'],
      additionalProperties: false,
      properties: {
        roleId: {
          type: 'string',
          description: 'The role ID of the role to delete',
        },
      },
    },
  },
};

export const permission: PermissionsString = 'ManageRoles';

export default deleteRole;
