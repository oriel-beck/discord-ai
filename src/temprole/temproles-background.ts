import { PrismaClient } from '@prisma/client';
import { number, object, optional, string, z } from 'zod';
const prisma = new PrismaClient();

const tempRoleTimers = new Map<string, NodeJS.Timeout>();

const schema = object({
  type: z.enum(['addTempRole', 'removeTempRole', 'scheduleRoleRemoval']),
  userId: string().regex(/\d{17,29}/),
  roleId: string().regex(/\d{17,29}/),
  guildId: string().regex(/\d{17,29}/),
  durationMs: optional(number()),
});

export type TempRoleMessage = z.input<typeof schema>;

process.on('message', async message => {
  if (!message || typeof message !== 'object') return;

  const { type, userId, roleId, guildId, durationMs } = schema.parse(message);

  if (type === 'addTempRole') {
    await addTempRole(userId, roleId, guildId, durationMs!);
  } else if (type === 'removeTempRole') {
    await removeTempRole(userId, roleId, guildId);
  } else if (type === 'scheduleRoleRemoval') {
    scheduleTempRoleRemoval(userId, roleId, guildId, durationMs!);
  }
});

async function addTempRole(userId: string, roleId: string, guildId: string, durationMs: number) {
  const expiresAt = new Date(Date.now() + durationMs);

  await prisma.temprole.upsert({
    where: { userId_roleId_guildId: { userId, roleId, guildId } },
    update: { expiresAt },
    create: { userId, roleId, guildId, expiresAt },
  });

  if (durationMs <= 10 * 60 * 1000) {
    const remainingTime = expiresAt.getTime() - Date.now();
    scheduleTempRoleRemoval(userId, roleId, guildId, remainingTime);
  }
}

function scheduleTempRoleRemoval(userId: string, roleId: string, guildId: string, remainingTime: number) {
  const key = `${userId}-${roleId}-${guildId}`;

  if (remainingTime > 0) {
    if (tempRoleTimers.has(key)) clearTimeout(tempRoleTimers.get(key));

    const timeout = setTimeout(() => {
      // Instead of removing the role, notify the main process
      process.send?.({ type: 'removeTempRole', userId, roleId, guildId });

      tempRoleTimers.delete(key);
    }, remainingTime);

    tempRoleTimers.set(key, timeout);
  } else {
    process.send?.({ type: 'removeTempRole', userId, roleId, guildId });
  }
}

async function removeTempRole(userId: string, roleId: string, guildId: string) {
  const key = `${userId}-${roleId}-${guildId}`;

  if (tempRoleTimers.has(key)) {
    clearTimeout(tempRoleTimers.get(key));
    tempRoleTimers.delete(key);
  }

  await prisma.temprole.deleteMany({ where: { userId, roleId, guildId } });
}
