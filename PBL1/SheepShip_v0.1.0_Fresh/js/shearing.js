const canvas=document.getElementById("gameCanvas");
const ctx=canvas.getContext("2d");

canvas.width=900;
canvas.height=600;

const SHEEP_RADIUS=135;

const sheep={

    x:canvas.width/2,
    y:canvas.height/2,

    radius:SHEEP_RADIUS

};

const game={

    running:false,
    score:0,
    target:80,
    finished:false

};

const ui={

    score:document.getElementById("score"),
    remain:document.getElementById("remain"),
    start:document.getElementById("startButton"),
    result:document.getElementById("result")

};

const clipper={

    x:0,
    y:0,
    radius:34,
    active:false

};

const wools=[];

function resizeCanvas(){

    canvas.width=900;
    canvas.height=600;

    sheep.x=canvas.width/2;
    sheep.y=canvas.height/2;

}

window.addEventListener("resize",resizeCanvas);

resizeCanvas();

function updateUI(){

    ui.score.textContent=game.score;

    ui.remain.textContent=
    Math.max(0,game.target-game.score);

}

updateUI();
function startGame(){

    if(game.running) return;

    game.running=true;
    game.finished=false;
    game.score=0;

    wools.length=0;

    generateWool();

    if(typeof startTimer==="function"){

        startTimer();

    }

    ui.result.textContent="";
    updateUI();

}

function finishGame(){

    if(game.finished) return;

    game.running=false;
    game.finished=true;

    localStorage.setItem(
        "sheepSheared",
        "true"
    );

    ui.result.textContent=
    "양털깎기 완료!";

    setTimeout(()=>{

        location.href="index.html";

    },1500);

}

function failGame(){

    game.running=false;

    ui.result.textContent=
    "시간 종료!";

}

canvas.addEventListener("mousemove",(e)=>{

    const rect=canvas.getBoundingClientRect();

    clipper.x=e.clientX-rect.left;
    clipper.y=e.clientY-rect.top;

});

canvas.addEventListener("mousedown",()=>{

    clipper.active=true;

});

canvas.addEventListener("mouseup",()=>{

    clipper.active=false;

});

ui.start.addEventListener("click",startGame);
function generateWool(){

    for(let i=0;i<game.target;i++){

        const angle=Math.random()*Math.PI*2;

        const distance=
        Math.random()*(sheep.radius-20);

        wools.push({

            x:sheep.x+Math.cos(angle)*distance,

            y:sheep.y+Math.sin(angle)*distance,

            r:10+Math.random()*8,

            removed:false

        });

    }

}

function clipWool(){

    if(!clipper.active) return;

    for(const wool of wools){

        if(wool.removed) continue;

        const dx=clipper.x-wool.x;
        const dy=clipper.y-wool.y;

        if(Math.hypot(dx,dy)<clipper.radius+wool.r){

            wool.removed=true;

            game.score++;

            updateUI();

            if(typeof spawnParticles==="function"){

                spawnParticles(
                    wool.x,
                    wool.y
                );

            }

            if(typeof addWoolScore==="function"){

                addWoolScore(1);

            }

            if(game.score>=game.target){

                finishGame();

            }

        }

    }

}

function drawSheep(){

    ctx.beginPath();

    ctx.arc(
        sheep.x,
        sheep.y,
        sheep.radius,
        0,
        Math.PI*2
    );

    ctx.fillStyle="#f8f8f8";
    ctx.fill();

    ctx.strokeStyle="#d7d7d7";
    ctx.lineWidth=4;
    ctx.stroke();

}
function drawWool(){

    for(const wool of wools){

        if(wool.removed) continue;

        ctx.beginPath();

        ctx.arc(
            wool.x,
            wool.y,
            wool.r,
            0,
            Math.PI*2
        );

        ctx.fillStyle="#ffffff";
        ctx.fill();

        ctx.strokeStyle="#dddddd";
        ctx.lineWidth=2;
        ctx.stroke();

    }

}

function drawClipper(){

    ctx.beginPath();

    ctx.arc(
        clipper.x,
        clipper.y,
        clipper.radius,
        0,
        Math.PI*2
    );

    ctx.fillStyle=
    clipper.active?
    "#5b8cff":
    "#9dbbff";

    ctx.fill();

    ctx.strokeStyle="#355ec9";
    ctx.lineWidth=3;
    ctx.stroke();

}

function gameLoop(){

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    drawSheep();

    drawWool();

    clipWool();

    if(typeof updateParticles==="function"){

        updateParticles(ctx);

    }

    drawClipper();

    requestAnimationFrame(gameLoop);

}

gameLoop();
function resetGame(){

    game.running=false;
    game.finished=false;
    game.score=0;

    wools.length=0;

    updateUI();

    ui.result.textContent="";

}

function onTimerEnd(){

    if(game.finished) return;

    failGame();

}

window.startShearingGame=startGame;
window.finishShearingGame=finishGame;
window.resetShearingGame=resetGame;
window.onTimerEnd=onTimerEnd;

window.addEventListener("load",()=>{

    resetGame();

    if(typeof initTimer==="function"){

        initTimer(60,onTimerEnd);

    }

});