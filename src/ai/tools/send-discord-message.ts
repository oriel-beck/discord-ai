import { APIEmbed } from "discord.js";
import { ToolFunction } from "../types.js";

const sendDiscordMessage: ToolFunction<{
  embeds: APIEmbed[];
  content?: string;
  channelId?: string;
}> = async ({ channel, embeds, content, channelId, guild }) => {
  console.log("Sending embed to", channelId || "Current Channel", "in", guild.id)
  if (channelId) {
    if (!/\d{17,20}/.test(channelId)) return { error: "Invalid channel ID" };
    const gotChannel = guild.channels.cache.get(channelId);
    if (!gotChannel) return { error: "Cannot find the channel" };
    if (!gotChannel?.isTextBased())
      return { error: "Cannot send message to non text based channels" };
    channel = gotChannel;
  }

  const sent = await channel
    .send({
      content,
      embeds,
    })
    .catch((err) => console.log(err));
  return !!sent;
};

export default sendDiscordMessage;
