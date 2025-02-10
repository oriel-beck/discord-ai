import { ChannelType, GuildChannelTypes, OverwriteResolvable, PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { PermissionsEnum, validateStringArray } from '../../constants.js';
import { ToolFunction } from '../../types.js';

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

  const promises = channels.map(async ({ channelName: name, channelType, permissionOverwrites, categoryId: parent }) => {
    const validOverwrites = permissionOverwrites.some(overwrite => {
      if (!overwrite.allow && !overwrite.deny) return false;
      if (overwrite.deny && !validateStringArray(overwrite.deny)) return false;
      if (overwrite.allow && !validateStringArray(overwrite.allow)) return false;
      return true;
    });
    if (!validOverwrites) throw `Invalid permissions overwrites for ${name}`;
    
    try {
      const created = await guild.channels.create({
        name,
        parent,
        permissionOverwrites,
        type: ChannelType[channelType] as GuildChannelTypes,
      });
      return `Created ${name} - ${channelType} as ${created.name}`;
    } catch (err) {
      throw `Failed ${name} of type ${channelType}: ${(err as Error).message}`;
    }
  });

  const createdChannels: string[] = [];
  const errors: string[] = [];

  const tasks = await Promise.allSettled(promises);
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      createdChannels.push(task.value);
    } else {
      errors.push(task.reason);
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

export const permissions: PermissionsString[] = ['ManageChannels'];

export default createChannels;
