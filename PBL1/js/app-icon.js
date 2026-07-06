/**
 * app-icon.js — 시간대·날짜 기반 동적 앱 아이콘
 */

import { getSettings } from './storage.js';

export const ICON_VARIANTS = Object.freeze({
  night:  'app_icon_candidate_night.png',
  day:    'app_icon_candidate_day.png',
  mint:   'app_icon_candidate_mint.png',
  sunset: 'app_icon_candidate_sunset.png',
});

export const ICON_VARIANT_ORDER = ['night', 'mint', 'day', 'sunset'];

export function getAssetBase() {
  return window.location.pathname.includes('/pages/') ? '../' : '';
}

/** 22~05 밤 · 06~10 아침 · 11~16 낮 · 17~21 노을 */
export function getIconVariantByHour(hour = new Date().getHours()) {
  if (hour >= 22 || hour < 6) return 'night';
  if (hour < 11) return 'mint';
  if (hour < 17) return 'day';
  return 'sunset';
}

/** 날짜 시드 — 하루 종일 같은 아이콘 */
export function getIconVariantByDate(date = new Date()) {
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ICON_VARIANT_ORDER[hash % ICON_VARIANT_ORDER.length];
}

export function getActiveIconVariant(settings = null, now = new Date()) {
  const s = settings ?? getSettings();
  const mode = s.iconMode ?? 'time';
  return mode === 'daily' ? getIconVariantByDate(now) : getIconVariantByHour(now.getHours());
}

export function getAppIconRelativePath(variant = getActiveIconVariant()) {
  const file = ICON_VARIANTS[variant] ?? ICON_VARIANTS.night;
  return `${getAssetBase()}assets/icon/${file}`;
}

export function getAppBasePath() {
  const path = window.location.pathname;
  return path.includes('/pages/')
    ? path.replace(/\/pages\/[^/]*$/, '/')
    : path.replace(/\/[^/]*$/, '/');
}

export function getAppIconAbsoluteUrl(variant, settings = null) {
  const v = variant ?? getActiveIconVariant(settings);
  const rel = getAppIconRelativePath(v).replace(/^\.\.\//, '');
  return `${window.location.origin}${getAppBasePath()}${rel}`;
}

function ensureLink(rel, href) {
  let link = document.querySelector(`link[rel="${rel}"]`);
  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    document.head.appendChild(link);
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href);
  }
}

let _lastVariant = null;
let _iconTimer = null;

/** favicon·apple-touch-icon 갱신 */
export function applyAppIcons(settings = null) {
  const variant = getActiveIconVariant(settings);
  _lastVariant = variant;
  const href = getAppIconRelativePath(variant);

  ensureLink('icon', href);
  ensureLink('apple-touch-icon', href);

  localStorage.setItem('ss_app_icon_variant', variant);

  const installIcon = document.getElementById('pwa-install-icon');
  if (installIcon) installIcon.src = href;

  window.dispatchEvent(new CustomEvent('ss-app-icon-changed', {
    detail: { variant, href, absoluteUrl: getAppIconAbsoluteUrl(variant, settings) },
  }));

  return variant;
}

export function initAppIcon() {
  const refresh = () => {
    const variant = getActiveIconVariant();
    if (variant === _lastVariant) return;
    applyAppIcons();
    window.ssSyncBackgroundAlarm?.();
  };

  refresh();

  if (_iconTimer) clearInterval(_iconTimer);
  _iconTimer = setInterval(refresh, 60_000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refresh();
  });
}

export function getIconModeLabel(mode) {
  return mode === 'daily' ? '매일 랜덤' : '시간대에 맞게';
}
