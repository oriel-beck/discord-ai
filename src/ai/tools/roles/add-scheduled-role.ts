import { array, date, object, string, z } from 'zod';
import { addScheduledRole } from '../../../temprole/temprole-listener.js';
import { discordIdSchema } from '../../constants.js';
import tool from '../../tool.js';
import type { ToolArguments } from '../../types.js';

const schema = object({
  scheduledRoles: array(
    object({
      userId: discordIdSchema(),
      roleIds: array(discordIdSchema()).describe("The roles to remove/add the/to the 'userId' at 'time'").min(1),
      time: string()
        .datetime()
        .refine(date => new Date(date) > new Date(), {
          message: 'Date must be in the future, use `get_current_date_time` to get the current date to add onto',
        })
        .describe(
          'When to remove/add the roles from/to the user automatically (scheduled role). use the get_current_date_time tool to get the current time to add onto it'
        ),
      action: z.enum(['ADD', 'REMOVE']).describe('Wether to add the role after `time` or remove it after `time`'),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ scheduledRoles }) => {
      const me = await guild.members.fetchMe();

      const promises = scheduledRoles.map(async ({ userId, roleIds, time, action }) => {
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
          addScheduledRole(userId, roleId, guild.id, action, new Date(time!).getTime() - new Date().getTime());
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
      description:
        'Adds scheduled roles which will be removed/added from/to the user after `time`. Can be used to remove multiple roles in X time or add multiple roles in X time. can used in conjunction with add_roles',
      schema,
      permissions: ['ManageRoles'],
    }
  );
