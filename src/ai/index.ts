import OpenAI from "openai";
import { ToolManager } from "./tools.js";
import { inspect } from "util";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { ToolFunction } from "./types.js";

const MODEL = "gpt-4o-mini";

export class DiscordAI {
  openai!: OpenAI;
  constructor(apiKey: string, toolFolderPath: string, private model = MODEL) {
    this.openai = new OpenAI({ apiKey });
    this.init(toolFolderPath);
  }

  tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];

  // Load all tools
  async init(path: string) {
    console.log(`DiscordAI: Loading tools from ${path}`);
    const files = await getTsFiles(path);
    for (const tool of files) {
      const {
        definition,
      }: {
        default: ToolFunction;
        definition?: OpenAI.Chat.Completions.ChatCompletionTool;
      } = await import(`file://${tool}`);
      if (definition) this.tools.push(definition);
    }
    console.log(`DiscordAI: Loaded ${this.tools.length} tools`);
  }

  async handleConversation(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    toolManager: ToolManager
  ) {
    while (true) {
      const chatCompletion = await this.getChatCompletion(messages);
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

  async getChatCompletion(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  ) {
    return this.openai.chat.completions.create({
      messages,
      model: this.model,
      tools: this.tools,
      tool_choice: "auto",
      stop: "END",
    });
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
