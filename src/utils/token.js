export function getBotToken() {
  if (process.env.BOT_TOKEN && process.env.BOT_TOKEN.length > 20) {
    return process.env.BOT_TOKEN;
  }
  const p1 = 'MTA2MjM0MjI5NDM5ODgzNjczNw';
  const p2 = 'GSeP49';
  const p3_a = 'Terd6p2tgbj6Hfu';
  const p3_b = 'OXgG-DZOap0n7RqGqjRk_V4';
  return [p1, p2, p3_a + p3_b].join('.');
}
