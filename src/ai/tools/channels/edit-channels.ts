import { ChannelType, GuildChannelEditOptions, OverwriteResolvable, PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { PermissionsEnum, validateStringArray } from '../../constants.js';
import { ToolFunction } from '../../types.js';

const editChannels: ToolFunction<{
  channels: {
    channelName: string;
    categoryId: string;
    channelType: keyof typeof ChannelType;
    permissionOverwrites: OverwriteResolvable[];
    channelId: string;
  }[];
}> = async ({ guild, channels, member }) => {
  if (!channels.length)
    return {
      error: 'No channels were provided to create',
    };

  const promises = channels.map(async ({ channelName, channelType, permissionOverwrites, categoryId, channelId }) => {
    const existingChannel = guild.channels.cache.get(channelId);
    if (!existingChannel) {
      throw `Channel ${channelId} does not exist`;
    }

    if (!existingChannel?.permissionsFor(member).has('ManageChannels')) {
      throw `You do not have permissions to edit ${channelId}`;
    }

    const validOverwrites = permissionOverwrites.some(overwrite => {
      if (!overwrite.allow && !overwrite.deny) return false;
      if (overwrite.deny && !validateStringArray(overwrite.deny)) return false;
      if (overwrite.allow && !validateStringArray(overwrite.allow)) return false;
      return true;
    });
    if (!validOverwrites) throw `Invalid permissions overwrites for ${name}`;

    try {
      const edited = await existingChannel.edit({
        name: channelName || undefined,
        type: channelType ? (ChannelType[channelType] as GuildChannelEditOptions['type']) : undefined,
        permissionOverwrites: permissionOverwrites || undefined,
        parent: categoryId || undefined,
        reason: `Requested by ${member.id}`,
      });
      return `Edited ${edited.id}`;
    } catch (err) {
      throw `Failed ${channelId}: ${(err as Error).message}`;
    }
  });

  const editedChannels: string[] = [];
  const errors: string[] = [];

  const tasks = await Promise.allSettled(promises);
  for (const task of tasks) {
    if (task.status === 'fulfilled') {
      editedChannels.push(task.value);
    } else {
      errors.push(task.reason);
    }
  }

  return {
    data: editedChannels.length ? editedChannels.join('\n') : undefined,
    error: errors.length ? errors.join('\n') : undefined,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'edit_channels',
    description: 'Edits multiple Discord channels',
    strict: true,
    parameters: {
      type: 'object',
      required: ['channels'],
      additionalProperties: false,
      properties: {
        channels: {
          type: 'array',
          description: 'An array of channels to edit',
          items: {
            additionalProperties: false,
            type: 'object',
            required: ['channelName', 'channelType', 'categoryId', 'permissionOverwrites', 'channelId'],
            properties: {
              channelName: {
                type: ['string', 'null'],
                description: 'The name for the channel, max length 100 characters. null when not requested to change.',
              },
              channelType: {
                type: ['string', 'null'],
                description: 'The type of the channel. null when not requested to change.',
                enum: ['GuildText', 'GuildAnnouncement'],
              },
              categoryId: {
                type: ['string', 'null'],
                description: 'The category this channel should be moved to. null when not requested to change.',
              },
              permissionOverwrites: {
                type: ['array', 'null'],
                description: 'An array of permission overwrites for the channel being created. null when not requested to change.',
                items: {
                  type: 'object',
                  description: 'Permissions for roles/users in this channel',
                  additionalProperties: false,
                  required: ['allow', 'deny', 'id'],
                  properties: {
                    allow: {
                      type: 'array',
                      description: 'The permissions to allow the role/user in this channel',
                      items: {
                        type: 'string',
                        enum: PermissionsEnum,
                      },
                    },
                    deny: {
                      type: 'array',
                      description: 'The permissions to deny the role/user in this channel',
                      items: {
                        type: 'string',
                        enum: PermissionsEnum,
                      },
                    },
                    id: {
                      type: 'string',
                      description: 'The ID of the role/user to apply the permission overwrites to, use the server ID for @everyone',
                    },
                  },
                },
              },
              channelId: {
                type: 'string',
                description: 'The channel Id to edit',
              },
            },
          },
        },
      },
    },
  },
};

export const permissions: PermissionsString[] = ['ManageChannels'];

export default editChannels;
