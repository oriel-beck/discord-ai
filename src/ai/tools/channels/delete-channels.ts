import tool from '../../tool.js';
import { PermissionsString } from 'discord.js';
import { array, object } from 'zod';
import { discordIdSchema } from '../../constants.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  channelIds: array(discordIdSchema()),
}).strict();

export const permissions: PermissionsString[] = ['ManageChannels'];

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ channelIds }) => {
      if (!channelIds.length)
        return {
          error: 'No channels were provided to create',
        };

      const promises = channelIds.map(async channelId => {
        const existingChannel = guild.channels.cache.get(channelId);
        if (!existingChannel) {
          throw `Channel ${channelId} does not exist`;
        }

        if (!existingChannel?.permissionsFor(member).has('ManageChannels')) {
          throw `You do not have permissions to delete ${channelId}`;
        }

        try {
          await existingChannel.delete(`Requested by ${member.id}`);
          return `Deleted ${channelId}`;
        } catch (err) {
          throw `Failed ${channelId}: ${(err as Error).message}`;
        }
      });

      const deletedchannels: string[] = [];
      const errors: string[] = [];

      const tasks = await Promise.allSettled(promises);
      for (const task of tasks) {
        if (task.status === 'fulfilled') {
          deletedchannels.push(task.value);
        } else {
          errors.push(task.reason);
        }
      }

      return {
        data: deletedchannels.length ? deletedchannels.join('\n') : undefined,
        error: errors.length ? errors.join('\n') : undefined,
      };
    },
    {
      name: 'delete_channels',
      description: 'Deletes multiple Discord channels',
      schema,
    }
  );
