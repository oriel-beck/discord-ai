import { ChannelType } from "discord.js";
import { ToolFunction } from "../../types.js";
import OpenAI from "openai";

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

export const definition: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "get_all_discord_channels",
    description:
      "Get all channels in the Discord server, used for finding one or multiple target channels for executing operations",
  },
};

export default getAllChannels;
