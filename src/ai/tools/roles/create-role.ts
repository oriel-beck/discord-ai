import OpenAI from "openai";
import { ToolFunction } from "../../types.js";
import { ColorResolvable } from "discord.js";

const createRole: ToolFunction<{
  roleName: string;
  roleColor: ColorResolvable;
  //   TODO: permissions?
}> = async ({ guild, roleColor, roleName }) => {
  if (roleName.length > 100)
    return { error: `Role name cannot be longer than 100 characters` };

  const role = await guild.roles
    .create({ name: roleName, color: roleColor })
    .catch((err) => console.log(err));
  return role
    ? {
        data: `Created a role called ${role.name} with the color ${role.color}`,
      }
    : { error: "Failed to create the role" };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "create_role",
    description: "Creates a Discord role",
    strict: true,
    parameters: {
      type: "object",
      required: ["roleName", "roleColor"],
      additionalProperties: false,
      properties: {
        roleName: {
          type: "string",
          description: "The name for the role, max 100 characters",
        },
        roleColor: {
          type: ["number", "null"],
          description: "Decimal or #hex color",
        },
      },
    },
  },
};

export default createRole;
