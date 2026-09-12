import { PermissionFlagsBits } from 'discord.js';

export async function secureServerRoles(guild, client) {
  const report = {
    securedRoles: [],
    securedChannels: 0,
    staffRoles: [],
    skippedRoles: []
  };

  try {
    const botMember = guild.members.me || await guild.members.fetch(client.user.id).catch(() => null);
    if (!botMember) return report;

    const botHighestRole = botMember.roles.highest;
    const canManageRoles = botMember.permissions.has(PermissionFlagsBits.ManageRoles) || botMember.permissions.has(PermissionFlagsBits.Administrator);

    // 1. Audit & Secure @everyone base role
    const everyoneRole = guild.roles.everyone;
    if (canManageRoles && everyoneRole.permissions.has(PermissionFlagsBits.MentionEveryone)) {
      try {
        const newPerms = everyoneRole.permissions.remove(
          PermissionFlagsBits.MentionEveryone,
          PermissionFlagsBits.SendTTSMessages
        );
        await everyoneRole.setPermissions(newPerms, 'AutoMod Professional Security: Remove @everyone mention from base role');
        report.securedRoles.push('@everyone (Server default)');
      } catch (err) {
        console.error('Failed to secure @everyone role:', err.message);
      }
    }

    // 2. Audit all other roles (Gamers, CG Member, OG Member, etc.)
    for (const role of guild.roles.cache.values()) {
      if (role.id === guild.id || role.managed) continue;

      const isStaffRole = role.permissions.has(PermissionFlagsBits.Administrator) ||
                          role.permissions.has(PermissionFlagsBits.ManageGuild) ||
                          role.permissions.has(PermissionFlagsBits.ManageMessages) ||
                          role.name.toLowerCase().includes('mod') ||
                          role.name.toLowerCase().includes('admin') ||
                          role.name.toLowerCase().includes('owner') ||
                          role.name.toLowerCase().includes('ceo');

      if (isStaffRole) {
        report.staffRoles.push(role.name);
        continue;
      }

      // If a non-staff role has MentionEveryone, revoke it!
      if (role.permissions.has(PermissionFlagsBits.MentionEveryone)) {
        if (canManageRoles && role.position < botHighestRole.position) {
          try {
            const updated = role.permissions.remove(
              PermissionFlagsBits.MentionEveryone,
              PermissionFlagsBits.SendTTSMessages
            );
            await role.setPermissions(updated, 'AutoMod Professional Security: Revoke @everyone mention from member role');
            report.securedRoles.push(role.name);
          } catch (e) {
            report.skippedRoles.push(`${role.name} (Hierarchy limit)`);
          }
        } else {
          report.skippedRoles.push(`${role.name} (Role position higher than bot)`);
        }
      }
    }

    // 3. Channel Permission Overwrites (Lockdown text channels against @everyone pings)
    const canManageChannels = botMember.permissions.has(PermissionFlagsBits.ManageChannels) || botMember.permissions.has(PermissionFlagsBits.Administrator);
    if (canManageChannels) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased() && !channel.isThread()) {
          const cName = channel.name.toLowerCase();
          // Preserve game drop notification channels like #free-games so FreeStuff bot can notify
          if (cName.includes('free-game') || cName.includes('freegame') || cName.includes('drop')) continue;

          try {
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
              MentionEveryone: false,
              SendTTSMessages: false
            }, { reason: 'AutoMod: Enforce gaming server mention security' });
            report.securedChannels++;
          } catch (chanErr) {}
        }
      }
    }
  } catch (globalErr) {
    console.error('Error in secureServerRoles:', globalErr);
  }

  return report;
}
