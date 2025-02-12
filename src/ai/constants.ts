import { array, boolean, object, optional, string } from 'zod';

export const discordIdSchema = () =>
  string()
    .regex(/\d{17,20}/)
    .describe('A valid discord ID, 17-20 characters long, only numbers. If you need to find a user ID from a username/nickname you can use the get_member_by_username tool');

export const hexRegex = /#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/;

export const PermissionsEnum = [
  'CreateInstantInvite',
  'KickMembers',
  'BanMembers',
  'Administrator',
  'ManageChannels',
  'ManageGuild',
  'AddReactions',
  'ViewAuditLog',
  'PrioritySpeaker',
  'Stream',
  'ViewChannel',
  'SendMessages',
  'SendTTSMessages',
  'ManageMessages',
  'EmbedLinks',
  'AttachFiles',
  'ReadMessageHistory',
  'MentionEveryone',
  'UseExternalEmojis',
  'ViewGuildInsights',
  'Connect',
  'Speak',
  'MuteMembers',
  'DeafenMembers',
  'MoveMembers',
  'UseVAD',
  'ChangeNickname',
  'ManageNicknames',
  'ManageRoles',
  'ManageWebhooks',
  // 'ManageEmojisAndStickers', // Deprecated
  'ManageGuildExpressions',
  'UseApplicationCommands',
  'RequestToSpeak',
  'ManageEvents',
  'ManageThreads',
  'CreatePublicThreads',
  'CreatePrivateThreads',
  'UseExternalStickers',
  'SendMessagesInThreads',
  'UseEmbeddedActivities',
  'ModerateMembers',
  'ViewCreatorMonetizationAnalytics',
  'UseSoundboard',
  'CreateGuildExpressions',
  'CreateEvents',
  'UseExternalSounds',
  'SendVoiceMessages',
  'SendPolls',
  'UseExternalApps',
] as const;

export const embedsSchema = () => array(
  object({
    title: optional(string().max(256, 'Embed title can only be up to 100 characters long')),
    description: optional(string().max(4096, 'Embed description can only be up to 4096 characters long')),
    url: optional(string().url('url must be a valid URL')),
    timestamp: optional(string().time()),
    color: optional(
      string()
        .regex(hexRegex)
        .transform(str => parseInt(str, 16))
    ),
    footer: optional(
      object({
        text: string().max(2048, 'Embed footer text can only be up to 2048 characters'),
        icon_url: optional(string().url('Embed footer icon_url must be a valid URL')),
      }).strict()
    ),
    image: optional(
      object({
        url: string().url('Embed image url must be a valid URL'),
      }).strict()
    ),
    thumbnail: optional(
      object({
        url: string().url('Embed thumbnail url must be a valid URL'),
      }).strict()
    ),
    author: optional(
      object({
        name: string().max(256, 'Embed author name can only be up to 256 characters'),
        url: optional(string().url('Embed author url must be a valid URL')),
        icon_url: optional(string().url('Embed author icon_url must be a valid URL')),
      }).strict()
    ),
    fields: optional(
      array(
        object({
          name: string().max(256, 'Embed field name can only be up to 256 characters'),
          value: string().max(1024, 'Embed field value can only be up to 1024 characters'),
          inline: optional(boolean()).describe('Wether the field should be inline'),
        }).strict()
      )
    ),
  }).strict()
);
