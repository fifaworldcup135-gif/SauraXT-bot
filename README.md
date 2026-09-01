# 🤖 SAURAXT All-in-One Discord Bot (v2.0)

> An enterprise-grade, fully featured All-in-One Discord Bot tailored for **SAURAXT KA server**, featuring High-Quality Music & Audio Playback, Expert AI-Powered Support Tickets, 24/7 YouTube Live Stream Notifier, Auto AI Chatbot, Button Roles, Moderation & AutoMod, Economy & Casino, Leveling & XP, Giveaways, Audit Logging, and 24/7 Lifetime Cloud Hosting.

---

## 🌟 Full Feature Suite (67 Slash Commands)

### 📩 1. Expert AI-Powered Support Ticket Hub
- `/ticketsetup [category] [support_role]` — Deploys an interactive Support Hub with a category dropdown:
  - 💬 **General Server Support**
  - 🚨 **Player Report / Scams**
  - 🪙 **Economy & Shop Issues**
  - 🎥 **YouTube & Collab Requests**
  - 🐛 **Bug Reports & Suggestions**
- **Automated AI Initial Diagnostic**: Immediately gives relevant troubleshooting instructions or asks for player IDs/proof based on the chosen category.
- **In-Ticket Action Controls**:
  - 🙋 **Claim Ticket** — Assigns a staff member to handle the ticket.
  - 📋 **Save Transcript** — Generates a downloadable `.txt` transcript with full chat logs and timestamps.
  - ⚡ **AI Assistant Diagnostic** — Runs real-time evaluation and tips.
  - 🔒 **Close Ticket** — Safely archives and closes the ticket with a 5-second countdown.

### 🎵 2. Music & Voice Playback System
- `/play <query_or_url>` — Search and stream high quality music from YouTube / Spotify / Soundcloud in your voice channel.
- `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/volume`, `/loop`.
- **Interactive Buttons**: All playing songs include live controller buttons (⏯️ Pause/Resume, ⏭️ Skip, 🔁 Loop, ⏹️ Stop, 📜 Queue).

### 🔴 3. 24/7 YouTube Live Stream Notifier
- `/setyoutube <channel_id_or_handle> <discord_channel> [ping_role] [custom_message]` — Automatically checks YouTube every 2 minutes. When you go live or upload a video, it immediately pings `@everyone` or your stream role with the thumbnail, direct stream link, and title!
- `/testyoutube` — Sends a test live stream announcement to preview how it looks.

### 🤖 4. Auto AI Chatbot System
- `/setaichat [channel]` — Set a dedicated channel (e.g. `#ai-chat`) where the bot automatically replies to all messages using conversational AI with natural typing indicators.
- **Direct Mention Chat**: Members can also mention `@SauraXT` in any channel to talk with the AI in English, Hindi, or Hinglish!

### 🎭 5. Interactive Button Roles
- `/buttonrole <title> <description> <role1> <label1> [role2] [label2] [role3] [label3]` — Create button-based role menus for stream alerts and gaming roles.

### 🛡️ 6. Moderation & Server Protection
- `/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clearwarns`, `/purge`, `/slowmode`, `/lock`, `/unlock`, `/nuke`.
- `/automod` — Anti-Link, Anti-Spam rate limits, Anti-Caps, and Bad Words blacklist.

### 🪙 7. Economy & Casino
- `/daily`, `/work`, `/beg`, `/rob`, `/pay`, `/balance`, `/deposit`, `/withdraw`.
- `/blackjack` (interactive buttons), `/slots`, `/coinflip`.
- `/shop`, `/buy`, `/inventory`, `/rich`.

### ⭐ 8. Leveling, Giveaways & Server Tools
- `/rank`, `/leaderboard`, `/setlevelchannel`.
- `/giveaway start`, `/giveaway end`, `/giveaway reroll`.
- `/setwelcome`, `/setgoodbye`, `/autorole`, `/setlogs`.
- `/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/embed`, `/poll`, `/afk`, `/ping`, `/help`, `/meme`, `/8ball`, `/trivia`, `/rps`, `/tictactoe`, `/ai`, `/roast`.

---

## 🚀 How to Host 24/7 in the Cloud for FREE (No PC Needed)

### 🌐 Method 1: Render.com + UptimeRobot (100% Free Lifetime Hosting)
1. Push this folder to your GitHub repository (can be private).
2. Go to [Render.com](https://render.com) and create a free account.
3. Click **New +** $\rightarrow$ **Web Service** $\rightarrow$ Connect your repository.
4. Settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/index.js`
5. In **Environment Variables**, add:
   - `BOT_TOKEN` = `MTA2MjM0MjI5NDM5ODgzNjczNw.GFquG_.sQaDt5xvwLvUjN9D4w6GKrjMVyJ-p7qQhdf9DA`
   - `CLIENT_ID` = `1062342294398836737`
   - `PORT` = `3000`
6. Click **Deploy Web Service**.
7. Copy your assigned Render URL (e.g. `https://sauraxt-bot.onrender.com`).
8. Go to [UptimeRobot.com](https://uptimerobot.com) $\rightarrow$ **Add New Monitor** $\rightarrow$ Type: `HTTP(s)` $\rightarrow$ URL: `https://your-bot.onrender.com` $\rightarrow$ Interval: **5 minutes**.
   > *This keeps your bot awake 24/7 forever for free without needing your PC!*

### 🚀 Method 2: Discloud (1-Click Bot Hosting)
1. Zip this folder contents (`src/`, `package.json`, `discloud.config`, `.env`).
2. Go to [Discloud Dashboard](https://discloud.com) and upload the `.zip` file. It runs 24/7 instantly.