import tool from '../../tool.js';
import { nullable, object, optional, string } from 'zod';
import { ToolArguments } from '../../types.js';
import { discordIdSchema } from '../../constants.js';

const schema = object({
  userId: discordIdSchema(),
  nickname: nullable(string().max(32).min(1)).describe("New nickname or null to reset the userId's nickname"),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ userId, nickname }) => {
      let target = await guild.members.fetch(userId);
      if (!target) return { error: `NotFound: ${userId}` };
      if (guild.ownerId === target.id) return { error: 'Cannot change the nickname of the server owner' };
      if (guild.ownerId !== target.id && member.roles.highest <= target.roles.highest)
        return { error: 'The executor cannot edit the nickname of a member with higher permissions than them' };

      const me = await guild.members.fetchMe();
      if (me.roles.highest <= target.roles.highest) return { error: 'You cannot edit a member with higher permissions than you' };

      target = await target.edit({ nick: nickname, reason: `Requested by ${member.user.username} (${member.user.id})` });
      return { data: `Edited ${userId} to ${target.nickname}` };
    },
    {
      name: 'edit_member_nickname',
      description: "Edits a member's nickname",
      schema,
      permissions: ['ManageNicknames'],
    }
  );
