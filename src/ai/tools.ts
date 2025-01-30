import { Client, GuildMember, GuildTextBasedChannel } from "discord.js";
import OpenAI from "openai";
import addRoles from "./tools/add-roles.js";
import getAllMembers from "./tools/get-all-members.js";
import getDiscordMemberByUsername from "./tools/get-discord-member.js";
import getAllRoles from "./tools/get-discord-roles.js";
import sendDiscordMessage from "./tools/send-discord-message.js";
import getAllChannels from "./tools/get-discord-channels.js";
import removeRoles from "./tools/remove-roles.js";
import { ToolFunction } from "./types.js";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_all_discord_roles",
      description:
        "Gets all the roles, used for finding one or multiple role IDs by names",
    },
  },
  {
    type: "function",
    function: {
      name: "get_discord_member_by_username",
      description:
        "Gets a discord member by their username or nickname, used for getting the user ID of the target(s)",
      strict: true,
      parameters: {
        type: "object",
        required: ["username"],
        additionalProperties: false,
        properties: {
          username: {
            type: "string",
            description: "The username or nickname of the member to get",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_roles",
      description:
        "Adds one or more Discord roles to a specific member by using one or more role IDs and a user ID. Used to add one or multiple roles at a time, this should not be used more than once per userId.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["userId", "roleIds"],
        properties: {
          userId: {
            type: "string",
            description: "The user ID of the member to add the role to",
          },
          roleIds: {
            type: "array",
            description:
              "The role ID to add to the specified member in the specified server",
            items: {
              type: "string",
              description: "The role ID to add to the specified member",
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remove_roles",
      description:
        "Removes one or more Discord roles from a specific member by using one or more role IDs and a user ID. Used to remove one or multiple roles at a time, this should not be used more than once per userId.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["userId", "roleIds"],
        properties: {
          userId: {
            type: "string",
            description: "The user ID of the member to remove the role from",
          },
          roleIds: {
            type: "array",
            description:
              "The role ID to remove from the specified member in the specified server",
            items: {
              type: "string",
              description: "The role ID to remove to the specified member",
            },
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_discord_members",
      description: "Get all members/users in the Discord server",
    },
  },
  {
    type: "function",
    function: {
      name: "get_all_discord_channels",
      description:
        "Get all channels in the Discord server, used for finding one or multiple target channels for executing operations",
    },
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description:
        "Sends a message to the current Discord channel or a target Discord channel, the message can contain content (plain text) alongside multiple embeds. Should only be used if the executor requested it.",
      strict: true,
      parameters: {
        type: "object",
        required: ["channelId", "content", "embeds"],
        additionalProperties: false,
        properties: {
          channelId: {
            type: ["string", "null"],
            description: "The ID of the channel to send the embed message to",
          },
          content: {
            type: ["string", "null"],
            description: "The content (plain text) of the message",
          },
          embeds: {
            type: "array",
            items: {
              additionalProperties: false,
              type: "object",
              required: [
                "title",
                "description",
                "url",
                "timestamp",
                "color",
                "footer",
                "image",
                "thumbnail",
                "author",
                "fields",
              ],
              properties: {
                title: {
                  type: ["string", "null"],
                  description: "Title of the embed (256 characters limit)",
                },
                description: {
                  type: ["string", "null"],
                  description:
                    "Description of the embed (4096 characters limit)",
                },
                url: {
                  type: "string",
                  description: "URL of the embed",
                },
                timestamp: {
                  type: ["string", "null"],
                  description: "Timestamp of the embed content",
                },
                color: {
                  type: "number",
                  description: "Color code of the embed",
                },
                footer: {
                  type: ["object", "null"],
                  description: "Footer information",
                  required: ["text", "icon_url"],
                  additionalProperties: false,
                  properties: {
                    text: {
                      type: "string",
                      description: "Footer text (2048 characters limit)",
                    },
                    icon_url: {
                      type: ["string", "null"],
                      description: "URL of footer icon",
                    },
                  },
                },
                image: {
                  type: ["object", "null"],
                  description: "Image information",
                  required: ["url"],
                  additionalProperties: false,
                  properties: {
                    url: {
                      type: "string",
                      description: "URL of the image",
                    },
                  },
                },
                thumbnail: {
                  type: ["object", "null"],
                  required: ["url"],
                  description: "Thumbnail information",
                  additionalProperties: false,
                  properties: {
                    url: {
                      type: "string",
                      description: "URL of the thumbnail",
                    },
                  },
                },
                author: {
                  type: ["object", "null"],
                  required: ["name", "url", "icon_url"],
                  description: "Author information",
                  additionalProperties: false,
                  properties: {
                    name: {
                      type: "string",
                      description: "Name of the author (256 characters limit)",
                    },
                    url: {
                      type: ["string", "null"],
                      description: "URL of the author",
                    },
                    icon_url: {
                      type: ["string", "null"],
                      description: "URL of author icon",
                    },
                  },
                },
                fields: {
                  type: ["array", "null"],
                  description: "Fields information (only up to 25 fields)",
                  items: {
                    type: "object",
                    required: ["name", "value", "inline"],
                    additionalProperties: false,
                    properties: {
                      name: {
                        type: "string",
                        description: "Field name (256 characters limit)",
                      },
                      value: {
                        type: "string",
                        description: "Field value (1024 characters limit)",
                      },
                      inline: {
                        type: ["boolean", "null"],
                        description: "Whether the field is inline",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
];

export class ToolManager {
  constructor(
    private member: GuildMember,
    private client: Client,
    private channel: GuildTextBasedChannel
  ) {}
  // Any is required due to the complex typing here
  toolMapping: Record<string, ToolFunction<any>> = {
    get_discord_member_by_username: (args) => getDiscordMemberByUsername(args),
    add_roles: (args) => addRoles(args),
    remove_role: (args) => removeRoles(args),
    send_message: (args) => sendDiscordMessage(args),
    get_all_discord_members: (args) => getAllMembers(args),
    get_all_discord_channels: (args) => getAllChannels(args),
    get_all_discord_roles: (args) => getAllRoles(args),
  };

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
}
