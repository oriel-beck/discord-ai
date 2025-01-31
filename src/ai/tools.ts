import { Client, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { ToolFunction } from './types.js';

export class ToolManager {
  constructor(
    public member: GuildMember,
    public client: Client,
    public channel: GuildTextBasedChannel,
    public toolMapping: Record<string, ToolFunction<any>>
  ) {}
  // Any is required due to the complex typing here

  async executeTool(functionName: string, args: string) {
    try {
      const func = this.toolMapping[functionName];
      if (!func) return;
      let json = JSON.parse(args);
      json = {
        ...json,
        member: this.member,
        client: this.client,
        channel: this.channel,
        guild: this.channel.guild,
      };
      const result = await func(json);
      console.log('Tool result:', result);
      if (result.error) return `Error: ${result.error}`;
      return result.data;
    } catch (ex) {
      console.error(ex);
      return `Failed to execute tool ${functionName} with args ${args}`;
    }
  }
}
