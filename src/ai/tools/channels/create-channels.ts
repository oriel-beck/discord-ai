import { ChannelType, GuildChannelTypes, OverwriteResolvable, PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';
import { PermissionsEnum } from '../../constants.js';

const createChannels: ToolFunction<{
  channels: {
    channelName: string;
    categoryId: string;
    channelType: keyof typeof ChannelType;
    permissionOverwrites: OverwriteResolvable[];
  }[];
}> = async ({ guild, channels }) => {
  if (!channels.length)
    return {
      error: 'No channels were provided to create',
    };

  const createdChannels = [];
  const errors = [];

  for (const { channelName: name, channelType, permissionOverwrites, categoryId: parent } of channels) {
    try {
      const created = await guild.channels.create({
        name,
        parent,
        permissionOverwrites,
        type: ChannelType[channelType] as GuildChannelTypes,
      });
      createdChannels.push(`Created the channel ${name} of type ${channelType} as ${created.name}`);
    } catch (err) {
      errors.push(`Failed to create channel ${name} of type ${channelType}: ${(err as Error).message}`);
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
            required: ['channelName', 'channelType', 'categoryId', 'permissionOverwrites'],
            properties: {
              channelName: {
                type: 'string',
                description: 'The name for the channel, max length 100 characters',
              },
              channelType: {
                type: 'string',
                description: 'The type of the channel',
                enum: ['GuildText', 'GuildVoice', 'GuildCategory', 'GuildAnnouncement', 'GuildStageVoice', 'GuildDirectory', 'GuildForum', 'GuildMedia'],
              },
              categoryId: {
                type: ['string', 'null'],
                description: 'The category this channel should be created in',
              },
              permissionOverwrites: {
                type: 'array',
                description: 'An array of permission overwrites for the channel being created',
                items: {
                  type: 'object',
                  description: 'Permissions for roles/users in this channel',
                  additionalProperties: false,
                  required: ['allow', 'deny', 'id'],
                  properties: {
                    allow: {
                      type: 'string',
                      description: 'The permissions to allow the role/user in this channel',
                      enum: PermissionsEnum,
                    },
                    deny: {
                      type: 'string',
                      description: 'The permissions to deny the role/user in this channel',
                      enum: PermissionsEnum,
                    },
                    id: {
                      type: 'string',
                      description: 'The ID of the role/user to apply the permission overwrites to, use the server ID for @everyone',
                    },
                  },
                },
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
