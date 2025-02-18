import { Client, Events } from 'discord.js';
import { fork } from 'child_process';
import { ScheduledRoleMessage } from './temproles-background.js';
import { $Enums, PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const tempRolesService = fork('./dist/temprole/temproles-background.js');
const pendingRequests = new Map<string, { reject: (reason?: any) => void; resolve: (reason?: any) => void; timeout: NodeJS.Timeout }>();

let init = false;

export function listen(client: Client) {
  if (init) console.log('[TempRole]: Failed to start, process was already initiated');
  console.log('[TempRole]: Starting temprole background services');
  init = true;
  const prisma = new PrismaClient();

  client.once(Events.ClientReady, () => {
    scheduleRemovals();
    setInterval(
      async () => {
        await scheduleRemovals();
      },
      // 10m interval
      10 * 60 * 1000
    );
  });

  tempRolesService.on('message', async (message: ScheduledRoleMessage) => {
    if (!message || typeof message !== 'object') return;
    await removeRole(message);
  });

  async function removeRole(message: ScheduledRoleMessage | { type: 'confirmation'; id: string; value: string }) {
    console.log(message);
    // service requested a role removal
    if (message.type === 'removeTempRole') {
      const { userId, roleId, guildId, action } = message;
      try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        if (action === 'ADD') {
          // if the action is to add the role and the user does not have the role, add it
          if (!member.roles.cache.has(roleId)) {
            member.roles.add(roleId);
          }
          // if the action is to remove the role and the user has the role, remove it
        } else if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          console.log(`[TempRoles]: Removed temp role ${roleId} from ${userId}`);
        }
      } catch (error) {
        console.error(`[TempRoles]: Failed to remove temp role ${roleId} from ${userId}:`, error);
      } finally {
        // regardless of what happened in the try, remove the scheduled role from the db
        await removeScheduledRole(userId, roleId, guildId, action);
      }
    } else if (message.type === 'confirmation') {
      const pending = pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        if (message.value) pending.resolve(message.value);
        else pending.reject();
      }
    }
  }

  async function scheduleRemovals() {
    const now = new Date();
    const futureTime = new Date(now.getTime() + 10 * 60 * 1000); // Current time + 10 minutes
    const upcomingExpiredRoles = await prisma.temprole.findMany({
      where: {
        expiresAt: {
          lte: futureTime, // Less than or equal to the future time
        },
      },
    });

    console.log(`[TempRole]: Scheduling ${upcomingExpiredRoles.length} roles`);

    for (const { userId, roleId, guildId, expiresAt, action } of upcomingExpiredRoles) {
      const remainingTime = expiresAt.getTime() - Date.now();
      tempRolesService.send({ type: 'scheduleRoleRemoval', userId, roleId, guildId, action, durationMs: remainingTime });
    }
  }
}

export async function addScheduledRole(userId: string, roleId: string, guildId: string, action: $Enums.TemproleMode, durationMs: number) {
  const id = randomUUID();
  tempRolesService.send({ type: 'addTempRole', userId, roleId, guildId, action, durationMs, id });
  return await listenForConfirmation(id);
}

export async function removeScheduledRole(userId: string, roleId: string, guildId: string, action: $Enums.TemproleMode) {
  const id = randomUUID();
  tempRolesService.send({ type: 'removeTempRole', userId, roleId, guildId, action, id });
  return await listenForConfirmation(id);
}

function listenForConfirmation(id: string) {
  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Schedled role timed out'));
      }
      // 10 seconds
    }, 10 * 1000);

    pendingRequests.set(id, { resolve, reject, timeout });
  });
}
