import { ChannelType, GuildChannelTypes, PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const createChannels: ToolFunction<{
  channels: {
    channelName: string;
    channelType: keyof typeof ChannelType;
    //   TODO: permissions?
  }[];
}> = async ({ guild, channels }) => {
  if (!channels.length)
    return {
      error: 'No channels were provided to create',
    };

  const createdChannels = [];
  const errors = [];

  for (const { channelName, channelType } of channels) {
    try {
      const created = await guild.channels.create({
        name: channelName,
        type: ChannelType[channelType] as GuildChannelTypes,
      });
      createdChannels.push(`Created the channel ${channelName} of type ${channelType} as ${created.name}`);
    } catch (err) {
      errors.push(`Failed to create channel ${channelName} of type ${channelType}: ${(err as Error).message}`);
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
    name: 'create_channels',
    description: 'Creates multiple Discord channels',
    strict: true,
    parameters: {
      type: 'object',
      required: ['channels'],
      additionalProperties: false,
      properties: {
        channels: {
          type: 'array',
          description: 'An array of channels to create',
          items: {
            additionalProperties: false,
            type: 'object',
            required: ['channelName', 'channelType'],
            properties: {
              channelName: {
                type: 'string',
                description: 'The name for the channel, max ',
              },
              channelType: {
                type: 'string',
                description: 'The type of the channel',
                enum: ['GuildText', 'GuildVoice', 'GuildCategory', 'GuildAnnouncement', 'GuildStageVoice', 'GuildDirectory', 'GuildForum', 'GuildMedia'],
              },
            },
          },
        },
      },
    },
  },
};

export const permission: PermissionsString = 'ManageChannels';

export default createChannels;
