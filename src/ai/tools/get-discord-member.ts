import { ToolFunction } from "../types.js";

const getDiscordMemberByUsername: ToolFunction<{ username: string }> = async ({
  username,
  guild
}) => {
  console.log(`Getting member from ${guild.id} by username ${username}`);
  const member =
    guild.members.cache.find(
      (m) =>
        m.nickname?.toLowerCase()?.includes(username.toLowerCase()) ||
        m.user.displayName.toLowerCase().includes(username.toLowerCase())
    ) || (await guild.members.search({ query: username, limit: 1 })).at(0);
  if (!member)
    return { error: `Member ${username} cannot be found in server ${guild.id}` };
  return member.id;
  // switch (username) {
  //   case "luka":
  //     return "685861527382654987";
  //   case "oriel":
  //     return "311808747141857292";
  // }
};

export default getDiscordMemberByUsername;
