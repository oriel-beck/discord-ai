import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';
import { PermissionsString } from 'discord.js';

const editMember: ToolFunction<{
  memberId: string;
  nickname?: string;
  mute?: boolean;
  deaf?: boolean;
  timeout?: string;
  roles?: string[];
}> = async ({ guild, memberId, nickname, mute, deaf, timeout, roles, member }) => {
  if (mute !== undefined && !member.permissions.has('MuteMembers')) return { error: `${member.id} does not have permissions to mute members` };
  if (deaf !== undefined && !member.permissions.has('DeafenMembers')) return { error: `${member.id} does not have permissions to deafen members` };
  if (nickname !== undefined && !member.permissions.has('ManageNicknames')) return { error: `${member.id} does not have permissions to change nicknames` };
  if (roles !== undefined && !member.permissions.has('ManageRoles')) return { error: `${member.id} does not have permissions to manage roles` };
  if (timeout !== undefined && !member.permissions.has('ModerateMembers')) return { error: `${member.id} does not have permissions to moderate members` };

  try {
    const guildMember = guild.members.cache.get(memberId) || (await guild.members.fetch(memberId));

    if (guildMember.roles.highest.position >= member.roles.highest.position)
      return {
        error: `${member.id} cannot manage ${guildMember.id} as ${guildMember.id}'s highest role position is higher or equal to ${member.id}'s highest role position`,
      };

    const me = guild.members.me || (await guild.members.fetchMe());
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
};

export const permissions: PermissionsString[] = ['ModerateMembers', 'MuteMembers', 'DeafenMembers', 'ManageRoles', 'ManageNicknames'];

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'edit_member',
    description: 'Edit a discord member nickname, mute them, deafen them, or time them out.',
    parameters: {
      type: 'object',
      required: ['memberId'],
      additionalProperties: false,
      properties: {
        memberId: {
          type: 'string',
          description: 'The member Id of the user to edit.',
        },
        nickname: {
          type: 'string',
          description: 'The nickname to set to the user. Empty string to reset. Requires ManageNicknames permission.',
        },
        mute: {
          type: 'boolean',
          description: 'If the user should be muted. Requires MuteMembers permission.',
        },
        deaf: {
          type: 'boolean',
          description: 'If the user should be deafened. Requires DeafenMembers permission.',
        },
        timeout: {
          type: 'string',
          description: 'The timeout end time as an ISO timestamp. Use get_current_date_time to get the current time. Requires ModerateMembers permission.',
        },
        roles: {
          type: 'array',
          description: 'The list of arrays to set for the users, this overrides all existing roles on the user. Requires ManageRoles permissions.',
          items: {
            type: 'string',
            description: 'The role Id to set to the user',
          },
        },
      },
    },
  },
};

export default editMember;
