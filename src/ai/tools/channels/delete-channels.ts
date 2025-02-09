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

  const promises = channelIds.map(async channelId => {
    const existingChannel = guild.channels.cache.get(channelId);
    if (!existingChannel) {
      throw `Channel ${channelId} does not exist`;
    }

    if (!existingChannel?.permissionsFor(member).has('ManageChannels')) {
      throw `You do not have permissions to delete ${channelId}`;
    }

    try {
      await existingChannel.delete(`Requested by ${member.id}`);
      return `Deleted ${channelId}`;
    } catch (err) {
      throw `Failed ${channelId}: ${(err as Error).message}`;
    }
  });

  const deletedchannels: string[] = [];
  const errors: string[] = [];

  const tasks = await Promise.allSettled(promises);
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      deletedchannels.push(task.value);
    } else {
      errors.push(task.reason);
    }
  }

  return {
    data: deletedchannels.length ? deletedchannels.join('\n') : undefined,
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
