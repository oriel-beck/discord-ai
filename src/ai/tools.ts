import {
  Client,
  GuildMember,
  GuildTextBasedChannel,
  PermissionsString
} from "discord.js";
import getAllChannels from "./tools/channels/get-discord-channels.js";
import sendDiscordMessage from "./tools/channels/send-discord-message.js";
import getAllMembers from "./tools/members/get-all-members.js";
import getDiscordMemberByUsername from "./tools/members/get-discord-member.js";
import addRoles from "./tools/roles/add-roles.js";
import getAllRoles from "./tools/roles/get-discord-roles.js";
import removeRoles from "./tools/roles/remove-roles.js";
import { ToolFunction } from "./types.js";
import createRole from "./tools/roles/create-role.js";

const toolMappingForPermissions = new Map<
  PermissionsString,
  Record<string, ToolFunction<any>>
>([
  [
    "ManageRoles",
    {
      add_roles: (args) => addRoles(args),
      remove_role: (args) => removeRoles(args),
      create_role: (args) => createRole(args)
    },
  ],
  [
    "ManageGuild",
    {
      send_message: (args) => sendDiscordMessage(args),
    },
  ],
]);

const defaultToolMapping: Record<string, ToolFunction<any>> = {
  get_discord_member_by_username: (args) => getDiscordMemberByUsername(args),
  get_all_discord_members: (args) => getAllMembers(args),
  get_all_discord_channels: (args) => getAllChannels(args),
  get_all_discord_roles: (args) => getAllRoles(args),
};

export class ToolManager {
  constructor(
    private member: GuildMember,
    private client: Client,
    private channel: GuildTextBasedChannel,
  ) {
    this.createToolMapping(member);
  }
  // Any is required due to the complex typing here
  toolMapping: Record<string, ToolFunction<any>> = {};

  async executeTool(functionName: string, args: string) {
    try {
      const func = this.toolMapping[functionName];
      if (!func) return;
      let json = JSON.parse(args);
      json = {
        ...json,
        member: this.member,
        client: this.client,
        channel: this.channel,
        guild: this.channel.guild,
      };
      const result = await func(json);
      console.log("Tool result:", result);
      if (result.error) return `Error: ${result.error}`;
      return result.data;
    } catch (ex) {
      console.error(ex);
      return `Failed to execute tool ${functionName} with args ${args}`;
    }
  }

  createToolMapping(member: GuildMember) {
    this.toolMapping = { ...defaultToolMapping };
    for (const perm of member.permissions) {
      const mapping = toolMappingForPermissions.get(perm);
      if (mapping) this.toolMapping = { ...this.toolMapping, ...mapping };
    }
  }
}
