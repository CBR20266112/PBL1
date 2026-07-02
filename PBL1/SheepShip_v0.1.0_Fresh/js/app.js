/*
========================================
 SheepShip App
========================================
*/

import { renderHome, refreshUI } from "./ui.js";

import {

    changeHappiness

} from "./state.js";

import {

    petMessages

} from "./data.js";

const App = {

    init(){

        console.log("SheepShip Start");

        renderHome();

        this.bindEvents();

    },



    bindEvents(){

        this.bindNavigation();

        this.bindSheep();

    },



    bindNavigation(){

        const buttons=document.querySelectorAll(

            ".bottom-nav button"

        );

        buttons.forEach((button,index)=>{

            button.addEventListener("click",()=>{

                console.log(

                    "Navigation :",

                    index

                );

            });

        });

    },



    bindSheep(){

        const sheep=document.getElementById(

            "sheep"

        );

        if(!sheep) return;

        sheep.addEventListener(

            "click",

            ()=>{

                console.log(

                    "Sheep Click"

                );

            }

        );

    }

};

export default App;