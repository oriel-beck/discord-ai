import { ChannelType } from 'discord.js';
import OpenAI from 'openai';
import { ToolFunction } from '../../types.js';

const getAllChannels: ToolFunction = async ({ guild }) => {
  console.log('Getting all channels from', guild.id, 'of type');
  const channelList = guild.channels.cache
    .map(c => `name: ${c.name}, id: ${c.id}, type: ${ChannelType[c.type]}`)
    .join('\n');
  return {
    data: `If you cannot find the channel you are looking for here skip the operation and report to the executor\nYou are allowed to send messages and embeds to channel types of GuildText, GuildVoice, GuildAnnouncement, GuildNews, AnnouncementThread, PublicThread, PrivateThread and GuildStageVoice\nList of channels:\n\n${channelList}`,
  };
};

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_all_discord_channels',
    description: 'Get all channels in the Discord server, used for finding one or multiple target channels for executing operations',
  },
};

export default getAllChannels;
