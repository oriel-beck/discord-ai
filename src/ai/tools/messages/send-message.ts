import { APIEmbed, PermissionsString } from 'discord.js';
import { ToolFunction } from '../../types.js';
import OpenAI from 'openai';
import { embedDefinition } from '../../constants.js';

const sendMessage: ToolFunction<{
  embeds: APIEmbed[];
  content?: string;
  channelId?: string;
}> = async ({ channel, embeds, content, channelId, guild }) => {
  console.log('Sending embed to', channelId || 'Current Channel', 'in', guild.id);
  if (!embeds && !content) return { error: 'Cannot send an empty message' };

  if (channelId) {
    if (!/\d{17,20}/.test(channelId)) return { error: 'Invalid channel ID' };
    const gotChannel = guild.channels.cache.get(channelId);
    if (!gotChannel) return { error: 'Cannot find the channel' };
    if (!gotChannel?.isTextBased()) return { error: 'Cannot send message to non text based channels' };
    channel = gotChannel;
  }

  try {
    const sent = await channel.send({
      content,
      embeds,
    });
    return { data: `Sent message ${JSON.stringify(sent.toJSON())}` };
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
        embeds: embedDefinition,
      },
    },
  },
};

export const permission: PermissionsString = 'ManageGuild';

export default sendMessage;
