import { config } from "dotenv";
import {
  Client,
  Events,
  GatewayIntentBits,
  GuildTextBasedChannel,
} from "discord.js";
import { handleConversation } from "./ai/index.js";
import { initMessages } from "./ai/init.js";
import { ToolManager } from "./ai/tools.js";

config();

const managerRole = "1334178594494091364";
const allowedGuild = "1334178302356619335";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (
    message.author.bot ||
    message.guildId !== allowedGuild ||
    !message.member?.roles.cache.has(managerRole)
  )
    return;
  const split = message.content.split(" ");
  if (split[0] === "+chat") {
    if (!split[1]) return message.reply("You need to tell me what to do");
    const query = split.splice(1).join(" ");
    console.log("Incoming message:", query);
    const messages = initMessages(
      query,
      `You were executed in the server ${message.guildId}\nChannel: ${message.channelId}\nExecutor user ID: ${message.author.id}\nYour role position is: ${message.guild?.members.me?.roles.highest.position}`
    );
    const toolManager = new ToolManager(
      message.member,
      message.client,
      message.channel as GuildTextBasedChannel
    );
    const startTime = new Date().getTime();
    const waitingMessage = await message.reply("Executing for 0s");
    const interval = setInterval(() => {
      waitingMessage.edit(
        `Executing for ${((new Date().getTime() - startTime) / 1000).toFixed(
          2
        )}s`
      );
    }, 3000);
    try {
      const res = await handleConversation(messages, toolManager);
      clearInterval(interval);
      if (res) waitingMessage.edit(`${res}\n\n${execString(startTime)}`);
      else
        waitingMessage.edit(
          `AI provided no response\n\n${execString(startTime)}`
        );
    } catch (err) {
      clearInterval(interval);
      const errMessage = (err as Error).message;
      waitingMessage.edit(
        `Got an error: ${errMessage}\n\n${execString(startTime)}`
      );
    }
  }
});

client.login(process.env.BOT_TOKEN);

const execString = (startTime: number) =>
  `Execution took ${((new Date().getTime() - startTime) / 1000).toFixed(2)}s`;
