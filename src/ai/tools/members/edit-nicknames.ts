import { array, nullable, object, string } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import type { ToolArguments } from '../../types.js';
import { handleTasks } from '../../util.js';

const schema = object({
  members: array(
    object({
      userId: discordIdSchema(),
      nickname: nullable(string().max(32).min(1)).describe("New nickname or null to reset the userId's nickname"),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ members }) => {
      const promises = members.map(async ({ userId, nickname }) => {
        let target = await guild.members.fetch(userId);
        if (!target) throw `NotFound: ${userId}`;
        if (guild.ownerId === target.id) throw 'Cannot change the nickname of the server owner';
        if (guild.ownerId !== target.id && member.roles.highest <= target.roles.highest)
          throw 'The executor cannot edit the nickname of a member with higher permissions than them';

        const me = await guild.members.fetchMe();
        if (me.roles.highest <= target.roles.highest) throw 'You cannot edit a member with higher permissions than you';

        await target.edit({ nick: nickname, reason: `Requested by ${member.user.username} (${member.user.id})` });
      });

      return await handleTasks(promises);
    },
    {
      name: 'edit_member_nickname',
      description: "Edits a member's nickname",
      schema,
      permissions: ['ManageNicknames'],
    }
  );
