import OpenAI from 'openai';

export function initMessages(query: string, appendToSystem = ''): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return [
    {
      role: 'developer',
      content: process.env.SYSTEM_PROMPT! + (appendToSystem ? '\n\n' + appendToSystem : ''),
    },
    {
      role: 'user',
      content: query,
    },
  ];
}
