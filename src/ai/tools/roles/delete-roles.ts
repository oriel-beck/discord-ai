import tool from '../../tool.js';
import { PermissionsString } from 'discord.js';
import { array, object } from 'zod';
import { discordIdSchema } from '../../constants.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  roleIds: array(discordIdSchema()).describe('An array of roles to delete'),
}).strict();

export const permissions: PermissionsString[] = ['ManageRoles'];

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ roleIds }) => {
      const promises = roleIds.map(async roleId => {
        if (roleId == guild.roles.everyone.id) {
          throw `Cannot delete ${roleId} as it's the @everyone role`;
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          throw `Role ID ${roleId} cannot be found`;
        }

        if (member.roles.highest.position <= role.position) {
          throw `${member.id} can't delete ${roleId} as the role's position is higher or equal to their highest role`;
        }

        const me = await guild.members.fetchMe();
        if (me.roles.highest.position <= role.position) {
          throw `The bot cannot add ${roleId} as the role's position is higher or equal to its highest role`;
        }

        try {
          await guild.roles.delete(roleId);
          return roleId;
        } catch (err) {
          throw `Failed ${roleId}: ${(err as Error).message}`;
        }
      });

      const tasks = await Promise.allSettled(promises);

      const deletedRoles: string[] = [];
      const errors: string[] = [];
      for (const task of tasks) {
        if (task.status === 'fulfilled') {
          deletedRoles.push(task.value);
        } else {
          errors.push(task.reason);
        }
      }

      return {
        data: deletedRoles.length ? `Deleted the roles ${deletedRoles.join(', ')}` : undefined,
        error: errors.length ? errors.join('\n') : undefined,
      };
    },
    {
      name: 'delete_roles',
      description: 'Deletes multiple Discord roles',
      schema,
    }
  );
