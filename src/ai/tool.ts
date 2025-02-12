import OpenAI from 'openai';
import { zodToJsonSchema } from 'openai-zod-to-json-schema';
import { output, ZodObject } from 'zod';

type ZodObjectAny = ZodObject<any, any, any, any>;

function tool<T extends ZodObjectAny>(
  func: (args: output<T>) => unknown | Promise<unknown>,
  definition: { name: string; description: string; schema?: T }
): Tool<T> {
  return new Tool(func, definition);
}

export class Tool<T extends ZodObjectAny = any> {
  definition!: OpenAI.Chat.Completions.ChatCompletionTool;
  constructor(
    private func: Parameters<typeof tool<T>>[0],
    private schema: Parameters<typeof tool>[1]
  ) {
    this.definition = {
      type: 'function',
      function: {
        name: this.schema.name,
        description: this.schema.description,
        parameters: this.schema.schema ? zodToJsonSchema(this.schema.schema, { target: 'openApi3' }) : undefined,
      },
    };
  }

  async invoke(args: string) {
    try {
      if (!this.schema.schema) return await this.func(JSON.parse(args));
      const parsedArgs = this.schema.schema.parse(JSON.parse(args));
      return await this.func(parsedArgs);
    } catch (error) {
      console.error(error);
      return { error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }
}

export default tool;
