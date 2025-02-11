import { tool } from '@langchain/core/tools';
import { PermissionsString } from 'discord.js';
import { object, optional, string } from 'zod';
import { discordIdSchema, embedsSchema } from '../../constants.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  embeds: optional(embedsSchema),
  content: optional(string().max(2000, 'Content cannot be more than 2000 characters long')),
  channelId: optional(discordIdSchema),
}).strict();

export const permissions: PermissionsString[] = ['ManageGuild'];

export default ({ guild, channel, member }: ToolArguments) =>
  tool(
    async ({ embeds, content, channelId }) => {
      if (!embeds && !content) return { error: 'Cannot send an empty message' };

      if (channelId) {
        if (!/\d{17,20}/.test(channelId)) return { error: 'Invalid channel ID' };
        const gotChannel = guild.channels.cache.get(channelId);
        if (!gotChannel) return { error: 'Cannot find the channel' };
        if (!gotChannel?.isTextBased()) return { error: 'Cannot send message to non text based channels' };
        channel = gotChannel;
      }

      if (!channel.permissionsFor(member).has('SendMessages')) return { error: `${member.id} does not have permissions to send messages in ${channelId}` };

      try {
        const sent = await channel.send({
          content,
          embeds,
        });
        return `Sent message ${JSON.stringify(sent.toJSON())}`;
      } catch (err) {
        return `Failed to send message: ${(err as Error).message}`;
      }
    },
    {
      name: 'send_message',
      description:
        'Sends a message to the current Discord channel or a target Discord channel, the message can contain content (plain text) alongside multiple embeds. Should only be used if the executor requested it.',
      schema,
    }
  );
