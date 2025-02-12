import { array, object } from 'zod';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments, ToolResult } from '../../types.js';

const schema = object({
  roles: array(
    object({
      userId: discordIdSchema(),
      roleIds: array(discordIdSchema()).describe("The roles to add to the 'userId'").min(1),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ roles }) => {
      const promises = roles.map(async roleSet => {
        const guildMember = await guild.members.fetch(roleSet.userId);

        if (!guildMember) {
          throw `Failed to find the member ${roleSet.userId}`;
        }

        // if the current user is trying to edit another user, check
        if (member.id !== guildMember.id && guild.ownerId !== member.id && guildMember.roles.highest.position >= member.roles.highest.position) {
          throw `${member.id} cannot add roles to ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to ${member.id}'s`;
        }

        const innerPromises = roleSet.roleIds.map(async roleId => {
          if (roleId == guild.roles.everyone.id) {
            throw `Cannot add ${roleId} as its the @everyone role`;
          }

          const role = guild.roles.cache.get(roleId);
          if (!role) {
            throw `Role ID ${roleId} cannot be found`;
          }

          if (member.roles.highest.position <= role.position) {
            throw `${member.id} cannot add ${roleId} as the role's position is higher or equal to their highest role`;
          }

          const me = await guild.members.fetchMe();
          if (me.roles.highest.position <= role.position) {
            throw `The bot cannot add ${roleId} as the role's position is higher or equal to the bot's`;
          }

          return role.id;
        });

        const useableIds = (await Promise.allSettled(innerPromises)).reduce((acc, p) => (p.status === 'fulfilled' ? [...acc, p.value] : acc), [] as string[]);

        try {
          await guildMember.roles.add(useableIds, `Requested by ${member.user.username} (${member.user.id})`);
          return `Added ${useableIds.join(', ')} to ${roleSet.userId}.`;
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
      name: 'add_roles',
      description:
        'Adds one or more Discord roles to the specific member by using one or more role IDs and a user IDs in an array. Used to add one or multiple roles at a time to one or multiple users at a time, this should not be used more than once per userId.',
      schema,
      permissions: ['ManageRoles']
    }
  );
