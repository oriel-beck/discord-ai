import { tool } from '@langchain/core/tools';
import { PermissionsString } from 'discord.js';
import { object, optional } from 'zod';
import { discordIdSchema } from '../../constants.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  channelId: optional(discordIdSchema).describe('The channel ID to get the message from'),
  messageId: discordIdSchema,
}).strict();

export const permissions: PermissionsString[] = ['ManageGuild'];

export default ({ channel, guild }: ToolArguments) =>
  tool(
    async ({ channelId, messageId }) => {
      if (channelId) {
        if (!/\d{17,20}/.test(channelId)) return { error: 'Invalid channel ID' };
        const gotChannel = guild.channels.cache.get(channelId);
        if (!gotChannel) return { error: 'Cannot find the channel' };
        if (!gotChannel?.isTextBased()) return { error: 'Cannot get message in a non text based channels' };
        channel = gotChannel;
      }

      try {
        const message = await channel.messages.fetch(messageId);
        return `Got message ${JSON.stringify(message.toJSON())}`;
      } catch (err) {
        return `Failed to get message: ${(err as Error).message}`;
      }
    },
    {
      name: 'get_message',
      description: 'Gets a message in the current Discord channel or a target Discord channel.',
      schema,
    }
  );
