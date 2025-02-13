import { Client, Events } from 'discord.js';
import { fork } from 'child_process';
import { TempRoleMessage } from './temproles-background.js';
import { PrismaClient } from '@prisma/client';

const tempRolesService = fork('./dist/temprole/temproles-background.js');

let init = false;

export function listen(client: Client) {
  if (init) console.log('[TempRole]: Failed to start, process was already initiated');
  console.log('[TempRole]: Starting temprole background services');
  init = true;
  const prisma = new PrismaClient();

  client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

    for (const role of removedRoles.values()) {
      removeTempRole(newMember.id, role.id, newMember.guild.id);
    }
  });

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

  tempRolesService.on('message', async (message: TempRoleMessage) => {
    if (!message || typeof message !== 'object') return;
    await removeRole(message);
  });

  async function removeRole(message: TempRoleMessage) {
    // service requested a role removal
    if (message.type === 'removeTempRole') {
      const { userId, roleId, guildId } = message;
      try {
        const guild = await client.guilds.fetch(guildId);
        const member = await guild.members.fetch(userId);
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          console.log(`[TempRoles]: Removed temp role ${roleId} from ${userId}`);
        }
      } catch (error) {
        console.error(`[TempRoles]: Failed to remove temp role ${roleId} from ${userId}:`, error);
      } finally {
        // confirm role removal was attempted to remove from db
        removeTempRole(userId, roleId, guildId);
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

    console.log(`[TempRole]: Scheduling ${upcomingExpiredRoles.length} roles for removal`);

    for (const { userId, roleId, guildId, expiresAt } of upcomingExpiredRoles) {
      const remainingTime = expiresAt.getTime() - Date.now();
      tempRolesService.send({ type: 'scheduleRoleRemoval', userId, roleId, guildId, durationMs: remainingTime });
    }
  }
}

export function addTempRole(userId: string, roleId: string, guildId: string, durationMs: number) {
  tempRolesService.send({ type: 'addTempRole', userId, roleId, guildId, durationMs });
}

export function removeTempRole(userId: string, roleId: string, guildId: string) {
  tempRolesService.send({ type: 'removeTempRole', userId, roleId, guildId });
}
