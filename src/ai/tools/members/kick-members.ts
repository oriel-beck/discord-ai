import { array, object, optional, string } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';
import { handleTasks } from '../../util.js';

const schema = object({
  members: array(
    object({
      memberId: discordIdSchema(),
      reason: optional(string().max(512)).describe("The reason for kicking 'memberId'"),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ members }) => {
      const promises = members.map(async ({ memberId, reason }) => {
        reason ??= `Requested by ${member.user.username} (${member.user.id})`;
        let target = await guild.members.fetch(memberId);
        if (!target?.kickable) return { error: `Unable to kick ${target.id}` };
        if (guild.ownerId === target.id) return { error: 'Cannot kick the server owner' };
        if (guild.ownerId !== target.id && member.roles.highest <= target.roles.highest)
          return { error: 'The executor cannot kick a member with higher permissions than them' };

        const me = await guild.members.fetchMe();
        if (me.roles.highest <= target.roles.highest) return { error: 'You cannot kick a member with higher permissions than you' };

        target = await target.ban({ reason });
      });

      return await handleTasks(promises);
    },
    {
      name: 'kick_member',
      description: 'kicks members from the current server',
      schema,
      permissions: ['BanMembers'],
    }
  );
