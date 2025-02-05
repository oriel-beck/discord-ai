import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const getMessage: ToolFunction<{
  messageId: string;
  channelId?: string;
}> = async ({ messageId, channel, channelId, guild }) => {
  if (channelId) {
    if (!/\d{17,20}/.test(channelId)) return { error: 'Invalid channel ID' };
    const gotChannel = guild.channels.cache.get(channelId);
    if (!gotChannel) return { error: 'Cannot find the channel' };
    if (!gotChannel?.isTextBased()) return { error: 'Cannot get message in a non text based channels' };
    channel = gotChannel;
  }

  try {
    const message = await channel.messages.fetch(messageId);
    return { data: `Got message ${JSON.stringify(message.toJSON())}` };
  } catch (err) {
    return { error: `Failed to get message: ${(err as Error).message}` };
  }
};


export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_message',
    description:
      'Gets a message in the current Discord channel or a target Discord channel.',
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
      },
    },
  },
};

export const permissions: PermissionsString[] = ['ManageGuild'];

export default getMessage;
