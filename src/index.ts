import { Client, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { join } from 'path';
import { DiscordAI } from './ai/index.js';
import { chat } from './utils/chat.js';
import { thread } from './utils/thread.js';
import loadSystemPrompt from './utils/load-system-prompt.js';
import { listen } from './temprole/temprole-listener.js';

config();
await loadSystemPrompt(join(import.meta.dirname, 'system_prompt.txt'));

const discordAi = new DiscordAI(process.env.OPEN_AI_API_KEY!, join(import.meta.dirname, 'ai', 'tools'));

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
});

client.once(Events.ClientReady, readyClient => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot) return;
  if (process.env.DEVELOPMENT === 'true') {
    const developmentServer = process.env.DEVELOPMENT_SERVER;
    if (!developmentServer) throw new Error('Missing env DEVELOPMENT_SERVER!');
    const developmentRole = process.env.DEVELOPMENT_ROLE;
    if (!developmentRole) throw new Error('Missing env DEVELOPMENT_SERVER!');
    if (message.guildId !== developmentServer || !message.member?.roles.cache.has(developmentRole)) return;
  }
  const split = message.content.split(' ');

  if (message.reference?.messageId && discordAi.messagesHistory.get(message.reference.messageId)) {
    console.log('Incoming replied message:', message.content);
    await chat(discordAi, message, message.content, 'channel');
  } else if (split[0] === '+chat') {
    if (!split[1]) return message.reply('You need to tell me what to do');
    const query = split.splice(1).join(' ');
    console.log('Incoming message:', query);

    await chat(discordAi, message, query, 'channel');
  } else if (split[0] === '+thread') await thread(discordAi, message);
});

listen(client);
client.login(process.env.BOT_TOKEN);