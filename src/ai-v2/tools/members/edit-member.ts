import { tool } from '@langchain/core/tools';
import { PermissionsString } from 'discord.js';
import { array, boolean, object, optional, string } from 'zod';
import { discordIdSchema } from '../../constants.js';
import { ToolArguments } from '../../types.js';

const schema = object({
  memberId: discordIdSchema,
  nickname: optional(string().max(32, 'Nickname can only be up to 32 characters')).describe("The new nickname for 'memberId'"),
  mute: optional(boolean()).describe("Wether to mute 'memberId'"),
  deaf: optional(boolean()).describe("Wether to deafen 'memberId'"),
  timeout: optional(string().time()).describe("The time when 'memberId' should be able to talk again"),
  roles: optional(array(discordIdSchema)).describe(
    'The roles to SET to the member, removing all other roles, can be provided as an empty array to remove all roles'
  ),
}).strict();

export const permissions: PermissionsString[] = ['ModerateMembers', 'MuteMembers', 'DeafenMembers', 'ManageRoles', 'ManageNicknames'];

export default ({ guild, member }: ToolArguments) =>
  tool(
    async ({ memberId, nickname, mute, deaf, timeout, roles }) => {
      if (mute !== undefined && !member.permissions.has('MuteMembers')) return { error: `${member.id} does not have permissions to mute members` };
      if (deaf !== undefined && !member.permissions.has('DeafenMembers')) return { error: `${member.id} does not have permissions to deafen members` };
      if (nickname !== undefined && !member.permissions.has('ManageNicknames')) return { error: `${member.id} does not have permissions to change nicknames` };
      if (roles !== undefined && !member.permissions.has('ManageRoles')) return { error: `${member.id} does not have permissions to manage roles` };
      if (timeout !== undefined && !member.permissions.has('ModerateMembers')) return { error: `${member.id} does not have permissions to moderate members` };

      try {
        const guildMember = await guild.members.fetch(memberId);

        if (guildMember.roles.highest.position >= member.roles.highest.position)
          return {
            error: `${member.id} cannot manage ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to ${member.id}'s highest role position`,
          };

        const me = await guild.members.fetchMe();
        if (guildMember.roles.highest.position >= me.roles.highest.position) {
          return {
            error: `The bot cannot manage ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to the bot's`,
          };
        }

        await guildMember.edit({
          nick: nickname,
          mute: mute,
          deaf: deaf,
          roles,
          communicationDisabledUntil: timeout ? new Date(timeout) : undefined,
        });
        return { data: `Edited ${guildMember.id}` };
      } catch (err) {
        return { error: `Failed to edit ${memberId}: ${(err as Error).message}` };
      }
    },
    {
      name: 'edit_member',
      description: 'Edit a discord member nickname, mute them, deafen them, time them out, or set their roles. Can be used together',
      schema,
    }
  );
