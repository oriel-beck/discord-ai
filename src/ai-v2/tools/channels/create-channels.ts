import { tool } from '@langchain/core/tools';
import { ChannelType, GuildChannelTypes, PermissionsString } from 'discord.js';
import { array, object, optional, string, z } from 'zod';
import { discordIdSchema, PermissionsEnum } from '../../constants.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  channels: array(
    object({
      channelName: string(),
      categoryId: optional(discordIdSchema).describe('The category to create the channel in'),
      channelType: z.enum(['GuildText', 'GuildAnnouncement']),
      permissionOverwrites: optional(
        array(
          object({
            allow: optional(array(z.enum(PermissionsEnum))),
            deny: optional(array(z.enum(PermissionsEnum))),
            id: discordIdSchema,
          })
        )
      ),
    }).strict()
  ),
}).strict();

export const permissions: PermissionsString[] = ['ManageChannels'];

export default ({ guild }: ToolArguments) =>
  tool(
    async ({ channels }) => {
      if (!channels.length)
        return {
          error: 'No channels were provided to create',
        };

      const promises = channels.map(async ({ channelName: name, channelType, permissionOverwrites, categoryId: parent }) => {
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
    },
    {
      name: 'create_channels',
      description: 'Creates multiple Discord channels',
      schema,
    }
  );
