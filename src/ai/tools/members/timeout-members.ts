import { array, nullable, object, string } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import type { ToolArguments } from '../../types.js';
import { handleTasks } from '../../util.js';

const schema = object({
  members: array(
    object({
      userId: discordIdSchema(),
      timeout: nullable(string().datetime()).describe(
        'Until when to timeout this member as ISO timestamp, use the get_current_date_time tool to get the current time to add onto it'
      ),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ members }) => {
      const promises = members.map(async ({ userId, timeout }) => {
        let target = await guild.members.fetch(userId);
        if (!target) throw `NotFound: ${userId}`;
        if (guild.ownerId === target.id) throw 'Cannot change the nickname of the server owner';
        if (member.roles.highest <= target.roles.highest) throw 'Cannot edit the nickname of a user with higher permissions than the executor';

        target = await target.edit({ communicationDisabledUntil: timeout || null, reason: `Requested by ${member.user.username} (${member.user.id})` });
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
