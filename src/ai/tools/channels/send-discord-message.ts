import { APIEmbed, PermissionsString } from 'discord.js';
import { ToolFunction } from '../../types.js';
import OpenAI from 'openai';

const sendDiscordMessage: ToolFunction<{
  embeds: APIEmbed[];
  content?: string;
  channelId?: string;
}> = async ({ channel, embeds, content, channelId, guild }) => {
  console.log('Sending embed to', channelId || 'Current Channel', 'in', guild.id);
  if (channelId) {
    if (!/\d{17,20}/.test(channelId)) return { error: 'Invalid channel ID' };
    const gotChannel = guild.channels.cache.get(channelId);
    if (!gotChannel) return { error: 'Cannot find the channel' };
    if (!gotChannel?.isTextBased()) return { error: 'Cannot send message to non text based channels' };
    channel = gotChannel;
  }

  try {
    await channel.send({
      content,
      embeds,
    });
    return { data: 'Sent message' };
  } catch (err) {
    return { error: `Failed to send message: ${(err as Error).message}` };
  }
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'send_message',
    description:
      'Sends a message to the current Discord channel or a target Discord channel, the message can contain content (plain text) alongside multiple embeds. Should only be used if the executor requested it.',
    parameters: {
      type: 'object',
      required: ['content', 'embeds'],
      additionalProperties: false,
      properties: {
        channelId: {
          type: 'string',
          description: 'The ID of the channel to send the embed message to',
        },
        content: {
          type: 'string',
          description: 'The content (plain text) of the message',
        },
        embeds: {
          type: 'array',
          items: {
            additionalProperties: false,
            type: 'object',
            required: ['title', 'description', 'url', 'timestamp', 'color', 'footer', 'image', 'thumbnail', 'author', 'fields'],
            properties: {
              title: {
                type: 'string',
                description: 'Title of the embed (256 characters limit)',
              },
              description: {
                type: 'string',
                description: 'Description of the embed (4096 characters limit)',
              },
              url: {
                type: 'string',
                description: 'URL of the embed',
              },
              timestamp: {
                type: 'string',
                description: 'Timestamp of the embed content',
              },
              color: {
                type: 'number',
                description: 'Color code of the embed',
              },
              footer: {
                type: 'object',
                description: 'Footer information',
                required: ['text', 'icon_url'],
                additionalProperties: false,
                properties: {
                  text: {
                    type: 'string',
                    description: 'Footer text (2048 characters limit)',
                  },
                  icon_url: {
                    type: ['string', 'null'],
                    description: 'URL of footer icon',
                  },
                },
              },
              image: {
                type: 'object',
                description: 'Image information',
                required: ['url'],
                additionalProperties: false,
                properties: {
                  url: {
                    type: 'string',
                    description: 'URL of the image',
                  },
                },
              },
              thumbnail: {
                type: 'object',
                required: ['url'],
                description: 'Thumbnail information',
                additionalProperties: false,
                properties: {
                  url: {
                    type: 'string',
                    description: 'URL of the thumbnail',
                  },
                },
              },
              author: {
                type: 'object',
                required: ['name', 'url', 'icon_url'],
                description: 'Author information',
                additionalProperties: false,
                properties: {
                  name: {
                    type: 'string',
                    description: 'Name of the author (256 characters limit)',
                  },
                  url: {
                    type: ['string', 'null'],
                    description: 'URL of the author',
                  },
                  icon_url: {
                    type: ['string', 'null'],
                    description: 'URL of author icon',
                  },
                },
              },
              fields: {
                type: 'array',
                description: 'Fields information (only up to 25 fields)',
                items: {
                  type: 'object',
                  required: ['name', 'value', 'inline'],
                  additionalProperties: false,
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Field name (256 characters limit)',
                    },
                    value: {
                      type: 'string',
                      description: 'Field value (1024 characters limit)',
                    },
                    inline: {
                      type: ['boolean', 'null'],
                      description: 'Whether the field is inline',
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

export const permission: PermissionsString = 'ManageGuild';

export default sendDiscordMessage;
