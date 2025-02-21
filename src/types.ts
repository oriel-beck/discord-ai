import OpenAI from "openai";

declare global {
  namespace PrismaJson {
    // Insert your types here!
    type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
  }
}


