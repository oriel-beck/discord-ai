import { Colors, type Message } from 'discord.js';
import type { DiscordAI } from '../ai/index.js';

const execString = (startTime: number) => `Execution took ${((new Date().getTime() - startTime) / 1000).toFixed(2)}s`;

export async function chat(discordAi: DiscordAI, message: Message, query: string, type: 'channel' | 'thread') {
  const startTime = new Date().getTime();
  const waitingMessage = await message.reply('Executing for 0s...');
  const interval = setInterval(() => {
    waitingMessage.edit(`Executing for ${((new Date().getTime() - startTime) / 1000).toFixed(2)}s...`);
  }, 3000);

  try {
    const res =
      type === 'channel'
        ? await discordAi.handleConversationInChannels(message, query, waitingMessage.id)
        : await discordAi.handleConversationInThreads(message, query);
    clearInterval(interval);
    if (res?.content)
      waitingMessage.edit({
        content: execString(startTime),
        embeds: [
          {
            description: `${res?.content}`,
            color: Colors.Blurple,
            title: 'AI Response',
          },
        ],
      });
    else
      waitingMessage.edit({
        content: execString(startTime),
        embeds: [
          {
            description: 'AI provided no response',
            color: Colors.Blurple,
            title: 'AI Response',
          },
        ],
      });
  } catch (err) {
    console.log(err);
    clearInterval(interval);
    const errMessage = (err as Error).message;
    waitingMessage.edit({
      content: execString(startTime),
      embeds: [
        {
          description: `Got an error: ${errMessage}`,
          color: Colors.Red,
          title: 'AI Error',
        },
      ],
    });
  }
}
