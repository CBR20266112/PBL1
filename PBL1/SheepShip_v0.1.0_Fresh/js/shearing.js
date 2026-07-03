const canvas=document.getElementById("woolCanvas");
const ctx=canvas.getContext("2d",{willReadFrequently:true});

const bodySheep=document.getElementById("bodySheep");
const clipper=document.getElementById("clipper");

const timerText=document.getElementById("time");
const woolText=document.getElementById("woolCount");
const percentText=document.getElementById("percent");
const progressFill=document.getElementById("progressFill");
const finishButton=document.getElementById("finishButton");

const woolImage=new Image();

woolImage.src="../assets/sheep/shearing/wool.png";

const BRUSH_SIZE=10;
const GAME_TIME=60;

let drawing=false;
let finished=false;

let remainTime=GAME_TIME;
let timer=null;

let totalAlpha=0;

function resizeCanvas(){

    const rect=bodySheep.getBoundingClientRect();

    canvas.width=rect.width;
    canvas.height=rect.height;

    canvas.style.width=rect.width+"px";
    canvas.style.height=rect.height+"px";

}

function drawWool(){

    ctx.clearRect(

        0,
        0,
        canvas.width,
        canvas.height

    );

    ctx.drawImage(

        woolImage,

        0,
        0,

        canvas.width,
        canvas.height

    );

    totalAlpha=getAlpha();

}
function getAlpha(){

    const pixels=ctx.getImageData(

        0,
        0,
        canvas.width,
        canvas.height

    ).data;

    let alpha=0;

    for(

        let i=3;

        i<pixels.length;

        i+=4

    ){

        alpha+=pixels[i];

    }

    return alpha;

}

function updateProgress(){

    const currentAlpha=getAlpha();

    const removed=

        totalAlpha-currentAlpha;

    let percent=

        removed/

        totalAlpha*

        100;

    if(percent<0){

        percent=0;

    }

    if(percent>100){

        percent=100;

    }

    percent=Math.floor(percent);

    woolText.textContent=percent;

    percentText.textContent=percent;

    progressFill.style.width=

        percent+"%";

    if(

        percent>=95 &&

        !finished

    ){

        finishGame();

    }

}

function erase(x,y){

    ctx.save();

    ctx.globalCompositeOperation=

        "destination-out";

    ctx.beginPath();

    ctx.arc(

        x,

        y,

        BRUSH_SIZE,

        0,

        Math.PI*2

    );

    ctx.fill();

    ctx.restore();

    updateProgress();

}
function moveClipper(clientX,clientY){

    const rect=canvas.getBoundingClientRect();

    const x=clientX-rect.left;
    const y=clientY-rect.top;

    clipper.style.left=clientX+"px";
    clipper.style.top=clientY+"px";

    if(!drawing) return;
    if(finished) return;

    if(
        x<0||
        y<0||
        x>canvas.width||
        y>canvas.height
    ){
        return;
    }

    erase(x,y);

}

canvas.addEventListener("pointerdown",(e)=>{

    drawing=true;

    moveClipper(

        e.clientX,

        e.clientY

    );

});

canvas.addEventListener("pointermove",(e)=>{

    moveClipper(

        e.clientX,

        e.clientY

    );

});

window.addEventListener("pointerup",()=>{

    drawing=false;

});

window.addEventListener("pointercancel",()=>{

    drawing=false;

});

window.addEventListener("blur",()=>{

    drawing=false;

});

canvas.addEventListener("mouseleave",()=>{

    drawing=false;

});

canvas.addEventListener("contextmenu",(e)=>{

    e.preventDefault();

});

clipper.style.display="block";
function startTimer(){

    stopTimer();

    remainTime=GAME_TIME;

    timerText.textContent=remainTime;

    timer=setInterval(()=>{

        remainTime--;

        if(remainTime<0){

            remainTime=0;

        }

        timerText.textContent=remainTime;

        if(remainTime===0){

            stopTimer();

            drawing=false;

            alert("시간 종료!");

            location.href="../index.html";

        }

    },1000);

}

function stopTimer(){

    if(timer!==null){

        clearInterval(timer);

        timer=null;

    }

}

function finishGame(){

    if(finished){

        return;

    }

    finished=true;

    drawing=false;

    stopTimer();

    progressFill.style.width="100%";

    percentText.textContent="100";

    woolText.textContent="100";

    finishButton.disabled=false;

    finishButton.textContent="메인으로";

    localStorage.setItem(

        "sheepSheared",

        "true"

    );

    localStorage.setItem(

        "sheepXP",

        "0"

    );

    canvas.style.transition="opacity .35s";

    canvas.style.opacity="0";

}
finishButton.addEventListener("click",()=>{

    if(!finished){

        return;

    }

    location.href="../index.html";

});

function resetGame(){

    finished=false;

    drawing=false;

    finishButton.disabled=true;

    finishButton.textContent="완료";

    progressFill.style.width="0%";

    percentText.textContent="0";

    woolText.textContent="0";

    canvas.style.display="block";

    canvas.style.opacity="1";

    resizeCanvas();

    drawWool();

    updateProgress();

    startTimer();

}

woolImage.onload=function(){

    resetGame();

};

if(woolImage.complete){

    resetGame();

}

window.addEventListener("load",()=>{

    if(woolImage.complete){

        resetGame();

    }

});

window.addEventListener("resize",()=>{

    resizeCanvas();

    drawWool();

    updateProgress();

});

window.addEventListener("beforeunload",()=>{

    stopTimer();

});