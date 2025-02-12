import tool from '../../tool.js';
import { nullable, object, optional, string } from 'zod';
import { ToolArguments } from '../../types.js';
import { discordIdSchema } from '../../constants.js';

const schema = object({
  userId: discordIdSchema(),
  timeout: nullable(string().datetime()).describe('Until when to timeout this member as ISO timestamp, use the get_current_date_time function to get the current time to add onto it'),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ userId, timeout }) => {
      let target = await guild.members.fetch(userId);
      if (!target) return { error: `NotFound: ${userId}` };
      if (guild.ownerId === target.id) return { error: 'Cannot change the nickname of the server owner' };
      if (member.roles.highest <= target.roles.highest) return { error: 'Cannot edit the nickname of a user with higher permissions than the executor' };

      target = await target.edit({ communicationDisabledUntil: timeout || null });
      return { data: `Edited ${userId} to ${target.nickname}` };
    },
    {
      name: 'timeout_member',
      description: 'Timeout a member until the specified ISO timestamp',
      schema,
      permissions: ['ModerateMembers'],
    }
  );
