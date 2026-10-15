export const BRAND = '#3A7CA5';

export const MOODS = [
  { label: 'Radiant', emoji: '🤩', score: 5 },
  { label: 'Steady', emoji: '😌', score: 4 },
  { label: 'Cloudy', emoji: '😐', score: 3 },
  { label: 'Heavy', emoji: '🙁', score: 2 },
  { label: 'Stormy', emoji: '😣', score: 1 },
];

export const moodScoreFor = (mood?: string) =>
  MOODS.find((item) => item.label.toLowerCase() === (mood || '').trim().toLowerCase())?.score;

/** Turns a 1-5 average into the nearest mood name, so the score is not shown by colour alone. */
export const labelForAverage = (score: number) => {
  if (!score) return 'No entries yet';
  if (score >= 4.5) return 'Radiant';
  if (score >= 3.5) return 'Steady';
  if (score >= 2.5) return 'Cloudy';
  if (score >= 1.5) return 'Heavy';
  return 'Stormy';
};

const pad = (value: number) => String(value).padStart(2, '0');

export const todayStamp = () => {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const stampFromDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const moodEmoji = (mood?: string) =>
  MOODS.find((item) => item.label.toLowerCase() === (mood || '').toLowerCase())?.emoji || (mood ? '🙂' : '');

export const shortMonth = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();

export const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export const formatLongDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

export const entryTimestamp = (entry: { createdAt?: string; updatedAt?: string; date: string }) =>
  new Date(entry.createdAt || entry.updatedAt || entry.date).getTime();
