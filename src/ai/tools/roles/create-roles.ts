import type { ColorResolvable } from 'discord.js';
import { array, object, optional, string, z } from 'zod';
import { hexRegex, PermissionsEnum } from '../../constants.js';
import tool from '../../tool.js';
import type { ToolArguments } from '../../types.js';
import { handleTasks } from '../../util.js';

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

      return await handleTasks(promises);
    },
    {
      name: 'create_roles',
      description: 'Creates multiple Discord roles',
      schema,
      permissions: ['ManageRoles'],
    }
  );
