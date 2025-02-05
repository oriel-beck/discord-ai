import { PermissionsBitField } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const getPermissionsBitfield: ToolFunction<{ sourceId: string; bitfield: bigint }> = async ({ sourceId, bitfield }) => {
  const bits = new PermissionsBitField(`${bitfield}`);
  return { data: `Source: ${sourceId}, permissions: ${bits.toArray().join(', ')}` };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'convert_permissions_bitfield',
    description: 'Converts a permission bitfield (such as 11264) to a permission names array.',
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['sourceId', 'bitfield'],
      properties: {
        sourceId: {
          type: 'string',
          description: 'The source Id of what needs the bitfield conversation, can be a role, member, or channel Id',
        },
        bitfield: {
          type: 'string',
          description: 'The bitfield for the permissions of the sourceId',
        },
      },
    },
  },
};

export default getPermissionsBitfield;
