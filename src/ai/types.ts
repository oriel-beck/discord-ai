import type { Client, Guild, GuildMember, GuildTextBasedChannel } from "discord.js";

export interface ToolArguments {
    member: GuildMember;
    client: Client;
    channel: GuildTextBasedChannel;
    guild: Guild;
}

export type ToolFunction<T = {}> = (args: ToolArguments & T) => ToolResult | Promise<ToolResult>;

export interface ToolResult {
    error?: string;
    data?: string;
}