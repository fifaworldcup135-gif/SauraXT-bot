import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, '../../data/database.json');

class Database {
  constructor() {
    this.data = {
      guilds: {},
      users: {},
      warnings: {},
      tickets: {},
      giveaways: {},
      afk: {}
    };
    this.init();
  }

  init() {
    try {
      const dir = path.dirname(DB_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        if (raw.trim()) {
          this.data = JSON.parse(raw);
          this.data.guilds = this.data.guilds || {};
          this.data.users = this.data.users || {};
          this.data.warnings = this.data.warnings || {};
          this.data.tickets = this.data.tickets || {};
          this.data.giveaways = this.data.giveaways || {};
          this.data.afk = this.data.afk || {};
        }
      } else {
        this.save();
      }
    } catch (err) {
      console.error('Database load error:', err);
    }
  }

  save() {
    try {
      const tempPath = DB_FILE + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Database save error:', err);
    }
  }

  getGuild(guildId) {
    if (!this.data.guilds[guildId]) {
      this.data.guilds[guildId] = {
        welcomeChannel: null,
        welcomeMessage: 'Welcome {user} to **{server}**! You are member #{memberCount} 🎉',
        goodbyeChannel: null,
        goodbyeMessage: '{user} has left the server. Goodbye! 👋',
        modLogChannel: null,
        levelChannel: null,
        aiChatChannel: null,
        autoRoleId: null,
        levelRoles: {},
        ticketCategory: null,
        ticketSupportRole: null,
        youtube: {
          channelId: null,
          channelHandle: null,
          discordChannelId: null,
          pingRole: null,
          customMessage: '🔴 **{channelName} IS LIVE NOW!**\\nCome join the stream: {url} 🎉',
          lastVideoId: null
        },
        automod: {
          antiLink: false,
          antiSpam: false,
          antiCaps: false,
          badWords: []
        }
      };
      this.save();
    }
    return this.data.guilds[guildId];
  }

  updateGuild(guildId, updates) {
    const guild = this.getGuild(guildId);
    this.data.guilds[guildId] = { ...guild, ...updates };
    this.save();
    return this.data.guilds[guildId];
  }

  getUserKey(guildId, userId) {
    return guildId + '_' + userId;
  }

  getUser(guildId, userId) {
    const key = this.getUserKey(guildId, userId);
    if (!this.data.users[key]) {
      this.data.users[key] = {
        guildId,
        userId,
        wallet: 500,
        bank: 0,
        bankCapacity: 5000,
        xp: 0,
        level: 1,
        messagesCount: 0,
        lastDaily: 0,
        lastWork: 0,
        lastBeg: 0,
        lastRob: 0,
        shieldUntil: 0,
        inventory: {},
        favorites: [],
        playlists: {},
        createdAt: Date.now()
      };
      this.save();
    }
    // Ensure backwards compatibility for existing user objects
    if (!this.data.users[key].favorites) this.data.users[key].favorites = [];
    if (!this.data.users[key].playlists) this.data.users[key].playlists = {};
    return this.data.users[key];
  }

  addFavorite(guildId, userId, track) {
    const user = this.getUser(guildId, userId);
    user.favorites = user.favorites || [];
    if (!user.favorites.some(f => f.url === track.url)) {
      user.favorites.push({
        title: track.title,
        url: track.url,
        duration: track.duration,
        artist: track.artist,
        thumbnail: track.thumbnail,
        addedAt: Date.now()
      });
      this.save();
      return true;
    }
    return false;
  }

  getFavorites(guildId, userId) {
    const user = this.getUser(guildId, userId);
    return user.favorites || [];
  }

  removeFavorite(guildId, userId, index) {
    const user = this.getUser(guildId, userId);
    if (!user.favorites || index < 0 || index >= user.favorites.length) return null;
    const removed = user.favorites.splice(index, 1);
    this.save();
    return removed[0];
  }

  savePlaylist(guildId, userId, name, tracks) {
    const user = this.getUser(guildId, userId);
    user.playlists = user.playlists || {};
    user.playlists[name.toLowerCase()] = {
      name,
      tracks: tracks.map(t => ({
        title: t.title,
        url: t.url,
        duration: t.duration,
        artist: t.artist,
        thumbnail: t.thumbnail
      })),
      updatedAt: Date.now()
    };
    this.save();
    return user.playlists[name.toLowerCase()];
  }

  getPlaylists(guildId, userId) {
    const user = this.getUser(guildId, userId);
    return user.playlists || {};
  }

  getPlaylist(guildId, userId, name) {
    const user = this.getUser(guildId, userId);
    if (!user.playlists) return null;
    return user.playlists[name.toLowerCase()] || null;
  }

  deletePlaylist(guildId, userId, name) {
    const user = this.getUser(guildId, userId);
    if (!user.playlists || !user.playlists[name.toLowerCase()]) return false;
    delete user.playlists[name.toLowerCase()];
    this.save();
    return true;
  }

  updateUser(guildId, userId, updates) {
    const key = this.getUserKey(guildId, userId);
    const user = this.getUser(guildId, userId);
    this.data.users[key] = { ...user, ...updates };
    this.save();
    return this.data.users[key];
  }

  getLeaderboard(guildId, type = 'xp', limit = 10) {
    const users = Object.values(this.data.users).filter(u => u.guildId === guildId);
    if (type === 'xp') {
      users.sort((a, b) => (b.xp || 0) - (a.xp || 0));
    } else if (type === 'economy') {
      users.sort((a, b) => ((b.wallet || 0) + (b.bank || 0)) - ((a.wallet || 0) + (a.bank || 0)));
    }
    return users.slice(0, limit);
  }

  getWarnings(guildId, userId) {
    const key = this.getUserKey(guildId, userId);
    return this.data.warnings[key] || [];
  }

  addWarning(guildId, userId, modId, reason) {
    const key = this.getUserKey(guildId, userId);
    if (!this.data.warnings[key]) this.data.warnings[key] = [];
    const warning = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
      userId,
      modId,
      reason: reason || 'No reason provided',
      timestamp: Date.now()
    };
    this.data.warnings[key].push(warning);
    this.save();
    return warning;
  }

  clearWarnings(guildId, userId) {
    const key = this.getUserKey(guildId, userId);
    const count = (this.data.warnings[key] || []).length;
    this.data.warnings[key] = [];
    this.save();
    return count;
  }

  createTicket(guildId, channelId, userId) {
    this.data.tickets[channelId] = {
      guildId,
      channelId,
      userId,
      claimedBy: null,
      status: 'open',
      createdAt: Date.now()
    };
    this.save();
    return this.data.tickets[channelId];
  }

  getTicket(channelId) {
    return this.data.tickets[channelId] || null;
  }

  updateTicket(channelId, updates) {
    if (this.data.tickets[channelId]) {
      this.data.tickets[channelId] = { ...this.data.tickets[channelId], ...updates };
      this.save();
    }
  }

  createGiveaway(data) {
    this.data.giveaways[data.messageId] = {
      ...data,
      entries: [],
      ended: false,
      createdAt: Date.now()
    };
    this.save();
    return this.data.giveaways[data.messageId];
  }

  getGiveaway(messageId) {
    return this.data.giveaways[messageId] || null;
  }

  getAllActiveGiveaways() {
    return Object.values(this.data.giveaways).filter(g => !g.ended);
  }

  updateGiveaway(messageId, updates) {
    if (this.data.giveaways[messageId]) {
      this.data.giveaways[messageId] = { ...this.data.giveaways[messageId], ...updates };
      this.save();
    }
  }

  setAfk(guildId, userId, reason) {
    const key = this.getUserKey(guildId, userId);
    this.data.afk[key] = {
      guildId,
      userId,
      reason: reason || 'AFK',
      timestamp: Date.now()
    };
    this.save();
  }

  getAfk(guildId, userId) {
    const key = this.getUserKey(guildId, userId);
    return this.data.afk[key] || null;
  }

  removeAfk(guildId, userId) {
    const key = this.getUserKey(guildId, userId);
    if (this.data.afk[key]) {
      const data = this.data.afk[key];
      delete this.data.afk[key];
      this.save();
      return data;
    }
    return null;
  }
}

export const db = new Database();