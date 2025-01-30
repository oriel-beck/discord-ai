import type { Client, Guild, GuildTextBasedChannel } from "discord.js";

export interface ToolArguments {
    executor: string;
    client: Client;
    channel: GuildTextBasedChannel;
    guild: Guild;
}

export type ToolFunction<T = {}> = (args: ToolArguments & T) => unknown | Promise<unknown>;