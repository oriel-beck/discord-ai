import { $Enums, PrismaClient } from '@prisma/client';
import { number, object, optional, string, z } from 'zod';
const prisma = new PrismaClient();

const tempRoleTimers = new Map<string, NodeJS.Timeout>();

const schema = object({
  type: z.enum(['addTempRole', 'removeTempRole', 'scheduleRoleRemoval']),
  userId: string().regex(/\d{17,29}/),
  roleId: string().regex(/\d{17,29}/),
  guildId: string().regex(/\d{17,29}/),
  action: z.enum(['ADD', 'REMOVE']),
  durationMs: optional(number()),
});

export type TempRoleMessage = z.input<typeof schema>;

process.on('message', async message => {
  if (!message || typeof message !== 'object') return;

  const { type, userId, roleId, guildId, durationMs, action } = schema.parse(message);

  if (type === 'addTempRole') {
    await addScheduledRole(userId, roleId, guildId, action, durationMs!);
  } else if (type === 'removeTempRole') {
    await removeTempRole(userId, roleId, guildId, action);
  } else if (type === 'scheduleRoleRemoval') {
    scheduleTempRoleAction(userId, roleId, guildId, action, durationMs!);
  }
});

async function addScheduledRole(userId: string, roleId: string, guildId: string, action: $Enums.TemproleMode, durationMs: number) {
  const expiresAt = new Date(Date.now() + durationMs);

  await prisma.temprole.upsert({
    where: { userId_roleId_guildId_action: { userId, roleId, guildId, action } },
    update: { expiresAt },
    create: { userId, roleId, guildId, expiresAt, action },
  });

  if (durationMs <= 10 * 60 * 1000) {
    const remainingTime = expiresAt.getTime() - Date.now();
    scheduleTempRoleAction(userId, roleId, guildId, action, remainingTime);
  }
}

function scheduleTempRoleAction(userId: string, roleId: string, guildId: string, action: $Enums.TemproleMode, remainingTime: number) {
  const key = `${userId}-${roleId}-${guildId}-${action}`;

  if (remainingTime > 0) {
    if (tempRoleTimers.has(key)) clearTimeout(tempRoleTimers.get(key));

    const timeout = setTimeout(() => {
      // Instead of removing the role, notify the main process
      process.send?.({ type: 'removeTempRole', userId, roleId, guildId, action });

      tempRoleTimers.delete(key);
    }, remainingTime);

    tempRoleTimers.set(key, timeout);
  } else {
    process.send?.({ type: 'removeTempRole', userId, roleId, guildId, action });
  }
}

async function removeTempRole(userId: string, roleId: string, guildId: string, action: $Enums.TemproleMode) {
  const key = `${userId}-${roleId}-${guildId}-${action}`;

  if (tempRoleTimers.has(key)) {
    clearTimeout(tempRoleTimers.get(key));
    tempRoleTimers.delete(key);
  }

  await prisma.temprole.delete({ where: { userId_roleId_guildId_action: { userId, roleId, guildId, action } } });
}
