import { ChannelType } from "discord.js";
import { ToolFunction } from "../types.js";

const getAllChannels: ToolFunction<{
  channelTypes?: (keyof typeof ChannelType)[];
}> = async ({ guild, channelTypes }) => {
  console.log("Getting all channels from", guild.id, "of type", channelTypes);
  const channelList = guild.channels.cache
    .filter((c) =>
      channelTypes?.length
        ? channelTypes.includes(ChannelType[c.type] as keyof typeof ChannelType)
        : true
    )
    .map((c) => `name: ${c.name}, id: ${c.id}, type: ${ChannelType[c.type]}`)
    .join("\n");
  return {
    data: `If you cannot find the channel you are looking for here skip the operation and report to the executor\nYou are allowed to send messages and embeds to channel types of GuildText, GuildVoice, GuildAnnouncement, GuildNews, AnnouncementThread, PublicThread, PrivateThread and GuildStageVoice\nList of channels:\n\n${channelList}`,
  };
};

export default getAllChannels;
