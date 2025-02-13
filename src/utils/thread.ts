import { type Channel, ChannelType, type NewsChannel, type TextChannel, type Message } from 'discord.js';
import type { DiscordAI } from '../ai/index.js';
import { chat } from './chat.js';

const notAllowedTypes = new Set([ChannelType.GroupDM, ChannelType.DM, ChannelType.GuildStageVoice, ChannelType.GuildVoice]);

const isValidChannel = (channel: Channel): channel is NewsChannel | TextChannel => !channel.isThread() && !notAllowedTypes.has(channel.type);

export async function thread(discordAi: DiscordAI, message: Message) {
  if (!isValidChannel(message.channel)) return message.reply('I cannot start a thread in this channel');

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

    console.log('Incoming thread message:', m.content);
    if (discordAi.currentlyProccessing.has(thread.id)) return m.reply("Please wait, I'm still processing your older request...");
    await chat(discordAi, m, m.content, 'thread');
  });

  collector.on('end', () => {
    thread
      .send('Ended thread, archiving and locking...')
      .then(async () => {
        await thread.setArchived(true).catch(() => null);
        await thread.setLocked(true).catch(() => null);
      })
      .catch(() => null);
  });
}
