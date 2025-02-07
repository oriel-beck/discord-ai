import { Client, GuildMember, GuildTextBasedChannel } from 'discord.js';
import { ToolFunction } from './types.js';
import { sendAudit } from './util.js';

export class ToolManager {
  constructor(
    public member: GuildMember,
    public client: Client,
    public channel: GuildTextBasedChannel,
    // Any is required due to the complex typing here
    public toolMapping: Record<string, ToolFunction<any>>
  ) {}

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
      const auditLog = this.channel.guild.channels.cache.get('1335364653966037056');
      await sendAudit(auditLog as GuildTextBasedChannel, functionName, this.member.id, `## Input: \n${args}\n## Output:\n${JSON.stringify(result)}`, 'info');
      return result;
    } catch (ex) {
      console.error(ex);
      return `Failed to execute tool ${functionName} with args ${args}`;
    }
  }
}
