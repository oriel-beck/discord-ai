import { number, object, optional, string } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  userId: discordIdSchema(),
  deleteSeconds: optional(number()).describe("The amount of seconds back to delete messages from 'userId'"),
  reason: optional(string().max(32).min(1)).describe("The reason for banning 'userId'"),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ userId, deleteSeconds, reason }) => {
      reason ??= `Requested by ${member.user.username} (${member.user.id})`;
      // You can ban users too
      let target = await guild.members.fetch(userId).catch(() => null);
      if (target) {
        if (!target.bannable) return { error: `Unable to ban ${target.id}` };
        if (guild.ownerId === target.id) return { error: 'Cannot change the nickname of the server owner' };
        if (guild.ownerId !== target.id && member.roles.highest <= target.roles.highest)
          return { error: 'The executor cannot edit the nickname of a member with higher permissions than them' };

        const me = await guild.members.fetchMe();
        if (me.roles.highest <= target.roles.highest) return { error: 'You cannot edit a member with higher permissions than you' };

        target = await target.ban({ deleteMessageSeconds: deleteSeconds, reason });
      } else {
        await guild.bans.create(userId, { deleteMessageSeconds: deleteSeconds, reason });
      }
      return { data: `Banned ${userId}` };
    },
    {
      name: 'ban_member',
      description: 'bans a member from the current server',
      schema,
      permissions: ['BanMembers'],
    }
  );
