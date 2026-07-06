/**
 * dream-diary.js — 꿈일기 (수면 감정 + 마음 대화 통합)
 */

import { getDayEntry, formatDateLabel, moodEmoji } from './calendar.js';
import { formatDuration } from './sleep.js';
import { getSleepRecords, getWorries } from './storage.js';

function collectDates() {
  const dates = new Set();
  getSleepRecords().forEach(r => { if (r.date) dates.add(r.date); });
  getWorries().forEach(w => { if (w.date) dates.add(w.date); });
  return [...dates].sort((a, b) => b.localeCompare(a));
}

/**
 * 최근 꿈일기 항목
 * @param {number} limit
 */
export function getDreamDiaryEntries(limit = 40) {
  return collectDates()
    .slice(0, limit)
    .map(date => {
      const entry = getDayEntry(date);
      const thread = entry.worryThread || [];
      const lastUser = [...thread].reverse().find(t => t.role === 'user');
      const lastModel = [...thread].reverse().find(t => t.role === 'model');

      return {
        date,
        dateLabel: formatDateLabel(date),
        mood: entry.sleep?.mood ?? null,
        moodEmoji: entry.sleep ? moodEmoji(entry.sleep.mood) : null,
        sleepDuration: entry.sleep?.duration ?? 0,
        sleepNote: entry.sleep?.note?.trim() || '',
        bedtime: entry.sleep?.bedtime,
        wakeTime: entry.sleep?.wakeTime,
        hasSleep: entry.hasSleep,
        hasWorry: entry.hasWorry,
        thread,
        worryPreview: lastUser?.content?.slice(0, 120) || entry.worry?.content?.slice(0, 120) || '',
        replyPreview: lastModel?.content?.slice(0, 140) || entry.worry?.reply?.slice(0, 140) || '',
        hasAny: entry.hasAny,
      };
    })
    .filter(e => e.hasAny);
}

export function formatDiarySummary(entry) {
  const parts = [];
  if (entry.hasSleep && entry.sleepDuration) {
    parts.push(`수면 ${formatDuration(entry.sleepDuration)}`);
  }
  if (entry.moodEmoji) parts.push(entry.moodEmoji);
  if (entry.hasWorry) parts.push('대화 있음');
  return parts.join(' · ') || '기록';
}
