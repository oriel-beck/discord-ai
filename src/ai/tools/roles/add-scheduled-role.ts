import { array, number, object, z } from 'zod';
import { addScheduledRole } from '../../../temprole/temprole-listener.js';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import type { ToolArguments } from '../../types.js';

const schema = object({
  scheduledRoles: array(
    object({
      userId: discordIdSchema(),
      roleIds: array(discordIdSchema()).describe("The roles to remove/add the/to the 'userId' at 'time'").min(1),
      howLong: number().describe('In how many seconds to add the roles to the user automatically (scheduled role).'),
      action: z.enum(['ADD', 'REMOVE']).describe('Wether to add the role after `time` or remove it after `time`'),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ scheduledRoles }) => {
      const me = await guild.members.fetchMe();

      const promises = scheduledRoles.map(async ({ userId, roleIds, howLong, action }) => {
        const added: string[] = [];
        const errors: string[] = [];
        const guildMember = await guild.members.fetch(userId);

        if (guild.ownerId !== member.id && member.roles.highest.position >= guildMember.roles.highest.position) {
          throw `The executor's position is lower or equal to '${userId}'`;
        }

        if (me.roles.highest <= guildMember.roles.highest) {
          throw `The bot's position is lower or equal to '${userId}'`;
        }

        for (const roleId of roleIds) {
          const role = guild.roles.cache.get(roleId);
          if (!role) {
            errors.push(`${roleId} does not exist`);
            continue;
          }

          if (guild.ownerId !== guildMember.id && guildMember.roles.highest.position >= role.position) {
            errors.push(`${roleId}'s position is lower or equal to the executor`);
            continue;
          }

          if (me.roles.highest.position <= role.position) {
            errors.push(`The bot's position is lower or equal to '${roleId}'`);
            continue;
          }

          added.push(roleId);
          addScheduledRole(userId, roleId, guild.id, action, howLong * 1000);
        }

        return {
          data: added.length ? `Added ${added.join(', ')} to ${userId}` : undefined,
          error: errors.length ? errors.join('\n') : undefined,
        };
      });

      const tasks = await Promise.allSettled(promises);
      const errors = [];
      const data = [];

      for (const task of tasks) {
        if (task.status === 'fulfilled') {
          if (task.value?.data) data.push(task.value.data);
          if (task.value?.error) errors.push(task.value.error);
        } else {
          errors.push(task.reason instanceof Error ? task.reason.message : task.reason);
        }
      }

      return {
        data: data.length ? data.join('\n') : undefined,
        error: errors.length ? errors.join('\n') : undefined,
      };
    },
    {
      name: 'add_scheduled_roles',
      description: 'Schedule roles to be added or removed from the user after `howLong`. This DOES NOT add or remove roles from the user.\nIf you are asked to add ROLE for X time, use add_roles to add the role instead of scheduling.\nIf you are asked to add ROLE in X time or remove a ROLE in X time then use this tool and not add_roles.',
      schema,
      permissions: ['ManageRoles'],
    }
  );
