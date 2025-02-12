import { array, object } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments, ToolResult } from '../../types.js';

const schema = object({
  roles: array(
    object({
      userId: discordIdSchema(),
      roleIds: array(discordIdSchema()).describe("An array of role IDs to remove from 'userId'").min(1),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) => {
  return tool(
    async ({ roles }) => {
      const promises = roles.map(async roleSet => {
        if (!/\d{17,20}/.test(roleSet.userId))
          throw `${roleSet.userId} is not a valid Discord user ID. You can get the user ID from the result of the tool get_discord_member_by_username`;

        const guildMember = await guild.members.fetch(roleSet.userId);

        if (!guildMember) {
          throw `Failed to find the member ${roleSet.userId}`;
        }

        // if the current user is trying to edit another user, check
        if (member.id !== guildMember.id && guild.ownerId !== member.id && guildMember.roles.highest.position >= member.roles.highest.position) {
          throw `${member.id} cannot remove roles from ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to ${member.id}'s`;
        }

        const innerPromises = roleSet.roleIds.map(async roleId => {
          if (roleId == guild.roles.everyone.id) {
            throw `Cannot remove ${roleId} as its the @everyone role`;
          }

          const role = guild.roles.cache.get(roleId);
          if (!role) {
            throw `Role ID ${roleId} cannot be found`;
          }

          if (member.roles.highest.position <= role.position) {
            throw `${member.id} cannot remove ${roleId} as the role's position is higher or equal to their highest role`;
          }

          const me = await guild.members.fetchMe();
          if (me.roles.highest.position <= role.position) {
            throw `The bot cannot remove ${roleId} as the role's position is higher or equal to the bot's`;
          }

          return role.id;
        });

        const useableIds = (await Promise.allSettled(innerPromises)).reduce((acc, p) => (p.status === 'fulfilled' ? [...acc, p.value] : acc), [] as string[]);

        try {
          await guildMember.roles.remove(useableIds, `Requested by ${member.user.username} (${member.user.id})`);
          return `Removed ${useableIds.join(', ')} from ${roleSet.userId}.`;
        } catch (err) {
          throw `Failed ${roleSet.userId}: ${(err as Error).message}`;
        }
      });

      const tasks = await Promise.allSettled(promises);

      const addedRoles: string[] = [];
      const errors: string[] = [];
      const res: ToolResult = {};
      for (const task of tasks) {
        if (task.status === 'fulfilled') {
          addedRoles.push(task.value);
        } else {
          errors.push(task.reason);
        }
      }

      if (errors.length) res.error = errors.join('\n');
      if (addedRoles.length) res.data = addedRoles.join('\n');
      return res;
    },
    {
      name: 'remove_roles',
      description:
        'removes one or more Discord roles to the specific member by using one or more role IDs and a user IDs in an array. Used to remove one or multiple roles at a time to one or multiple users at a time, this should not be used more than once per userId.',
      schema,
    }
  );
};
