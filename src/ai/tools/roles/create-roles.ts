import { ColorResolvable } from 'discord.js';
import { array, object, optional, string, z } from 'zod';
import { hexRegex, PermissionsEnum } from '../../constants.js';
import tool from '../../tool.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  roles: array(
    object({
      roleName: string().max(100).describe('The name for the role'),
      roleColor: optional(string().regex(hexRegex, 'roleColor must be a valid hex code (#XXXXXX)')).describe('The color to give the role, in hex format'),
      rolePermissions: optional(z.enum(PermissionsEnum)).describe('The permissions the role should have as an array of permission names'),
    }).strict()
  ),
}).strict();

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ roles }) => {
      const promises = roles.map(async ({ roleName, roleColor, rolePermissions }) => {
        if (roleName.length > 100) {
          throw `${roleName} cannot be longer than 100 characters`;
        }

        try {
          const role = await guild.roles.create({
            name: roleName,
            color: (roleColor as ColorResolvable) || undefined,
            permissions: rolePermissions || [],
            reason: `Requested by ${member.user.username} (${member.user.id})`,
          });
          return `Created ${role.name} - ${role.color} - ${role.id}`;
        } catch (err) {
          throw `Failed ${roleName}: ${(err as Error).message}`;
        }
      });

      const tasks = await Promise.allSettled(promises);

      const createdRoles: string[] = [];
      const errors: string[] = [];
      for (const task of tasks) {
        if (task.status === 'fulfilled') {
          createdRoles.push(task.value);
        } else {
          errors.push(task.reason);
        }
      }

      return {
        data: createdRoles.length ? createdRoles.join('\n') : undefined,
        error: errors.length ? errors.join('\n') : undefined,
      };
    },
    {
      name: 'create_roles',
      description: 'Creates multiple Discord roles',
      schema,
      permissions: ['ManageRoles'],
    }
  );
