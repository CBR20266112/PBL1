const sheep = document.getElementById("sheep");
const message = document.getElementById("message");
const statusText = document.getElementById("statusText");

function setImage(file){
    sheep.src = `../assets/sheep/${file}`;
}

function randomMessage(list){
    message.textContent = list[Math.floor(Math.random()*list.length)];
}

function petSheep(){

    const pets = [
        "pet1.png",
        "pet2.png",
        "pet3.png"
    ];

    setImage(
        pets[Math.floor(Math.random()*pets.length)]
    );

    randomMessage([
        "메에~",
        "기분 좋아!",
        "또 쓰다듬어 줘!",
        "행복해!"
    ]);

    statusText.textContent =
        "드리미가 행복해하고 있어요.";

    setTimeout(()=>{
        setImage("happy.png");
    },1200);

}

function feedSheep(){

    setImage("eat.png");

    message.textContent =
        "냠냠...";

    statusText.textContent =
        "배가 불러졌어요.";

    setTimeout(()=>{

        setImage("happy.png");

        message.textContent =
            "맛있었어!";

    },1800);

}

function sleepSheep(){

    setImage("sleep.png");

    message.textContent =
        "드르렁...";

    statusText.textContent =
        "드리미가 잠들었어요.";

}

function shearSheep(){

    setImage("shear.png");

    message.textContent =
        "조심조심...";

    statusText.textContent =
        "양털을 깎는 중이에요.";

    setTimeout(()=>{

        setImage("shear_after.png");

        message.textContent =
            "시원해졌어요!";

        statusText.textContent =
            "양털깎기 완료!";

    },1800);

}
sheep.addEventListener("click",()=>{

    sheep.style.animation="bounce .5s";

    setTimeout(()=>{

        sheep.style.animation="float 3s ease-in-out infinite";

    },500);

});