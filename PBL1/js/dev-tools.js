/**
 * dev-tools.js — 시연용 개발자 옵션
 */

import {
  ATTENDANCE_STORIES,
  ATTENDANCE_SINGLE_COUNT,
  ATTENDANCE_STRIP_COUNT,
} from './constants.js';
import {
  getAttendance,
  ATTENDANCE_KEY,
  singleIdFromIndex,
  stripIdFromIndex,
} from './attendance.js';
import { getItem, setItem } from './storage.js';

export const DEV_MODE_KEY = 'ss_dev_mode';
const OPENING_VIEWED_KEY = 'ss_opening_viewed';

export function isDevModeEnabled() {
  return getItem(DEV_MODE_KEY) === true;
}

export function setDevModeEnabled(on) {
  setItem(DEV_MODE_KEY, !!on);
}

/** 오프닝·출석 스토리·수집 일러스트 전체 해금 */
export function unlockAllGallery() {
  setItem(OPENING_VIEWED_KEY, true);

  const att = getAttendance();
  const allStories = ATTENDANCE_STORIES.map(s => s.id);
  const allSingles = Array.from(
    { length: ATTENDANCE_SINGLE_COUNT },
    (_, i) => singleIdFromIndex(i + 1),
  );
  const allStrips = ATTENDANCE_STRIP_COUNT > 0
    ? Array.from({ length: ATTENDANCE_STRIP_COUNT }, (_, i) => stripIdFromIndex(i + 1))
    : [];

  setItem(ATTENDANCE_KEY, {
    ...att,
    unlocked: [...new Set([...att.unlocked, ...allStories])],
    collectedSingles: [...new Set([...att.collectedSingles, ...allSingles])],
    collectedStrips: [...new Set([...att.collectedStrips, ...allStrips])],
  });
}
