/**
 * friends.js - friend list and room preview helpers
 */

import { DUMMY_FRIENDS } from './constants.js';

export function getFriends() {
  return DUMMY_FRIENDS;
}

export function getFriendById(id) {
  return DUMMY_FRIENDS.find(f => f.id === id) ?? null;
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export function buildFriendCardHTML(friend) {
  const statusHTML = friend.isSleeping
    ? '<div class="friend-sleeping">🌙 수면 중</div>'
    : `<div class="friend-status">마지막 활동 ${timeAgo(friend.lastSeen)}</div>`;

  const streakBadge = friend.streak > 0
    ? `<span style="font-size:0.7rem;color:var(--color-star);font-weight:700">🔥 ${friend.streak}일 연속</span>`
    : '';

  return `
<div class="friend-card" data-friend-id="${friend.id}" role="button" tabindex="0">
  <div class="friend-avatar">🐑</div>
  <div class="friend-info">
    <div class="friend-name">${friend.name}</div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:2px">
      <span class="level-badge" style="font-size:0.65rem;padding:2px 8px">Lv.${friend.level}</span>
      ${streakBadge}
    </div>
    ${statusHTML}
  </div>
  <div style="font-size:1.2rem;opacity:0.5">›</div>
</div>`;
}

export function buildFriendRoomHTML(friend) {
  const title = friend.isSleeping ? `🌙 ${friend.name}의 침실` : `🏠 ${friend.name}의 방`;

  if (friend.id === 'friend_ridajol') {
    return `
<div class="friend-room-container glass" style="border-radius: var(--radius-xl); padding: 0; overflow: hidden; position: relative;">
  <div style="padding: 16px 20px 8px; background: rgba(0,0,0,0.4); backdrop-filter: blur(8px); z-index: 10; position: relative;">
    <div style="font-size: 1rem; font-weight: 800; color: #fff;">${title}</div>
    <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 2px;">
      Lv.${friend.level} · 🔥 ${friend.streak}일 연속
    </div>
  </div>
  <div style="position: relative; width: 100%; display: flex; justify-content: center; align-items: center; background: #000;">
    <img src="../assets/friends/ridajol_room.jpg" alt="${friend.name}의 침실" style="width: 100%; max-height: 480px; object-fit: contain; display: block;">
  </div>
</div>`;
  }

  return `
<div class="glass" style="border-radius: var(--radius-xl); padding: 40px 20px; text-align: center; background: linear-gradient(180deg, #1a1040 0%, #2D1B4E 100%)">
  <div style="font-size: 3rem; margin-bottom: 16px;">🔒</div>
  <div style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 8px;">${title}</div>
  <div style="font-size: 0.85rem; color: rgba(255,255,255,0.5); line-height: 1.6;">이 친구는 아직 방을<br>공개하지 않았어요.</div>
  <div style="margin-top: 20px; font-size: 0.75rem; color: rgba(255,255,255,0.3);">Lv.${friend.level} · 🔥 ${friend.streak}일 연속</div>
</div>`;
}
