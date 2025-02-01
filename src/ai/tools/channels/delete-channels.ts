import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const deleteChannels: ToolFunction<{
  channelIds: string[];
}> = async ({ guild, channelIds }) => {
  if (!channelIds.length)
    return {
      error: 'No channels were provided to create',
    };

  const createdChannels = [];
  const errors = [];

  for (const channelId of channelIds) {
    try {
      await guild.channels.delete(channelId);
      createdChannels.push(`Deleted the channel ${channelId}`);
    } catch (err) {
      errors.push(`Failed to delete channel ${channelId}: ${(err as Error).message}`);
    }
  }

  return {
    data: createdChannels.length ? createdChannels.join('\n') : undefined,
    error: errors.length ? errors.join('\n') : undefined,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'delete_channels',
    description: 'Deletes multiple Discord channels',
    strict: true,
    parameters: {
      type: 'object',
      required: ['channelIds'],
      additionalProperties: false,
      properties: {
        channelIds: {
          type: 'array',
          description: 'An array of channel IDs to delete',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
};

export const permission: PermissionsString = 'ManageChannels';

export default deleteChannels;
