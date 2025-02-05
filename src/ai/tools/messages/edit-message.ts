import { APIEmbed, PermissionsString } from 'discord.js';
import { ToolFunction } from '../../types.js';
import OpenAI from 'openai';
import { embedDefinition } from '../../constants.js';

const editMessage: ToolFunction<{
  messageId: string;
  embeds: APIEmbed[];
  content?: string;
  channelId?: string;
}> = async ({ messageId, channel, embeds, content, channelId, guild, member }) => {
  if (!embeds && !content) return { error: 'Cannot edit to an empty message' };

  if (channelId) {
    if (!/\d{17,20}/.test(channelId)) return { error: 'Invalid channel ID' };
    const gotChannel = guild.channels.cache.get(channelId);
    if (!gotChannel) return { error: 'Cannot find the channel' };
    if (!gotChannel?.isTextBased()) return { error: 'Cannot edit messages in non text based channels' };
    channel = gotChannel;
  }

  if (!channel.permissionsFor(member).has('SendMessages')) return { error: `${member.id} does not have permissions to send messages in ${channelId}` };

  try {
    const existing = channel.messages.cache.get(messageId) || (await channel.messages.fetch(messageId));
    const edited = await existing.edit({
      content,
      embeds,
    });
    return { data: `Edited message ${JSON.stringify(edited.toJSON())}` };
  } catch (err) {
    return { error: `Failed to edit message: ${(err as Error).message}` };
  }
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'edit_message',
    description:
      'Edit a message in the current Discord channel or a target Discord channel, the message can contain content (plain text) alongside multiple embeds. Should only be used if the executor requested it.',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['messageId'],
      properties: {
        messageId: {
          type: 'string',
          description: 'The message Id of the message to edit.',
        },
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

export const permissions: PermissionsString[] = ['ManageGuild'];

export default editMessage;
