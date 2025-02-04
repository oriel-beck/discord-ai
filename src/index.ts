import { ChannelType, Client, Events, GatewayIntentBits, Message } from 'discord.js';
import { config } from 'dotenv';
import { join } from 'path';
import { DiscordAI } from './ai/index.js';

config();

const discordAi = new DiscordAI(process.env.OPEN_AI_API_KEY!, join(import.meta.dirname, 'ai', 'tools'));

const managerRole = '1334178594494091364';
const allowedGuild = '1334178302356619335';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || message.guildId !== allowedGuild || !message.member?.roles.cache.has(managerRole)) return;

  const split = message.content.split(' ');

  if (message.reference?.messageId && discordAi.messagesHistory.get(message.reference.messageId)) {
    await chat(message, message.content, 'message');
  } else if (split[0] === '+chat') {
    if (!split[1]) return message.reply('You need to tell me what to do');

    const query = split.splice(1).join(' ');
    console.log('Incoming message:', query);

    await chat(message, query, 'message');
  } else if (split[0] === '+thread') {
    if (
      message.channel.type === ChannelType.DM ||
      message.channel.type === ChannelType.GuildStageVoice ||
      message.channel.isThread() ||
      message.channel.type === ChannelType.GuildVoice
    )
      return message.reply('I cannot start a thread in this channel');
    const thread = await message.channel.threads.create({
      startMessage: message,
      name: 'Assistant',
    });

    const collector = thread.createMessageCollector({
      filter: m => m.author.id === message.author.id,
      // 1h
      time: 60 * 60 * 1000,
      // 5m
      idle: 5 * 60 * 1000,
    });

    thread.send('Send messages in this channel to have a conversation with Discord AI');

    collector.on('collect', async m => {
      if (!m.content) return m.reply('You need to tell me what to do');

      await chat(m, m.content, 'thread');
    });
    collector.on('end', () => {
      thread.send('Ended thread, archiving and locking...').catch(() => null);
      thread.setArchived(true);
      thread.setLocked(true);
    });
  }
});

client.login(process.env.BOT_TOKEN);

const execString = (startTime: number) => `Execution took ${((new Date().getTime() - startTime) / 1000).toFixed(2)}s`;

async function chat(message: Message, query: string, type: 'thread' | 'message') {
  const startTime = new Date().getTime();
  const waitingMessage = await message.reply('Executing for 0s');
  const interval = setInterval(() => {
    waitingMessage.edit(`Executing for ${((new Date().getTime() - startTime) / 1000).toFixed(2)}s`);
  }, 3000);

  try {
    const res =
      type === 'message'
        ? await discordAi.handleConversationInChannels(
            message,
            query,
            waitingMessage.id,
            `You were executed in the server ${message.guildId}\nChannel: ${message.channelId}\nExecutor user ID (aka me): ${message.author.id}\nExecutor name (aka me): ${message.author.username}`
          )
        : await discordAi.handleConversationInThreads(
            message,
            query,
            `You were executed in the server ${message.guildId}\nChannel: ${message.channelId}\nExecutor user ID (aka me): ${message.author.id}\nExecutor name (aka me): ${message.author.username}`
          );
    clearInterval(interval);
    if (res) waitingMessage.edit(`${res}\n\n${execString(startTime)}`).catch(() => null);
    else waitingMessage.edit(`AI provided no response\n\n${execString(startTime)}`).catch(() => null);
  } catch (err) {
    clearInterval(interval);
    const errMessage = (err as Error).message;
    waitingMessage.edit(`Got an error: ${errMessage}\n\n${execString(startTime)}`).catch(() => null);
  }
}
