import { array, number, object, optional, string } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';
import { handleTasks } from '../../util.js';

const schema = object({
  users: array(
    object({
      userId: discordIdSchema(),
      deleteSeconds: optional(number()).describe("The amount of seconds back to delete messages from 'userId'"),
      reason: optional(string().max(512)).describe("The reason for banning 'userId'"),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ users }) => {
      // You can ban users too
      const promises = users.map(async ({ userId, deleteSeconds, reason }) => {
        reason ??= `Requested by ${member.user.username} (${member.user.id})`;
        const target = await guild.members.fetch(userId).catch(() => null);
        if (target) {
          if (!target.bannable) throw `Unable to ban ${target.id}`;
          if (guild.ownerId === target.id) throw 'Cannot ban the server owner';
          if (guild.ownerId !== target.id && member.roles.highest <= target.roles.highest)
            throw 'The executor cannot ban a member with higher permissions than them';

          const me = await guild.members.fetchMe();
          if (me.roles.highest <= target.roles.highest) throw 'You cannot ban a member with higher permissions than you';

          await target.ban({ deleteMessageSeconds: deleteSeconds, reason });
        } else {
          await guild.bans.create(userId, { deleteMessageSeconds: deleteSeconds, reason });
        }
      });

      return await handleTasks(promises);
    },
    {
      name: 'ban_members',
      description: 'bans members from the current server',
      schema,
      permissions: ['BanMembers'],
    }
  );
