import { ColorResolvable } from 'discord.js';
import { array, object, optional, string, z } from 'zod';
import { discordIdSchema, hexRegex, PermissionsEnum } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  roles: array(
    object({
      roleName: optional(string().max(100)).describe('The name for the role'),
      roleColor: optional(string().regex(hexRegex, 'roleColor must be a valid hex code (#XXXXXX)')).describe(
        'The color to give the role, in hex format'
      ),
      roleId: discordIdSchema(),
      rolePermissions: optional(z.enum(PermissionsEnum)).describe('The permissions the role should have as an array of permission names'),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ roles }) => {
      const promises = roles.map(async ({ roleName, roleColor, rolePermissions, roleId }) => {
        if (roleId == guild.roles.everyone.id) {
          if (roleColor || roleName) {
            throw `Cannot edit ${roleId}'s color and name as it's the @everyone role`;
          }
        }

        const role = guild.roles.cache.get(roleId);
        if (!role) {
          throw `Role ID ${roleId} cannot be found`;
        }

        if (member.roles.highest.position <= role.position) {
          throw `${member.id} can't edit ${roleId} as the role's position is higher or equal to their highest role`;
        }

        const me = await guild.members.fetchMe();
        if (me.roles.highest.position <= role.position) {
          throw `The bot cannot add ${roleId} as the role's position is higher or equal to its highest role`;
        }

        try {
          const role = await guild.roles.edit(roleId, {
            name: roleName || undefined,
            color: (roleColor as ColorResolvable) || undefined,
            permissions: rolePermissions || [],
            reason: `Requested by ${member.user.username} (${member.user.id})`
          });
          return `Edited ${role.id}: ${JSON.stringify(role.toJSON())}`;
        } catch (err) {
          throw `Failed ${roleId}: ${(err as Error).message}`;
        }
      });

      const tasks = await Promise.allSettled(promises);

      const editedRoles: string[] = [];
      const errors: string[] = [];
      for (const task of tasks) {
        if (task.status === 'fulfilled') {
          editedRoles.push(task.value);
        } else {
          errors.push(task.reason);
        }
      }

      return {
        data: editedRoles.length ? editedRoles.join('\n') : undefined,
        error: errors.length ? errors.join('\n') : undefined,
      };
    },
    {
      name: 'edit_roles',
      description: 'Edits multiple Discord roles',
      schema,
      permissions: ['ManageRoles']
    }
  );
