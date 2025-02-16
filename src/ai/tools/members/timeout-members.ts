import { array, nullable, number, object } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import type { ToolArguments } from '../../types.js';
import { handleTasks } from '../../util.js';

const schema = object({
  members: array(
    object({
      userId: discordIdSchema(),
      howLong: nullable(number()).describe('For how long to timeout this member in seconds'),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ members }) => {
      const promises = members.map(async ({ userId, howLong }) => {
        let target = await guild.members.fetch(userId);
        if (!target) throw `NotFound: ${userId}`;
        if (guild.ownerId === target.id) throw 'Cannot change the nickname of the server owner';
        if (member.roles.highest <= target.roles.highest) throw 'Cannot edit the nickname of a user with higher permissions than the executor';

        target = await target.edit({
          communicationDisabledUntil: howLong ? Date.now() + howLong * 1000 : null,
          reason: `Requested by ${member.user.username} (${member.user.id})`,
        });
        return `Timed out ${userId} until ${target.communicationDisabledUntil?.toISOString()}`;
      });

      return await handleTasks(promises);
    },
    {
      name: 'timeout_members',
      description: 'Timeout multiple members until the specified ISO timestamps',
      schema,
      permissions: ['ModerateMembers'],
    }
  );
