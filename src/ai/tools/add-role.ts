import { ToolFunction } from "../types.js";

const addRole: ToolFunction<{ userId: string; roleId: string }> = async ({
  roleId,
  guild,
  userId,
  client,
}) => {
  console.log(
    "Adding the role",
    roleId,
    "to the user",
    userId,
    "in the guild",
    guild.id
  );
  if (!/\d{17,20}/.test(roleId))
    return { error: "A role ID has to be a valid discord role ID, get the role ID from the result of the tool get_discord_server_roles" };
  if (!/\d{17,20}/.test(userId))
    return { error: "A user ID has to be a valid discord user ID, get the user ID from the result of the tool get_discord_member_by_username" };
  const role = guild.roles.cache.get(roleId);
  if (!role)
    return { error: `Role ${roleId} cannot be found in server ${guild.id}` };
  const add = await guild.members.addRole({ user: userId, role: role }).catch(() => null);
  if (!add) return {error: `Failed to add the role ${roleId} to the member ${userId} in the server ${guild.id}`};
  return true;
};

export default addRole;
