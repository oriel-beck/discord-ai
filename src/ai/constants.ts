import { PermissionsString } from 'discord.js';

export const PermissionsEnum: PermissionsString[] = [
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
];

export const validateStringArray = (arr: unknown): arr is string[] => Array.isArray(arr) && arr.every(item => typeof item === 'string');

export const embedDefinition = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'description', 'url', 'timestamp', 'color', 'footer', 'image', 'thumbnail', 'author', 'fields'],
    properties: {
      title: {
        type: 'string',
        description: 'Title of the embed (256 characters limit)',
      },
      description: {
        type: 'string',
        description: 'Description of the embed (4096 characters limit)',
      },
      url: {
        type: 'string',
        description: 'URL of the embed',
      },
      timestamp: {
        type: 'string',
        description: 'Timestamp of the embed content',
      },
      color: {
        type: 'number',
        description: 'Color code of the embed',
      },
      footer: {
        type: 'object',
        description: 'Footer information',
        required: ['text', 'icon_url'],
        additionalProperties: false,
        properties: {
          text: {
            type: 'string',
            description: 'Footer text (2048 characters limit)',
          },
          icon_url: {
            type: ['string', 'null'],
            description: 'URL of footer icon',
          },
        },
      },
      image: {
        type: 'object',
        description: 'Image information',
        required: ['url'],
        additionalProperties: false,
        properties: {
          url: {
            type: 'string',
            description: 'URL of the image',
          },
        },
      },
      thumbnail: {
        type: 'object',
        required: ['url'],
        description: 'Thumbnail information',
        additionalProperties: false,
        properties: {
          url: {
            type: 'string',
            description: 'URL of the thumbnail',
          },
        },
      },
      author: {
        type: 'object',
        required: ['name', 'url', 'icon_url'],
        description: 'Author information',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            description: 'Name of the author (256 characters limit)',
          },
          url: {
            type: ['string', 'null'],
            description: 'URL of the author',
          },
          icon_url: {
            type: ['string', 'null'],
            description: 'URL of author icon',
          },
        },
      },
      fields: {
        type: 'array',
        description: 'Fields information (only up to 25 fields)',
        items: {
          type: 'object',
          required: ['name', 'value', 'inline'],
          additionalProperties: false,
          properties: {
            name: {
              type: 'string',
              description: 'Field name (256 characters limit)',
            },
            value: {
              type: 'string',
              description: 'Field value (1024 characters limit)',
            },
            inline: {
              type: ['boolean', 'null'],
              description: 'Whether the field is inline',
            },
          },
        },
      },
    },
  },
};
