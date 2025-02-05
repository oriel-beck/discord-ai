import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const deleteChannels: ToolFunction<{
  channelIds: string[];
}> = async ({ guild, channelIds, member }) => {
  if (!channelIds.length)
    return {
      error: 'No channels were provided to create',
    };

  const createdChannels = [];
  const errors = [];

  for (const channelId of channelIds) {
    try {
      const existingChannel = guild.channels.cache.get(channelId);
      if (!existingChannel) {
        errors.push(`Channel ${channelId} does not exist`);
        continue;
      }

      if (!existingChannel?.permissionsFor(member).has("ManageChannels")) {
        errors.push(`You do not have permissions to delete ${channelId}`)
        continue;
      }

      await existingChannel.delete(`Requested by ${member.id}`);
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

export const permissions: PermissionsString[] = ['ManageChannels'];

export default deleteChannels;
