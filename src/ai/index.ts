import SuperMap from '@thunder04/supermap';
import { GuildTextBasedChannel, Message } from 'discord.js';
import { readdir, stat } from 'fs/promises';
import OpenAI from 'openai';
import { join } from 'path';
import { Tool } from './tool.js';
import { ToolArguments } from './types.js';

const MODEL: OpenAI.Chat.ChatModel = 'gpt-4o-mini';

interface ToolFile {
  default: (args: ToolArguments) => Tool;
}

export class DiscordAI {
  private readonly openai: OpenAI;
  /**
   * TMP Until I integrate a db
   */
  public readonly messagesHistory = new SuperMap<string, OpenAI.Chat.Completions.ChatCompletionMessageParam[]>();
  public readonly currentlyProccessing = new Set<string>();
  private tools: ToolFile[] = [];
  private devMode = process.env.DEVELOPMENT === 'true';

  constructor(
    apiKey: string,
    toolFolderPath: string,
    private model = MODEL
  ) {
    if (!apiKey) throw new Error('[DiscordAI]: Missing env OPEN_AI_API_KEY');
    this.openai = new OpenAI({ apiKey });
    this.init(toolFolderPath);
  }

  private async init(path: string) {
    console.log(`[DiscordAI]: Loading tools from ${path}`);
    const files = await getJsFiles(path);
    const imports = await Promise.allSettled(files.map(file => import(`file://${file}`)));

    this.tools = imports
      .filter(result => result.status === 'fulfilled' && (result.value as Partial<ToolFile>).default)
      .map(result => (result.status === 'fulfilled' ? (result.value as ToolFile) : null))
      .filter(Boolean) as ToolFile[];

    console.log(`[DiscordAI]: Loaded ${this.tools.length} tools`);
  }

  async handleConversationInThreads(message: Message, query: string) {
    this.currentlyProccessing.add(message.channel.id);
    const result = await this.processConversation(message, query, message.channel.id);
    this.currentlyProccessing.delete(message.channel.id);
    return result;
  }

  async handleConversationInChannels(message: Message, query: string, aiReplyMessageId: string) {
    const key = message.reference?.messageId || aiReplyMessageId;
    return await this.processConversation(message, query, key, aiReplyMessageId);
  }

  private async processConversation(message: Message, query: string, originKey: string, savingKey?: string) {
    const messages = await this.getMessages(message, query, originKey);
    const updatedMessages = await this.handleConversation(messages, message);
    this.messagesHistory.set(savingKey || originKey, updatedMessages);
    return updatedMessages.at(-1);
  }

  private async handleConversation(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], message: Message) {
    const tools = this.getAvailableTools(message);
    return this.handleTools(messages, message, tools);
  }

  private async handleTools(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    message: Message, // Discord Message
    tools: Record<string, Tool>
  ) {
    while (true) {
      const result = await this.getChatCompletion(
        messages,
        Object.values(tools).map(t => t.definition)
      );

      const aiMessage = result.choices[0].message;
      if (this.devMode) {
        console.log(
          `Discord Message [${message.id}]: ${
            aiMessage.tool_calls?.length ? `Executing tools: ${aiMessage.tool_calls.map(t => t.function.name)}` : `Responding with: ${aiMessage.content}`
          }`
        );
      }

      messages.push(aiMessage);
      if (!aiMessage.tool_calls?.length) break;

      // Execute tool calls and get results, including errors
      const tasks = await Promise.all(
        aiMessage.tool_calls.map(async call => {
          try {
            const tool = tools[call.function.name];
            if (!tool)
              return {
                content: `Tool "${call.function.name}" not found`,
                tool_call_id: call.id,
                role: 'tool',
              } as OpenAI.Chat.Completions.ChatCompletionMessageParam;

            const result = await tool.invoke(call.function.arguments);
            return {
              content: JSON.stringify(result),
              tool_call_id: call.id!,
              role: 'tool',
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
          } catch (error) {
            console.error(`Error executing tool "${call.function.name}" for message [${message.id}]:`, error);
            return {
              content: JSON.stringify({ error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` }),
              tool_call_id: call.id!,
              role: 'tool',
            } as OpenAI.Chat.Completions.ChatCompletionMessageParam;
          }
        })
      );
      // console.log(inspect(aiMessage.tool_calls, false, 999));
      // console.log(inspect(tasks, false, 999));

      // Append all tool results (order doesn't matter due to call.id)
      messages.push(...tasks);
    }

    return messages;
  }

  private getChatCompletion(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], tools: OpenAI.Chat.Completions.ChatCompletionTool[]) {
    return this.openai.chat.completions.create({
      messages,
      tools,
      model: this.model,
      tool_choice: 'auto',
      stop: 'END',
    });
  }

  private async getMessages(message: Message, query: string, key: string): Promise<OpenAI.Chat.Completions.ChatCompletionMessageParam[]> {
    const history = this.messagesHistory.get(key);
    if (history) return [...history, { role: 'user', content: query }];

    const me = await message.guild?.members.fetchMe();
    return [
      {
        role: 'developer',
        content: `${process.env.SYSTEM_PROMPT!} 
          You were executed in the server ${message.guildId}
          Channel: ${message.channelId}
          Executor user ID (aka me): ${message.author.id}
          Executor name (aka me): ${message.author.username}
          You cannot modify roles higher than your highest role position: ${me?.roles.highest.position}`,
      },
      { role: 'user', content: query },
    ];
  }

  private getAvailableTools(message: Message) {
    return Object.fromEntries(
      this.tools
        .map(tool =>
          tool.default({
            member: message.member!,
            client: message.client,
            channel: message.channel as GuildTextBasedChannel,
            guild: message.guild!,
          })
        )
        .filter(tool => !tool.permissions || message.member!.permissions.any(tool.permissions))
        .map(instance => [instance.definition.function.name, instance])
    );
  }
}

async function getJsFiles(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  const paths = await Promise.allSettled(
    files.map(async file => {
      const filePath = join(dir, file);
      const stats = await stat(filePath);
      return stats.isDirectory() ? getJsFiles(filePath) : filePath.endsWith('.js') ? filePath : null;
    })
  );

  return paths.filter(result => result.status === 'fulfilled' && result.value!).flatMap(result => (result.status === 'fulfilled' ? result.value! : []));
}
