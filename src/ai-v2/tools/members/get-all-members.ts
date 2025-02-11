import { tool } from '@langchain/core/tools';
import SuperMap from '@thunder04/supermap';
import type { Collection, GuildMember, PermissionsString, Snowflake } from 'discord.js';
import type { ToolArguments } from '../../types.js';

const cache = new SuperMap<string, boolean>({
  intervalTime: 300000,
});
export const permissions: PermissionsString[] = ['ManageGuild'];

export default ({ guild }: ToolArguments) =>
  tool(
    async () => {
      if (cache.get(guild.id))
        return {
          data: formatMembers(guild.members.cache),
          information: 'If you cannot find the member you are looking for here skip the operation and report to the executor',
        };

      const members = await guild.members.fetch().catch(() => null);
      if (!members)
        return {
          error: `Failed to fetch members of server ${guild.id}`,
        };

      cache.set(guild.id, true);

      return {
        data: formatMembers(members),
        information: 'If you cannot find the member you are looking for here skip the operation and report to the executor',
      };
    },
    {
      name: 'get_all_discord_members',
      description:
        'Get all members/users in the Discord server, only used when you need to get all members, for getting specific members by usernames use `get_discord_member_by_username`',
    }
  );

function formatMembers(members: Collection<Snowflake, GuildMember>) {
  return members
    .map(m => {
      let identifiers: string[] = [];
      if (m.nickname) identifiers.push(m.nickname);
      if (m.user.globalName) identifiers.push(m.user.globalName);
      if (m.user.username) identifiers.push(m.user.username);
      return `${identifiers.join(', ')} = ${m.id}`;
    })
    .join('\n');
}
