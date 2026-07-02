const sheep=document.getElementById("sheep");
const message=document.getElementById("message");
const statusText=document.getElementById("statusText");

const woolBar=document.getElementById("wool");

let sheepXP=Number(localStorage.getItem("sheepXP"))||0;

const SHEEP_MAX_XP=900;
const GROWTH_STEP=100;

const growthImages=[
"../assets/sheep/growth/growth_step_01_raw.png",
"../assets/sheep/growth/growth_step_02_raw.png",
"../assets/sheep/growth/growth_step_03_raw.png",
"../assets/sheep/growth/growth_step_04_raw.png",
"../assets/sheep/growth/growth_step_05_raw.png",
"../assets/sheep/growth/growth_step_06_raw.png",
"../assets/sheep/growth/growth_step_07_raw.png",
"../assets/sheep/growth/growth_step_08_raw.png",
"../assets/sheep/growth/growth_step_09_raw.png",
"../assets/sheep/growth/growth_step_10_raw.png"
];

const actionImages={
pet:"../assets/sheep/actions/pet1.png",
eat:"../assets/sheep/actions/eat.png",
sleep:"../assets/sheep/actions/sleep.png",
after:"../assets/sheep/shearing/after.png"
};

function saveXP(){

    localStorage.setItem("sheepXP",sheepXP);

}

function getGrowthStep(){

    let step=Math.floor(sheepXP/GROWTH_STEP);

    if(step<0) step=0;

    if(step>9) step=9;

    return step;

}

function updateWoolBar(){

    woolBar.style.width=((getGrowthStep()+1)*10)+"%";

}

function updateGrowth(){

    sheep.src=growthImages[getGrowthStep()];

    updateWoolBar();

}

function setMessage(text,status){

    message.textContent=text;

    statusText.textContent=status;

}

function restoreGrowth(delay){

    setTimeout(()=>{

        updateGrowth();

    },delay);

}

function addXP(value){

    sheepXP+=value;

    if(sheepXP>SHEEP_MAX_XP){

        sheepXP=SHEEP_MAX_XP;

    }

    if(sheepXP<0){

        sheepXP=0;

    }

    saveXP();

    updateGrowth();

}

updateGrowth();
function petSheep(){

    sheep.src=actionImages.pet;

    setMessage(
        "메에~",
        "행복해하고 있어요."
    );

    restoreGrowth(1000);

}

function feedSheep(){

    sheep.src=actionImages.eat;

    setMessage(
        "냠냠...",
        "배가 불러졌어요."
    );

    restoreGrowth(1200);

}

function sleepSheep(){

    sheep.src=actionImages.sleep;

    setMessage(
        "드르렁...",
        "잘 자는 중..."
    );

    sheepXP+=GROWTH_STEP;

    if(sheepXP>SHEEP_MAX_XP){

        sheepXP=SHEEP_MAX_XP;

    }

    saveXP();

    setTimeout(()=>{

        updateGrowth();

        setMessage(
            "푹 잤어요!",
            "양털이 자랐어요."
        );

        if(sheepXP===SHEEP_MAX_XP){

            localStorage.setItem(
                "sheepReady",
                "true"
            );

        }

    },1800);

}

function canShear(){

    return sheepXP>=SHEEP_MAX_XP;

}

function shearSheep(){

    if(!canShear()){

        alert(
            "양털이 아직 덜 자랐어요.\n\n현재 성장 : "
            +(getGrowthStep()+1)
            +"/10 단계"
        );

        return;

    }

    localStorage.setItem(
        "sheepReady",
        "true"
    );

    const ok=confirm(
        "양털이 가득 자랐어요!\n\n양털깎기 미니게임을 시작할까요?"
    );

    if(ok){

        location.href="shearing.html";

    }

}
if(localStorage.getItem("sheepSheared")==="true"){

    sheep.src=actionImages.after;

    woolBar.style.width="0%";

    setMessage(
        "시원해졌어요!",
        "양털을 모두 깎았어요."
    );

    sheepXP=0;

    saveXP();

    localStorage.removeItem("sheepSheared");
    localStorage.removeItem("sheepReady");

    setTimeout(()=>{

        updateGrowth();

        setMessage(
            "다시 양털을 길러볼까요?",
            "잠을 자면 양털이 자랍니다."
        );

    },1800);

}

function bounceSheep(){

    sheep.style.animation="bounce .5s";

    setTimeout(()=>{

        sheep.style.animation="float 3s ease-in-out infinite";

    },500);

}

sheep.addEventListener("click",()=>{

    bounceSheep();

    const sounds=[
        "메에~",
        "메에!",
        "메에에~"
    ];

    message.textContent=
        sounds[Math.floor(Math.random()*sounds.length)];

});
function refreshSheepState(){

    updateGrowth();

    if(canShear()){

        setMessage(
            "양털이 가득 자랐어요!",
            "양털깎기를 할 수 있어요."
        );

        localStorage.setItem(
            "sheepReady",
            "true"
        );

    }else{

        const remain=
            SHEEP_MAX_XP-sheepXP;

        const sleepLeft=
            Math.ceil(remain/GROWTH_STEP);

        statusText.textContent=
            "양털 성장까지 "+sleepLeft+"회 수면";

    }

}

window.addEventListener("focus",()=>{

    refreshSheepState();

});

document.addEventListener("visibilitychange",()=>{

    if(!document.hidden){

        refreshSheepState();

    }

});

window.addEventListener("storage",(e)=>{

    if(
        e.key==="sheepXP"||
        e.key==="sheepSheared"
    ){

        sheepXP=
            Number(localStorage.getItem("sheepXP"))||0;

        refreshSheepState();

    }

});

refreshSheepState();
window.petSheep=petSheep;
window.feedSheep=feedSheep;
window.sleepSheep=sleepSheep;
window.shearSheep=shearSheep;

window.getSheepXP=()=>sheepXP;

window.resetSheep=function(){

    sheepXP=0;

    saveXP();

    localStorage.removeItem("sheepReady");
    localStorage.removeItem("sheepSheared");

    updateGrowth();

    setMessage(
        "메에~",
        "다시 양털을 길러볼까요?"
    );

};

window.finishShearing=function(){

    sheepXP=0;

    saveXP();

    localStorage.setItem(
        "sheepSheared",
        "true"
    );

    localStorage.removeItem(
        "sheepReady"
    );

    location.href="index.html";

};

window.addEventListener("load",()=>{

    refreshSheepState();

});