const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

const afterSheep = document.getElementById("afterSheep");
const fullSheep = document.getElementById("fullSheep");
const clipper = document.getElementById("clipper");

const timerText = document.getElementById("time");
const woolText = document.getElementById("woolCount");
const percentText = document.getElementById("percent");
const progressFill = document.getElementById("progressFill");
const finishButton = document.getElementById("finishButton");

const woolImage = new Image();
woolImage.src = "../assets/sheep/shearing/wool.png";
const fullImage = new Image();
fullImage.src = "../assets/sheep/shearing/full.png";
const shavedImage = new Image();
shavedImage.src = "../assets/sheep/shearing/shaved.png";

const BRUSH_SIZE = 9; // reduced brush size
const GAME_TIME = 60;

let drawing = false;
let finished = false;
let listenersAttached = false;

let remainTime = GAME_TIME;
let timer = null;

// alpha bookkeeping to preserve progress across resize
let totalAlpha = 0; // sum of alpha values when full wool is drawn
let removedAlpha = 0; // cumulative removed alpha via erases

function deviceScale() {
    return window.devicePixelRatio || 1;
}

// debug overlay element (temporary)
function ensureDebug() {
    let d = document.getElementById('debugInfo');
    if (!d) {
        d = document.createElement('div');
        d.id = 'debugInfo';
        d.style.position = 'fixed';
        d.style.right = '10px';
        d.style.top = '10px';
        d.style.background = 'rgba(0,0,0,0.6)';
        d.style.color = '#fff';
        d.style.padding = '6px 8px';
        d.style.fontSize = '12px';
        d.style.zIndex = 9999;
        document.body.appendChild(d);
    }
    return d;
}

function getSizeForElement(el) {
    const rect = el.getBoundingClientRect();
    return { w: Math.max(1, Math.floor(rect.width)), h: Math.max(1, Math.floor(rect.height)), left: rect.left, top: rect.top };
}

function computeAlphaSumFromCtx(cctx, w, h) {
    const data = cctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) sum += data[i];
    return sum;
}

function setupCanvasSize(preserveContent = true) {
    // preserve current canvas content by drawing to temp canvas and scaling
    const size = getSizeForElement(afterSheep);
    const dpr = deviceScale();
    const newW = Math.floor(size.w * dpr);
    const newH = Math.floor(size.h * dpr);

    if (canvas.width === newW && canvas.height === newH) return;

    const temp = document.createElement('canvas');
    temp.width = newW;
    temp.height = newH;
    const tctx = temp.getContext('2d');

    if (preserveContent && canvas.width && canvas.height) {
        // draw existing canvas scaled onto temp
        tctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, newW, newH);
    } else {
        // no preserve: build wool-only image by subtracting shaved from full
        tctx.clearRect(0, 0, newW, newH);
        if (fullImage.complete && shavedImage.complete) {
            tctx.drawImage(fullImage, 0, 0, newW, newH);
            tctx.globalCompositeOperation = 'destination-out';
            tctx.drawImage(shavedImage, 0, 0, newW, newH);
            tctx.globalCompositeOperation = 'source-over';
        } else if (woolImage.complete) {
            // fallback: draw woolImage if full/shaved pair isn't available
            tctx.drawImage(woolImage, 0, 0, newW, newH);
        }
    }

    // set physical size
    canvas.width = newW;
    canvas.height = newH;
    canvas.style.width = size.w + 'px';
    canvas.style.height = size.h + 'px';

    // copy temp back to canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(temp, 0, 0);

    // recompute totalAlpha based on wool-only composition
    const off = document.createElement('canvas');
    off.width = newW;
    off.height = newH;
    const offCtx = off.getContext('2d');
    offCtx.clearRect(0, 0, newW, newH);
    if (fullImage.complete && shavedImage.complete) {
        offCtx.drawImage(fullImage, 0, 0, newW, newH);
        offCtx.globalCompositeOperation = 'destination-out';
        offCtx.drawImage(shavedImage, 0, 0, newW, newH);
        offCtx.globalCompositeOperation = 'source-over';
    } else if (woolImage.complete) {
        offCtx.drawImage(woolImage, 0, 0, newW, newH);
    }
    const newTotal = computeAlphaSumFromCtx(offCtx, newW, newH);

    if (totalAlpha === 0) {
        // first time setup
        totalAlpha = newTotal;
        // removedAlpha already 0
    } else {
        if (totalAlpha > 0 && newTotal > 0) {
            // scale removedAlpha proportionally so percent remains
            removedAlpha = removedAlpha * (newTotal / totalAlpha);
        }
        totalAlpha = newTotal;
    }
}

function drawInitialWoolIfEmpty() {
    // if canvas is empty (all transparent), draw wool image as base
    if (!woolImage.complete) return;
    if (!canvas.width || !canvas.height) return;
    const sum = computeAlphaSumFromCtx(ctx, canvas.width, canvas.height);
    if (sum === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(woolImage, 0, 0, canvas.width, canvas.height);
    }
}

function updateProgressUI() {
    const percent = totalAlpha > 0 ? Math.floor((removedAlpha / totalAlpha) * 100) : 0;
    const clamped = Math.max(0, Math.min(100, percent));
    woolText.textContent = clamped;
    percentText.textContent = clamped;
    progressFill.style.width = clamped + '%';
    if (clamped >= 95 && !finished) finishGame();
}

function eraseAt(x, y) {
    if (finished) return;
    const dpr = deviceScale();
    const px = Math.floor((x - canvas.getBoundingClientRect().left) * dpr);
    const py = Math.floor((y - canvas.getBoundingClientRect().top) * dpr);

    const radius = Math.ceil(BRUSH_SIZE * dpr);
    const sx = Math.max(0, px - radius - 1);
    const sy = Math.max(0, py - radius - 1);
    const sw = Math.min(canvas.width - sx, radius * 2 + 2);
    const sh = Math.min(canvas.height - sy, radius * 2 + 2);

    if (sw <= 0 || sh <= 0) return;

    // sample alpha in region before erase
    const imgBefore = ctx.getImageData(sx, sy, sw, sh);
    let alphaBefore = 0;
    const dataBefore = imgBefore.data;
    for (let i = 3; i < dataBefore.length; i += 4) alphaBefore += dataBefore[i];

    // erase circle
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // sample alpha after erase in same region and add only the difference
    const imgAfter = ctx.getImageData(sx, sy, sw, sh);
    let alphaAfter = 0;
    const dataAfter = imgAfter.data;
    for (let i = 3; i < dataAfter.length; i += 4) alphaAfter += dataAfter[i];

    const delta = Math.max(0, alphaBefore - alphaAfter);

    // debug output
    try {
        const dbg = ensureDebug();
        const percent = totalAlpha>0?Math.floor(((removedAlpha+delta)/totalAlpha)*100):0;
        dbg.textContent = `px:${px} py:${py} sx:${sx} sy:${sy} sw:${sw} sh:${sh} before:${alphaBefore} after:${alphaAfter} delta:${delta} removed:${removedAlpha} total:${totalAlpha} pct:${percent}`;
    } catch(e){ }
    removedAlpha += delta;
    if (removedAlpha > totalAlpha) removedAlpha = totalAlpha;

    updateProgressUI();
}

function moveClipper(clientX, clientY) {
    // position clipper relative to the gameArea (parent of canvas)
    const parentRect = canvas.parentElement.getBoundingClientRect();
    const localX = clientX - parentRect.left;
    const localY = clientY - parentRect.top;
    clipper.style.left = localX + 'px';
    clipper.style.top = localY + 'px';
}

function attachListeners() {
    if (listenersAttached) return;
    listenersAttached = true;

    // pointer handling
    window.addEventListener('pointermove', (e) => {
        moveClipper(e.clientX, e.clientY);
        if (!drawing) return;
        eraseAt(e.clientX, e.clientY);
    });

    window.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        // hide initial full overlay on first interaction so canvas+wool is visible
        if (fullSheep && fullSheep.style.display !== 'none') fullSheep.style.display = 'none';
        drawing = true;
        eraseAt(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', () => { drawing = false; });
    window.addEventListener('pointercancel', () => { drawing = false; });
    window.addEventListener('blur', () => { drawing = false; });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // resize handling
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            // preserve content and adjust bookkeeping
            const oldTotal = totalAlpha;
            setupCanvasSize(true);
            updateProgressUI();
        }, 120);
    });

    window.addEventListener('beforeunload', stopTimer);
}

function startTimer() {
    stopTimer();
    remainTime = GAME_TIME;
    timerText.textContent = remainTime;
    timer = setInterval(() => {
        remainTime--;
        if (remainTime < 0) remainTime = 0;
        timerText.textContent = remainTime;
        if (remainTime === 0) {
            stopTimer();
            drawing = false;
            alert('시간 종료!');
            location.href = '../index.html';
        }
    }, 1000);
}

function stopTimer() { if (timer !== null) { clearInterval(timer); timer = null; } }

function finishGame() {
    if (finished) return;
    finished = true;
    drawing = false;
    stopTimer();
    progressFill.style.width = '100%';
    percentText.textContent = '100';
    woolText.textContent = '100';
    finishButton.disabled = false;
    finishButton.textContent = '메인으로';
    localStorage.setItem('sheepSheared', 'true');
    localStorage.setItem('sheepXP', '0');
    canvas.style.transition = 'opacity .35s';
    canvas.style.opacity = '0';
}

finishButton.addEventListener('click', () => {
    if (!finished) return;
    location.href = '../index.html';
});

function resetUIForStart() {
    // hide other UI so only shaved image, canvas, clipper are visible
    const top = document.querySelector('.topBar');
    const bottom = document.querySelector('.bottomBar');
    if (top) top.style.display = 'none';
    if (bottom) bottom.style.display = 'none';
}

function resetGame() {
    finished = false;
    drawing = false;
    finishButton.disabled = true;
    finishButton.textContent = '완료';
    progressFill.style.width = '0%';
    percentText.textContent = '0';
    woolText.textContent = '0';
    canvas.style.display = 'block';
    canvas.style.opacity = '1';

    resetUIForStart();

    setupCanvasSize(false);
    // draw wool image (wool.png) onto canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ensure displayed image sizes match canvas display size to avoid alignment shifts
    try {
        const dispW = canvas.style.width || (canvas.width / deviceScale()) + 'px';
        const dispH = canvas.style.height || (canvas.height / deviceScale()) + 'px';
        if (afterSheep) { afterSheep.style.width = dispW; afterSheep.style.height = dispH; }
        if (fullSheep) { fullSheep.style.width = dispW; fullSheep.style.height = dispH; }
    } catch (e) { }
    if (woolImage.complete) {
        ctx.drawImage(woolImage, 0, 0, canvas.width, canvas.height);
        const off = document.createElement('canvas');
        off.width = canvas.width;
        off.height = canvas.height;
        const offCtx = off.getContext('2d');
        offCtx.drawImage(woolImage, 0, 0, off.width, off.height);
        totalAlpha = computeAlphaSumFromCtx(offCtx, off.width, off.height);
    }
    removedAlpha = 0;

    // show full overlay at start
    if (fullSheep) fullSheep.style.display = 'block';

    updateProgressUI();
    startTimer();
}

function init() {
    attachListeners();
    clipper.style.display = 'block';
    clipper.style.position = 'absolute';
    clipper.style.pointerEvents = 'none';

    // Prefer waiting for fullImage (used to compose wool-only). Fallback to woolImage.
    if (fullImage.complete) resetGame();
    else if (woolImage.complete) resetGame();
    else {
        const cb = () => { resetGame(); fullImage.removeEventListener('load', cb); woolImage.removeEventListener('load', cb); shavedImage.removeEventListener('load', cb); };
        fullImage.addEventListener('load', cb);
        woolImage.addEventListener('load', cb);
        shavedImage.addEventListener('load', cb);
    }
}

document.addEventListener('DOMContentLoaded', init);