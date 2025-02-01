import { ColorResolvable, EmbedBuilder, GuildTextBasedChannel } from 'discord.js';

const severityColors: Record<Severity, ColorResolvable> = {
  info: '#3498DB',
  warning: '#F1C40F',
  moderate: '#E67E22',
  severe: '#E74C3C',
  success: '#2ECC71',
};

export type Severity = 'info' | 'warning' | 'moderate' | 'severe' | 'success';

export async function sendAudit(channel: GuildTextBasedChannel, action: string, executor: string, message: string, severity: Severity) {
  const embed = new EmbedBuilder({
    title: action,
    description: message,
    fields: [
      {
        name: 'Executed by',
        value: `<@${executor}> (${executor})`,
      },
    ],
  }).setColor(severityColors[severity]);
  
  return await channel.send({
    embeds: [embed],
  });
}
