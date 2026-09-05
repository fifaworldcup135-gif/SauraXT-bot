import express from 'express';
import { config } from './config.js';

export function startKeepAliveServer(client) {
  const app = express();
  const port = process.env.PORT || 3000;

  app.use('/assets', express.static('assets'));

  app.get('/', (req, res) => {
    const uptimeSec = Math.floor(process.uptime());
    const hours = Math.floor(uptimeSec / 3600);
    const minutes = Math.floor((uptimeSec % 3600) / 60);
    const seconds = uptimeSec % 60;
    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`;

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.botName} - 24/7 Live Status</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
          body { background: #0f111a; color: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { background: #1a1d2d; border-radius: 16px; padding: 32px; max-width: 520px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1px solid #2a2e45; text-align: center; }
          .logo-img { width: 64px; height: 64px; border-radius: 50%; margin-bottom: 16px; box-shadow: 0 0 15px rgba(106, 90, 205, 0.6); }
          .status { display: inline-flex; align-items: center; gap: 10px; font-size: 20px; font-weight: bold; margin-bottom: 12px; }
          .dot { width: 14px; height: 14px; background: #57F287; border-radius: 50%; box-shadow: 0 0 10px #57F287; animation: pulse 2s infinite; }
          @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
          .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 24px; }
          .stat-box { background: #23273c; padding: 16px; border-radius: 10px; }
          .stat-val { font-size: 22px; font-weight: bold; color: #5865F2; }
          .stat-label { font-size: 13px; color: #949ba4; margin-top: 4px; }
          .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="card">
          <img class="logo-img" src="${config.assets.logoGif}" alt="SauraXT Logo">
          <div class="status">
            <div class="dot"></div>
            <span>${config.botName} is ONLINE</span>
          </div>
          <p style="color: #949ba4;">Official Discord Bot for SAURAXT KA server. 24/7 Cloud Engine Active.</p>
          <div class="stats">
            <div class="stat-box">
              <div class="stat-val">${client?.ws?.ping >= 0 ? client.ws.ping + ' ms' : 'Connecting...'}</div>
              <div class="stat-label">Websocket Ping</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">${client?.guilds?.cache?.size || 0}</div>
              <div class="stat-label">Guilds Active</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">${client?.users?.cache?.size || 0}</div>
              <div class="stat-label">Users Cached</div>
            </div>
            <div class="stat-box">
              <div class="stat-val">${uptimeStr}</div>
              <div class="stat-label">System Uptime</div>
            </div>
          </div>
          <div class="footer">
            Powered by Discord.js v14 &bull; 24/7 Cloud Host
          </div>
        </div>
      </body>
      </html>
    `);
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      bot: client?.user?.tag || 'connecting',
      ping: client?.ws?.ping || 0,
      uptime: process.uptime()
    });
  });

  app.listen(port, () => {
    console.log(`?? 24/7 Web Keep-Alive Dashboard listening on port ${port}`);
  });
}
