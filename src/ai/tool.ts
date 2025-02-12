import { PermissionsString } from 'discord.js';
import OpenAI from 'openai';
import { zodToJsonSchema } from 'openai-zod-to-json-schema';
import { output, ZodObject } from 'zod';

type ZodObjectAny = ZodObject<any, any, any, any>;

function tool<T extends ZodObjectAny>(
  func: (args: output<T>) => unknown | Promise<unknown>,
  definition: { permissions?: PermissionsString[]; name: string; description: string; schema?: T }
): Tool<T> {
  return new Tool(func, definition);
}

export class Tool<T extends ZodObjectAny = any> {
  definition!: OpenAI.Chat.Completions.ChatCompletionTool;
  permissions?: PermissionsString[];
  constructor(
    private func: Parameters<typeof tool<T>>[0],
    private params: Parameters<typeof tool>[1]
  ) {
    this.definition = {
      type: 'function',
      function: {
        name: params.name,
        description: params.description,
        parameters: params.schema ? zodToJsonSchema(params.schema, { target: 'openApi3' }) : undefined,
      },
    };
    this.permissions = params.permissions;
  }

  async invoke(args: string) {
    try {
      if (!this.params.schema) return await this.func(JSON.parse(args));
      const parsedArgs = this.params.schema.parse(JSON.parse(args));
      return await this.func(parsedArgs);
    } catch (error) {
      console.error(error);
      return {
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}\nYou can try re-running this tool after correcting the arguments`,
      };
    }
  }
}

export default tool;
