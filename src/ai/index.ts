import OpenAI from "openai";
import { ToolManager } from "./tools.js";
import { inspect } from "util";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { ToolFunction } from "./types.js";
import {
  GuildMember,
  GuildTextBasedChannel,
  Message,
  PermissionsString,
} from "discord.js";

const MODEL = "gpt-4o-mini";

interface ToolFile {
  default: ToolFunction;
  definition: OpenAI.Chat.Completions.ChatCompletionTool;
  permission?: PermissionsString;
}

export class DiscordAI {
  openai!: OpenAI;
  constructor(apiKey: string, toolFolderPath: string, private model = MODEL) {
    this.openai = new OpenAI({ apiKey });
    this.init(toolFolderPath);
  }

  tools: ToolFile[] = [];
  toolMapping: Record<string, ToolFunction<any>> = {};

  // Load all tools
  async init(path: string) {
    console.log(`DiscordAI: Loading tools from ${path}`);
    const files = await getTsFiles(path);
    for (const tool of files) {
      const toolFile: Partial<ToolFile> = await import(`file://${tool}`);
      if (toolFile.default && toolFile.definition) {
        this.tools.push(toolFile as ToolFile);
        this.toolMapping[toolFile.definition.function.name] = toolFile.default;
      }
    }
    console.log(`DiscordAI: Loaded ${this.tools.length} tools`);
  }

  async handleConversation(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    message: Message
  ) {
    const tools = this.getAvailableTools(message.member!);

    const toolManager = new ToolManager(
      message.member!,
      message.client,
      message.channel as GuildTextBasedChannel,
      // Even tho the tool manager has access to all tools, the AI only sees the available tools according to the member's permission
      this.toolMapping
    );

    while (true) {
      const chatCompletion = await this.getChatCompletion(
        messages,
        tools.map((t) => t.definition)
      );
      console.log(
        "AI Replied",
        inspect(chatCompletion.choices[0].message.tool_calls, false, 2)
      );

      if (
        !chatCompletion.choices[0] ||
        chatCompletion.choices[0].finish_reason === "stop"
      ) {
        console.log("AI Finished");
        return chatCompletion.choices[0].message.content;
      }

      messages.push(chatCompletion.choices[0].message);

      if (chatCompletion.choices[0].message.tool_calls) {
        const toolResponses: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [];
        for (const tool of chatCompletion.choices[0].message.tool_calls) {
          console.log("Tool use", tool.function.name);
          const result = await toolManager.executeTool(
            tool.function.name,
            tool.function.arguments
          );
          toolResponses.push({
            role: "tool",
            content: result || "Error: No result",
            tool_call_id: tool.id,
          });
        }
        messages = messages.concat(toolResponses);
      }
    }
  }

  private async getChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    tools: OpenAI.Chat.Completions.ChatCompletionTool[]
  ) {
    return this.openai.chat.completions.create({
      messages,
      tools,
      model: this.model,
      tool_choice: "auto",
      stop: "END",
    });
  }

  private getAvailableTools(member: GuildMember) {
    const availableTools: ToolFile[] = [];
    for (const tool of this.tools) {
      if (!tool.permission || member.permissions.has(tool.permission)) {
        availableTools.push(tool);
      }
    }
    return availableTools;
  }
}

async function getTsFiles(
  dir: string,
  fileList: string[] = []
): Promise<string[]> {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      await getTsFiles(filePath, fileList);
    } else if (filePath.endsWith(".js")) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

function createToolMapping(member: GuildMember, tools: ToolFile[]) {}
