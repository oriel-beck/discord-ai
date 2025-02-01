import OpenAI from 'openai';
import { ToolManager } from './tools.js';
import { inspect } from 'util';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { ToolFunction } from './types.js';
import { GuildMember, GuildTextBasedChannel, Message, PermissionsString } from 'discord.js';

const MODEL: OpenAI.Chat.ChatModel = 'gpt-4o-mini';
interface ToolFile {
  default: ToolFunction;
  definition: OpenAI.Chat.Completions.ChatCompletionTool;
  permission?: PermissionsString;
}
export class DiscordAI {
  openai!: OpenAI;
  constructor(
    apiKey: string,
    toolFolderPath: string,
    private model = MODEL
  ) {
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

    if (!process.env.OPEN_AI_ASSISTANT_ID || !(await this.getAssitant(process.env.OPEN_AI_ASSISTANT_ID!))) {
      const newAssistant = await this.createAssistant();
      throw new Error(
        `DiscordAI: Failed to start DiscordAI. Could not find a assistant.\nI created an assistant for you, please set '${newAssistant.id}' as the env value of 'OPEN_AI_ASSISTANT_ID' then restart.`
      );
    }
    console.log(`DiscordAI: Updating assistant ${process.env.OPEN_AI_ASSISTANT_ID}`);
    await this.updateAssistant(process.env.OPEN_AI_ASSISTANT_ID!);
    console.log(`DiscordAI: Updated assistant ${process.env.OPEN_AI_ASSISTANT_ID}`);
  }

  async handleConversation(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], message: Message) {
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
        tools.map(t => t.definition)
      );
      console.log('AI Replied', inspect(chatCompletion.choices[0].message.tool_calls, false, 2));

      if (!chatCompletion.choices[0] || chatCompletion.choices[0].finish_reason === 'stop') {
        console.log('AI Finished');
        return chatCompletion.choices[0].message.content;
      }

      messages.push(chatCompletion.choices[0].message);

      if (chatCompletion.choices[0].message.tool_calls) {
        const toolResponses: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        for (const tool of chatCompletion.choices[0].message.tool_calls) {
          console.log('Tool use', tool.function.name);
          const result = await toolManager.executeTool(tool.function.name, tool.function.arguments);
          toolResponses.push({
            role: 'tool',
            content: result || 'Error: No result',
            tool_call_id: tool.id,
          });
        }
        messages = messages.concat(toolResponses);
      }
    }
  }

  private async getChatCompletion(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[], tools: OpenAI.Chat.Completions.ChatCompletionTool[]) {
    return this.openai.chat.completions.create({
      messages,
      tools,
      model: this.model,
      tool_choice: 'auto',
      stop: 'END',
    });
  }

  public async createAssistantThread() {
    return await this.openai.beta.threads.create();
  }

  public async handleAssistantConversation(message: Message, threadId: string, query: string) {
    const tools = this.getAvailableTools(message.member!);
    
    const toolManager = new ToolManager(
      message.member!,
      message.client,
      message.channel as GuildTextBasedChannel,
      // Even tho the tool manager has access to all tools, the AI only sees the available tools according to the member's permission
      this.toolMapping
    );

    await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: query,
    });

    let run = await this.openai.beta.threads.runs.createAndPoll(threadId, {
      assistant_id: process.env.OPEN_AI_ASSISTANT_ID!,
      parallel_tool_calls: true,
      tools: tools.map(t => ({ function: t.definition.function, type: t.definition.type })),
    });

    while (run.status === 'requires_action') {
      console.log('AI requiring action');

      if (run.required_action?.submit_tool_outputs) {
        const toolResponses: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] = [];
        for (const tool of run.required_action?.submit_tool_outputs.tool_calls) {
          console.log('Tool use', tool.function.name);
          const result = await toolManager.executeTool(tool.function.name, tool.function.arguments);
          toolResponses.push({
            output: result || 'Error: No result',
            tool_call_id: tool.id,
          });
        }
        run = await this.openai.beta.threads.runs.submitToolOutputsAndPoll(threadId, run.id, { tool_outputs: toolResponses });
      }
    }

    const messages = await this.openai.beta.threads.messages.list(threadId);
    const lastMessage = messages.data.at(0)?.content.at(0);
    return lastMessage?.type === 'text' ? lastMessage.text.value : 'AI Provided no response.';
  }

  private async getAssitant(assistantId: string) {
    return this.openai.beta.assistants.retrieve(assistantId).catch(() => null);
  }

  private async updateAssistant(assistantId: string) {
    return this.openai.beta.assistants.update(assistantId, {
      tools: this.tools.map(t => ({ function: t.definition.function, type: t.definition.type })),
    });
  }

  private async createAssistant() {
    return this.openai.beta.assistants.create({
      name: 'DiscordAI-v0.0.1',
      model: 'gpt-4-turbo',
      instructions: process.env.SYSTEM_PROMPT!,
      tools: this.tools.map(t => ({ function: t.definition.function, type: t.definition.type })),
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
