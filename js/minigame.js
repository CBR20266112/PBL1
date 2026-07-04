/**
 * minigame.js — 양털깎기 Canvas 미니게임 (파니팡 스타일 최적화 개편)
 * 레이어 구조: bodySheep(z1) → woolCanvas(z2) → cursorCanvas(z3)
 * destination-out 은 woolCanvas에만 적용.
 */

import { calcShearReward } from './constants.js';
import { getSheep, saveSheep } from './storage.js';
import { drawBodySheep, drawWoolLayer } from './sheep-renderer.js';
import { showToast } from './app.js';
import { startShearSound, stopShearSound, startClipperHum, stopClipperHum, resumeAudio } from './sound.js';

// ─── 털 깎임 파티클 물리 클래스 ───
class ShornParticle {
  constructor(x, y, vx, vy, img) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.img = img;
    this.alpha = 1.0;
    this.size = 10 + Math.random() * 10; // 털 알갱이 그릴 크기 (축소)
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.15; // 회전 속도
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.22; // 중력 가속도
    this.vx *= 0.97; // 공기 저항
    this.vy *= 0.97;
    this.rotation += this.vRot;
    this.alpha -= 0.022; // 서서히 투명해지며 소멸
    if (this.alpha < 0) this.alpha = 0;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.drawImage(this.img, -this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

// ─── 내부 상태 ───
let _state = {
  canvasBody:   null,
  canvasWool:   null,
  canvasCursor: null,
  ctxBody:      null,
  ctxWool:      null,
  ctxCursor:    null,
  totalPixels:  0,
  removedPixels:0,
  isDrawing:    false,
  isRunning:    false,
  timerSec:     30,
  timerInterval:null,
  brushSize:    13,  // 바리깡 밀리는 범위 대폭 축소 (한번에 너무 많이 밀리지 않게 설정)
  onUpdate:     null, // (percent, sec) => void
  onFinish:     null, // (percent, reward) => void
  step:         1,
  preloadedAssets: null,
  preloadingPromise: null,
  cursorX:      0,
  cursorY:      0,
};

let _particles = [];
let _prevPos = { x: 0, y: 0 };
let _hasPrevPos = false;
let _animFrame = null;
let _lastVibrateTime = 0;

// ─── 초기화 ───

/**
 * 미니게임 초기화
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvasBody
 * @param {HTMLCanvasElement} opts.canvasWool
 * @param {HTMLCanvasElement} opts.canvasCursor
 * @param {function} opts.onUpdate  (removalPercent, remainSec) => void
 * @param {function} opts.onFinish  (removalPercent, reward) => void
 */
export function initMinigame({ canvasBody, canvasWool, canvasCursor, onUpdate, onFinish }) {
  _state.canvasBody   = canvasBody;
  _state.canvasWool   = canvasWool;
  _state.canvasCursor = canvasCursor;
  _state.onUpdate     = onUpdate;
  _state.onFinish     = onFinish;

  const sheep = getSheep();
  _state.step = sheep.step ?? 1;

  _setupCanvas(canvasBody);
  _setupCanvas(canvasWool);
  _setupCanvas(canvasCursor);

  _state.ctxBody   = canvasBody.getContext('2d');
  _state.ctxWool   = canvasWool.getContext('2d');
  _state.ctxCursor = canvasCursor.getContext('2d');

  // 바리깡 범위 설정 고정값 13px로 조정
  _state.brushSize = 13;

  // 비동기 자원 로드 후 실행
  _state.preloadingPromise = _preloadGameAssets().then(assets => {
    _state.preloadedAssets = assets;
    _drawAll();
    _measureWool();
    _addEvents(canvasWool);
  });
}

/** 게임 시작 */
export function startMinigame() {
  if (_state.isRunning) return;

  const run = () => {
    _state.isRunning  = true;
    _state.timerSec   = 30;
    _state.removedPixels = 0;
    _particles = [];
    _hasPrevPos = false;

    // 지속 렌더링 프레임 루프 가동
    _startRenderLoop();

    _state.timerInterval = setInterval(() => {
      _state.timerSec--;
      if (_state.onUpdate) {
        _state.onUpdate(_getRemovalPercent(), _state.timerSec);
      }
      if (_state.timerSec <= 0) {
        finishMinigame();
      }
    }, 1000);
  };

  if (_state.preloadingPromise) {
    _state.preloadingPromise.then(run);
  } else {
    run();
  }
}

/** 게임 종료 (수동 또는 타이머 만료) */
export function finishMinigame() {
  if (!_state.isRunning) return;
  _state.isRunning = false;
  clearInterval(_state.timerInterval);
  cancelAnimationFrame(_animFrame);
  _animFrame = null;
  
  // 모든 소리 종료
  stopClipperHum();
  stopShearSound();
  
  _removeEvents(_state.canvasWool);

  const percent = _getRemovalPercent();
  const reward  = calcShearReward(percent, _state.step);

  // 양 데이터 업데이트
  const sheep = getSheep();
  sheep.wool        += reward;
  sheep.xp           = 0;
  sheep.woolGrowth   = 0;
  sheep.canShear     = false;
  sheep.shearedAt    = new Date().toISOString();
  saveSheep(sheep);

  if (_state.onFinish) _state.onFinish(percent, reward);
}

// ─── 이미지 에셋 로딩 ───
function _preloadGameAssets() {
  const isSubpage = window.location.pathname.includes('/pages/');
  const basePath = isSubpage ? '../' : '';

  const bodyImg = new Image();
  const woolImg = new Image();
  const clipperImg = new Image();
  const particleImg = new Image();

  bodyImg.src = `${basePath}assets/game/bared.png`;
  woolImg.src = `${basePath}assets/game/fluffy.png`;
  clipperImg.src = `${basePath}assets/game/barriccang.png`;
  particleImg.src = `${basePath}assets/game/particle.png`;

  const p1 = new Promise(resolve => { bodyImg.onload = () => resolve(bodyImg); bodyImg.onerror = () => resolve(null); });
  const p2 = new Promise(resolve => { woolImg.onload = () => resolve(woolImg); woolImg.onerror = () => resolve(null); });
  const p3 = new Promise(resolve => { clipperImg.onload = () => resolve(clipperImg); clipperImg.onerror = () => resolve(null); });
  const p4 = new Promise(resolve => { particleImg.onload = () => resolve(particleImg); particleImg.onerror = () => resolve(null); });

  return Promise.all([p1, p2, p3, p4]).then(([body, wool, clipper, particle]) => {
    return { bodyImg: body, woolImg: wool, clipperImg: clipper, particleImg: particle };
  });
}

// ─── Canvas 드로잉 ───

function _setupCanvas(canvas) {
  const wrapper = canvas.parentElement;
  const size    = Math.min(wrapper.clientWidth, wrapper.clientHeight);
  canvas.width  = size;
  canvas.height = size;
}

function _drawAll() {
  const { canvasBody, canvasWool, ctxBody, ctxWool, preloadedAssets } = _state;
  drawBodySheep(ctxBody, canvasBody.width, canvasBody.height, _state.step, preloadedAssets?.bodyImg);
  drawWoolLayer(ctxWool, canvasWool.width, canvasWool.height, _state.step, preloadedAssets?.woolImg);
}

function _measureWool() {
  const { ctxWool, canvasWool } = _state;
  const data = ctxWool.getImageData(0, 0, canvasWool.width, canvasWool.height).data;
  let count  = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) count++;
  }
  _state.totalPixels = count;
}

function _getRemovalPercent() {
  if (_state.totalPixels <= 0) return 100;
  const { ctxWool, canvasWool } = _state;
  const data = ctxWool.getImageData(0, 0, canvasWool.width, canvasWool.height).data;
  let remaining = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 10) remaining++;
  }
  const removed = _state.totalPixels - remaining;
  return Math.min(100, Math.round((removed / _state.totalPixels) * 100));
}

// ─── 프레임 렌더 루프 (60fps) ───
function _startRenderLoop() {
  const loop = () => {
    if (!_state.isRunning) return;
    _renderCursorCanvas();
    _animFrame = requestAnimationFrame(loop);
  };
  _animFrame = requestAnimationFrame(loop);
}

function _renderCursorCanvas() {
  const ctx = _state.ctxCursor;
  const c   = _state.canvasCursor;
  ctx.clearRect(0, 0, c.width, c.height);

  // 1) 파티클 업데이트 및 렌더링
  _particles.forEach(p => {
    p.update();
    p.draw(ctx);
  });
  _particles = _particles.filter(p => p.alpha > 0);

  // 2) 작동 중 바리깡 이미지 및 커서 렌더링
  if (_state.isDrawing && _state.preloadedAssets?.clipperImg) {
    ctx.save();
    
    // 작동 시 미세한 떨림 진동 추가
    const shakeX = (Math.random() - 0.5) * 3;
    const shakeY = (Math.random() - 0.5) * 3;
    const drawX = _state.cursorX + shakeX;
    const drawY = _state.cursorY + shakeY;

    // 바리깡 깎는 가이드라인 반투명 원 그리기
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(_state.cursorX, _state.cursorY, _state.brushSize, 0, Math.PI * 2);
    ctx.stroke();

    // 바리깡 이미지 그리기 (마우스를 살짝 덮을 만한 크기 50x50)
    const clipperSize = 52;
    ctx.drawImage(
      _state.preloadedAssets.clipperImg,
      drawX - clipperSize / 2,
      drawY - clipperSize / 2,
      clipperSize,
      clipperSize
    );
    
    ctx.restore();
  }
}

// ─── 이벤트 핸들러 ───

function _onPointerMove(e) {
  e.preventDefault();
  const pos = _getPos(e);
  _state.cursorX = pos.x;
  _state.cursorY = pos.y;

  if (!_state.isDrawing || !_state.isRunning) {
    stopShearSound();
    return;
  }

  // 이전 마우스 포인터 위치와의 변화율 계산
  let dx = 0;
  let dy = 0;
  if (_hasPrevPos) {
    dx = pos.x - _prevPos.x;
    dy = pos.y - _prevPos.y;
  }
  const speed = Math.hypot(dx, dy);

  _prevPos.x = pos.x;
  _prevPos.y = pos.y;
  _hasPrevPos = true;

  // 털이 깔려있는 유효한 영역인지 픽셀 확인
  const pixel = _state.ctxWool.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
  const hasWool = pixel[3] > 10; // 알파 채널이 존재하는 털 구역

  // 털 영역이면서 포인터가 실제로 일정 속도 이상 문질러 움직일 때만 슥슥 마찰음 및 파티클 작동
  if (hasWool && speed > 0.8) {
    startShearSound();
    _triggerHaptic();

    // 깎아내는 물리 파티클 스폰 (움직임 속도와 반대 방향 힘 반영)
    const angle = Math.atan2(dy, dx) + Math.PI; // 밀고 있는 진행 반대 방향
    const spawnCount = Math.floor(Math.random() * 2) + 2; // 프레임당 2~3개 방출

    for (let i = 0; i < spawnCount; i++) {
      const pAngle = angle + (Math.random() - 0.5) * 0.7; // 퍼짐 정도
      const pSpeed = 1.2 + Math.random() * Math.min(speed * 0.25, 4.0);
      const vx = Math.cos(pAngle) * pSpeed;
      const vy = Math.sin(pAngle) * pSpeed - (0.5 + Math.random() * 1.5); // 솜털 조각이 위로 튀다 떨어지도록

      // 브러시 반경 내의 랜덤 오프셋
      const r = Math.random() * _state.brushSize;
      const theta = Math.random() * Math.PI * 2;
      const px = pos.x + Math.cos(theta) * r;
      const py = pos.y + Math.sin(theta) * r;

      if (_state.preloadedAssets?.particleImg) {
        _particles.push(new ShornParticle(px, py, vx, vy, _state.preloadedAssets.particleImg));
      }
    }
  } else {
    // 털이 없는 곳을 지나거나 가만히 서있으면 마찰음 정지
    stopShearSound();
  }

  // 지우기 작업 실행
  _erase(pos.x, pos.y);

  if (_state.onUpdate) {
    _state.onUpdate(_getRemovalPercent(), _state.timerSec);
  }
}

function _onPointerDown(e) {
  e.preventDefault();
  if (!_state.isRunning) return;
  resumeAudio();
  
  // 터치/클릭하는 순간 바리깡 공회전음("위이잉") 개시
  startClipperHum();

  _state.isDrawing = true;
  const pos = _getPos(e);
  _state.cursorX = pos.x;
  _state.cursorY = pos.y;

  _prevPos.x = pos.x;
  _prevPos.y = pos.y;
  _hasPrevPos = true;

  _erase(pos.x, pos.y);
}

function _onPointerUp(e) {
  e.preventDefault();
  _state.isDrawing = false;
  _hasPrevPos = false;
  // 터치 오프 시 소리 일괄 중단
  stopClipperHum();
  stopShearSound();
}

function _onPointerLeave() {
  _state.isDrawing = false;
  _hasPrevPos = false;
  // 포인터 영역 이탈 시 소리 일괄 중단
  stopClipperHum();
  stopShearSound();
}

function _triggerHaptic() {
  const now = Date.now();
  if (now - _lastVibrateTime > 70) { // 70ms 햅틱 스로틀링
    if (navigator.vibrate) {
      navigator.vibrate(12);
    }
    _lastVibrateTime = now;
  }
}

const _handlers = {
  pointermove:  _onPointerMove,
  pointerdown:  _onPointerDown,
  pointerup:    _onPointerUp,
  pointerleave: _onPointerLeave,
  pointercancel:_onPointerUp,
};

function _addEvents(canvas) {
  canvas.style.touchAction = 'none';
  Object.entries(_handlers).forEach(([evt, fn]) => canvas.addEventListener(evt, fn, { passive: false }));
}

function _removeEvents(canvas) {
  if (!canvas) return;
  Object.entries(_handlers).forEach(([evt, fn]) => canvas.removeEventListener(evt, fn));
}

// ─── 지우기 (destination-out) ───

function _erase(x, y) {
  const ctx = _state.ctxWool;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, _state.brushSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ─── 위치 계산 ───
function _getPos(e) {
  const canvas = _state.canvasWool;
  const rect   = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;

  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;

  return {
    x: (clientX - rect.left)  * scaleX,
    y: (clientY - rect.top)   * scaleY,
  };
}

/** 현재 제거율 반환 (외부에서 조회용) */
export function getRemovalPercent() {
  return _getRemovalPercent();
}

