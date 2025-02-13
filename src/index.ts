import { ChannelType, Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { join } from 'path';
import { DiscordAI } from './ai/index.js';
import { chat } from './utils/chat.js';
import { thread } from './utils/thread.js';

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
    console.log('Incoming replied message:', message.content);
    await chat(discordAi, message, message.content, 'channel');
  } else if (split[0] === '+chat') {
    if (!split[1]) return message.reply('You need to tell me what to do');

    const query = split.splice(1).join(' ');
    console.log('Incoming message:', query);

    await chat(discordAi, message, query, 'channel');
  } else if (split[0] === '+thread') {
    await thread(discordAi, message);
  }
});

client.login(process.env.BOT_TOKEN);
