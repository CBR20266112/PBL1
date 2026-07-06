/**
 * morningcall.js — Sleepy Sheep 전용 모닝콜 유틸
 */

import { getSettings, getItem, setItem } from './storage.js';

export const MORNING_ACTION = Object.freeze({
  PET:  'pet',
  FEED: 'feed',
});

/** 쓰다듬기 또는 당근 먹이기 중 하나 랜덤 선택 */
export function pickMorningAction() {
  return Math.random() < 0.5 ? MORNING_ACTION.PET : MORNING_ACTION.FEED;
}

/** 모닝콜 관련 설정 반환 */
export function getMorningCallConfig() {
  const settings = getSettings();
  return {
    simple:       settings.morningCallSimple === true,
    wakeAlarm:    settings.wakeAlarm || '07:00',
    notification: settings.notification !== false,
  };
}

/** 'HH:MM' → 분 */
export function parseTimeToMinutes(timeStr) {
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  return h * 60 + m;
}

/** 현재 시각이 기상 알람 시각인지 (±1분) */
export function isWakeAlarmNow(wakeAlarm) {
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const target  = parseTimeToMinutes(wakeAlarm);
  return Math.abs(current - target) <= 1;
}

/**
 * 설정된 기상 알람 시각에 콜백 실행
 * @param {(payload: { simple: boolean, scheduled: boolean }) => void} onTrigger
 * @returns {number} interval id
 */
export function initWakeAlarmScheduler(onTrigger) {
  const check = () => {
    const { wakeAlarm, notification, simple } = getMorningCallConfig();
    if (!notification) return;

    const today = new Date().toISOString().slice(0, 10);
    if (getItem('ss_morningcall_fired_date') === today) return;
    if (!isWakeAlarmNow(wakeAlarm)) return;

    setItem('ss_morningcall_fired_date', today);
    onTrigger({ simple, scheduled: true });
  };

  check();
  return setInterval(check, 30000);
}
