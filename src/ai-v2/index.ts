import { Tool } from '@langchain/core/tools';
import { ChatOpenAI, ChatOpenAICallOptions } from '@langchain/openai';
import { GuildMember, GuildTextBasedChannel, Message, PermissionsString } from 'discord.js';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { ToolArguments, ToolFunction } from './types.js';
import { initMessages } from '../ai/init.js';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

const MODEL = 'gpt-4o-mini';
interface ToolFile {
  default: (args: ToolArguments) => Tool;
  permissions?: PermissionsString[];
}

export class DiscordAIV2 {
  constructor(
    private apiKey: string,
    toolFolderPath: string,
    private model = MODEL
  ) {
    // this.openai = new OpenAI({ apiKey });
    this.init(toolFolderPath);
  }

  /**
   * TMP history of msgs, maybe a db in the future
   */
  // messagesHistory = new SuperMap<string, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>();
  tools: ToolFile[] = [];
  toolMapping: Record<string, ToolFunction<any>> = {};

  async handleConversation(message: Message, query: string) {
    const llm = new ChatOpenAI({
      model: this.model,
      apiKey: this.apiKey,
      temperature: 0,
      stopSequences: ['END'],
    });
    const tools = this.getAvailableTools(message);
    const llmWithTools = llm.bindTools(Object.values(tools), {
      tool_choice: 'auto',
    });
    const me = await message.guild?.members.fetchMe();
    const messages = [
      new SystemMessage(
        process.env.SYSTEM_PROMPT! +
          `You were executed in the server ${message.guildId}\nChannel: ${message.channelId}\nExecutor user ID (aka me): ${message.author.id}\nExecutor name (aka me): ${message.author.username}. You cannot add, remove, edit, or delete roles which have 'position' which is higher than your highest role position, which is ${me?.roles.highest.position}`
      ),
      new HumanMessage(query),
    ];

    while (true) {
      const result = await llmWithTools.invoke(messages);
      console.log(
        `Message [${message.id}]: ${result.tool_calls?.length ? `Executing tools: ${result.tool_calls.map(t => t.name)}` : `Responding ${result.content}`}`
      );
      messages.push(result);
      if (!result.tool_calls?.length) break;
      const promises = result.tool_calls.map(async call => {
        const invokation = await tools[call.name].invoke(call.args);
        return new ToolMessage({
          content: JSON.stringify(invokation),
          tool_call_id: call.id!,
          status: invokation.error ? 'error' : 'success',
        });
      });
      const tasks = await Promise.all(promises);
      console.log(tasks);
      messages.push(...tasks);
    }
    return messages;
  }

  // Load all tools
  async init(path: string) {
    console.log(`DiscordAI2: Loading tools from ${path}`);
    const files = await getTsFiles(path);
    for (const tool of files) {
      const toolFile: Partial<ToolFile> = await import(`file://${tool}`);
      if (toolFile.default) {
        this.tools.push(toolFile as ToolFile);
      }
    }
    console.log(`DiscordAI2: Loaded ${this.tools.length} tools`);
  }

  private getAvailableTools(message: Message) {
    const availableTools: Record<string, Tool> = {};
    for (const tool of this.tools) {
      if (!tool.permissions || message.member!.permissions.any(tool.permissions)) {
        const runnableTool = tool.default({
          member: message.member!,
          client: message.client,
          channel: message.channel as GuildTextBasedChannel,
          guild: message.guild!,
        });
        availableTools[runnableTool.name] = runnableTool;
      }
    }
    return availableTools;
  }
}

async function getTsFiles(dir: string, fileList: string[] = []): Promise<string[]> {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      await getTsFiles(filePath, fileList);
    } else if (filePath.endsWith('.js')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}
