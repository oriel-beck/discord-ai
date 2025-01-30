import SuperMap from "@thunder04/supermap";
import type { ToolFunction } from "../types.js";
import type { Collection, GuildMember, Snowflake } from "discord.js";

const cache = new SuperMap<string, Collection<Snowflake, GuildMember>>({
    intervalTime: 300000
});

const getAllMembers: ToolFunction = async ({ guild }) => {
    console.log(`Getting all members in ${guild.id}`)
    if (cache.get(guild.id)) return `If you cannot find the member you are looking for here skip the operation and report to the executor\n\n${formatMembers(cache.get(guild.id)!)}`;
    const members = await guild.members.fetch().catch(() => null);
    if (!members) return {error: `Failed to fetch members of server ${guild.id}`}
    cache.set(guild.id, members);
    return `If you cannot find the member you are looking for here skip the operation and report to the executor\n\n${formatMembers(members)}`;
};

function formatMembers(members: Collection<Snowflake, GuildMember>) {
    return members.map((m) => {
        let identifiers: string[] = [];
        if (m.nickname) identifiers.push(m.nickname);
        if (m.user.globalName) identifiers.push(m.user.globalName);
        if (m.user.username) identifiers.push(m.user.username);
        return `${identifiers.join(", ")} = ${m.id}`
    }).join("\n");
}

export default getAllMembers;
