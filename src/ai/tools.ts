import { Client, GuildTextBasedChannel } from "discord.js";
import OpenAI from "openai";
import addRole from "./tools/add-role.js";
import getAllMembers from "./tools/get-all-members.js";
import getDiscordMemberByUsername from "./tools/get-discord-member.js";
import getDiscordRoles from "./tools/get-discord-roles.js";
import sendDiscordMessage from "./tools/send-discord-message.js";
import { stringify } from "./util.js";
import getAllChannels from "./tools/get-discord-channels.js";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_discord_server_roles",
      description:
        "Gets all the roles in a discord server, used for finding role IDs by role names",
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
      name: "add_role",
      description:
        "Adds a discord role to a specific member by using a role ID and a user ID, should not be used with non Discord IDs",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        required: ["userId", "roleId"],
        properties: {
          userId: {
            type: "string",
            description: "The user ID of the member to add the role to",
          },
          roleId: {
            type: "string",
            description:
              "The role ID to add the the specified member in the specified server",
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
    private executor: string,
    private client: Client,
    private channel: GuildTextBasedChannel
  ) {}
  // Any is required due to the complex typing here
  toolMapping: Record<string, (args: any) => unknown | undefined> = {
    get_discord_server_roles: (args) => getDiscordRoles(args),
    get_discord_member_by_username: (args) => getDiscordMemberByUsername(args),
    add_role: (args) => addRole(args),
    send_message: (args) => sendDiscordMessage(args),
    get_all_discord_members: (args) => getAllMembers(args),
    get_all_discord_channels: (args) => getAllChannels(args),
  };

  async executeTool(functionName: string, args: string) {
    try {
      const func = this.toolMapping[functionName];
      if (!func) return;
      let json = JSON.parse(args);
      json = {
        ...json,
        executor: this.executor,
        client: this.client,
        channel: this.channel,
        guild: this.channel.guild,
      };
      const result = await func(json);
      return stringify(result);
    } catch (ex) {
      console.error(ex);
      return {
        error: `Failed to execute tool ${functionName} with args ${args}`,
      };
    }
  }
}
