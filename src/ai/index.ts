// import Groq from "groq-sdk";
import OpenAI from "openai";
import { ToolManager, tools } from "./tools.js";
import { config } from "dotenv";
config();

const openai = new OpenAI({ apiKey: process.env.OPEN_AI_API_KEY });
const MODEL = "gpt-4o-mini" //"llama-3.3-70b-versatile"; //"llama3-70b-8192"

export async function getGroqChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]
) {
  return openai.chat.completions.create({
    model:  MODEL,
    messages,
    tools,
    tool_choice: 'auto',
    stop: 'END'
  })
  // return groq.chat.completions.create({
  //   model: MODEL,
  //   messages,
  //   tools,
  //   tool_choice: "auto",
  //   stop: "END",
  // });
}

export async function handleConversation(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  toolManager: ToolManager
) {
  while (true) {
    const chatCompletion = await getGroqChatCompletion(messages);

    if (
      !chatCompletion.choices[0] ||
      chatCompletion.choices[0].finish_reason === "stop"
    ) {
      console.log(
        "AI Finished with:",
        chatCompletion.choices[0].message.content
      );
      return chatCompletion.choices[0].message.content;
    }

    messages.push(chatCompletion.choices[0].message);

    if (chatCompletion.choices[0].message.tool_calls) {
      const toolResponses: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [];
      for (const tool of chatCompletion.choices[0].message.tool_calls) {
        console.log(tool.function.arguments)
        const result = await toolManager.executeTool(
          tool.function.name,
          tool.function.arguments
        );
        toolResponses.push({
          role: "tool",
          content: JSON.stringify(result),
          tool_call_id: tool.id,
        });
        console.log("Tool response:", JSON.stringify(result));
      }
      messages = messages.concat(toolResponses);
    }
  }
}
