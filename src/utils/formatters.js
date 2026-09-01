export function formatNumber(num) {
  return (num || 0).toLocaleString('en-US');
}

export function formatDuration(ms) {
  if (ms < 0) ms = 0;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(days + 'd');
  if (hours > 0) parts.push(hours + 'h');
  if (minutes > 0) parts.push(minutes + 'm');
  if (seconds > 0 || parts.length === 0) parts.push(seconds + 's');
  return parts.join(' ');
}

export function progressBar(current, total, barSize = 12) {
  if (total <= 0) return '[░░░░░░░░░░░░] 0%';
  const percentage = Math.min(Math.max(current / total, 0), 1);
  const progress = Math.round(barSize * percentage);
  const emptyProgress = barSize - progress;

  const progressText = '█'.repeat(progress);
  const emptyProgressText = '░'.repeat(emptyProgress);
  const percentageText = Math.round(percentage * 100) + '%';

  return '[' + progressText + emptyProgressText + '] ' + percentageText;
}

export function calculateLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp || 0)) + 1;
}

export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(Math.pow((level - 1) / 0.1, 2));
}