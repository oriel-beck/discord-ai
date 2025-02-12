import tool from '../../tool.js';
import { object, optional, string } from 'zod';
import { ToolArguments } from '../../types.js';
import { discordIdSchema } from '../../constants.js';

const schema = object({
  userId: discordIdSchema(),
  nickname: optional(string().max(32).min(1)).describe("New nickname or null to reset the userId's nickname"),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ userId, nickname }) => {
      let target = await guild.members.fetch(userId);
      if (!target) return { error: `NotFound: ${userId}` };
      if (guild.ownerId === target.id) return { error: 'Cannot change the nickname of the server owner' };
      if (member.roles.highest <= target.roles.highest) return { error: 'Cannot edit the nickname of a user with higher permissions than the executor' };

      target = await target.edit({ nick: nickname });
      return { data: `Edited ${userId} to ${target.nickname}` };
    },
    {
      name: 'edit_member_nickname',
      description: "Edits a member's nickname",
      schema,
      permissions: ['ManageNicknames'],
    }
  );
