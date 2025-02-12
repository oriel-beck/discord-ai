import { ChannelType, GuildChannelEditOptions } from 'discord.js';
import { array, object, optional, string, z } from 'zod';
import { discordIdSchema, PermissionsEnum } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  channels: array(
    object({
      channelName: string(),
      categoryId: optional(discordIdSchema()).describe('The category to move the channel to'),
      channelType: z.enum(['GuildText', 'GuildAnnouncement']),
      channelId: discordIdSchema(),
      permissionOverwrites: optional(
        array(
          object({
            allow: optional(array(z.enum(PermissionsEnum))),
            deny: optional(array(z.enum(PermissionsEnum))),
            id: discordIdSchema(),
          }).strict()
        )
      ),
    })
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ channels }) => {
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
    },
    {
      name: 'edit_channels',
      description: 'Edits multiple Discord channels',
      schema,
      permissions: ['ManageChannels']
    }
  );
