import { tool } from '@langchain/core/tools';
import { object, string } from 'zod';
import { ToolArguments } from '../../types.js';

const schema = object({
  username: string(),
}).strict();

export default ({ guild }: ToolArguments) =>
  tool(
    async ({ username }) => {
      const member =
        guild.members.cache.find(
          m => m.nickname?.toLowerCase()?.includes(username.toLowerCase()) || m.user.displayName.toLowerCase().includes(username.toLowerCase())
        ) || (await guild.members.search({ query: username, limit: 1 })).at(0);
      if (!member)
        return {
          error: `Member ${username} cannot be found`,
        };
      return { data: JSON.stringify({ ...member.toJSON()!, permissions: member.permissions.toArray() }) };
    },
    {
      name: 'get_discord_member_by_username',
      description: 'Gets a discord member by their username or nickname, used for getting any information about the member including their permissions.',
      schema,
    }
  );
