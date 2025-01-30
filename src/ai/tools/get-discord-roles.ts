import { ToolFunction } from "../types.js";

const getAllRoles: ToolFunction = ({ guild }) => {
  console.log("Getting role list for", guild.id);
  let roles = guild.roles.cache.map((r) => `${r.name}: ${r.id}`).join("\n");
  if (!roles) return { error: `Failed to get role list` };
  return {data: `If you can't find the role you are looking for here skip the operation and report to the executor\n\n${roles}`};
};
export default getAllRoles;
