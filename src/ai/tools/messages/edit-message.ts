import { object, optional, string } from 'zod';
import { discordIdSchema, embedsSchema } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  embeds: optional(embedsSchema()),
  content: optional(string().max(2000, 'Content cannot be more than 2000 characters long')),
  channelId: optional(discordIdSchema()),
  messageId: discordIdSchema(),
}).strict();

export default ({ guild, channel, member }: ToolArguments) =>
  tool(
    async ({ embeds, content, channelId, messageId }) => {
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
        const existing = await channel.messages.fetch(messageId);
        const me = await guild.members.fetchMe();
        if (existing.author.id !== me.id) return { error: `Failed to edit message: It is not sent by the bot` };
        const edited = await existing.edit({
          content,
          embeds,
        });
        return `Edited message ${JSON.stringify(edited.toJSON())}`;
      } catch (err) {
        return `Failed to edit message: ${(err as Error).message}`;
      }
    },
    {
      name: 'edit_message',
      description:
        'Edit a message in the current Discord channel or a target Discord channel, the message can contain content (plain text) alongside multiple embeds. Should only be used if the executor requested it.',
      schema,
      permissions: ['ManageGuild']
    }
  );
