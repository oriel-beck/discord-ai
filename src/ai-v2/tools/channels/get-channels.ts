import { tool } from '@langchain/core/tools';
import { ToolArguments } from '../../types.js';

export default ({ guild }: ToolArguments) =>
  tool(
    () => {
      const channelList = guild.channels.cache.map(c => c.toJSON());
      return {
        data: JSON.stringify(channelList),
        information:
          'If you cannot find the channel you are looking for here skip the operation and report to the executor\nYou are allowed to send messages and embeds to channel types of GuildText, GuildVoice, GuildAnnouncement, GuildNews, AnnouncementThread, PublicThread, PrivateThread and GuildStageVoice',
      };
    },
    {
      name: 'get_all_discord_channels',
      description: 'Get all channels in the Discord server, used for finding one or multiple target channels for executing operations',
    }
  );
