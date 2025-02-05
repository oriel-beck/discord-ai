import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const editMember: ToolFunction<{
  memberId: string;
  nickname?: string;
  mute?: boolean;
  deaf?: boolean;
  timeout?: string;
}> = async ({ guild, memberId, nickname, mute, deaf, timeout }) => {
    try {
        const member = guild.members.cache.get(memberId) || (await guild.members.fetch(memberId));
        await member.edit({
          nick: nickname,
          mute: mute,
          deaf: deaf,
          communicationDisabledUntil: timeout ? new Date(timeout) : undefined,
        });
        return { data: `Edited ${member.id}` };
    } catch (err) {
        return {error: `Failed to edit ${memberId}: ${(err as Error).message}`}
    }
};

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
            description: 'The member Id of the user to edit.'
        },
        nickname: {
            type: 'string',
            description: 'The nickname to set to the user. undefined if not requested.'
        },
        mute: {
            type: 'boolean',
            description: 'If the user should be muted.'
        },
        deaf: {
            type: 'boolean',
            description: 'If the user should be deafened.'
        },
        timeout: {
            type: 'string',
            description: 'The timeout end time as an ISO timestamp. Use get_current_date_time to get the current time'
        },
      },
    },
  },
};

export default editMember;
