// let gameSeq=[];
// let userSeq=[];
// let started = false;
// let level = 0;

// let btns = ["yellow" , "red" , "purple","green"];

// let h2 = document.querySelector("h2");
// document.addEventListener("keypress",function(){
//     if(started == false){
//         console.log("game is started");
//         started = true;

//         levelUp();
//     }
// });

// function gameFlash(btn){
//     btn.classList.add("flash");
//     setTimeout(function(){
//         btn.classList.remove("flash");
//     },250);
// }
// function userFlash(btn){
//     btn.classList.add("userflash");
//     setTimeout(function(){
//         btn.classList.remove("userflash");
//     },250);
// }
// function levelUp(){
//     userSeq=[];
//     level++;
//     h2.innerText=`Level ${level}`;
//     let randIdx = Math.floor(Math.random() * 3);
//     let randColor = btns[randIdx];
//     let randBtn = document.querySelector(`.${randColor}`);
//     // console.log(randIdx);
//     // console.log(randColor);
//     gameSeq.push(randColor);
//     console.log(gameSeq);
//     gameFlash(randBtn);
// }
// function checkAns(idx){
   
   
//     if(userSeq[idx] === gameSeq[idx]){
//         if(userSeq.length == gameSeq.length){
//             setTimeout(levelUp(),1000);
//         }
//     }else{
//         h2.innerHTML =`Game over! Your score was <b>${level}</b> <br>Press any key to start.`;
//         document.querySelector("body").style.backgroundColor = "red";
//        setTimeout(function(){
//          document.querySelector("body").style.backgroundColor = "white";
//        },150)
//         reset();
//     }
    
// }
// function btnPress(){
//     let btn = this;
//     userFlash(btn);
    
//     userColor = btn.getAttribute("id");
//     //console.log(userColor);
//     userSeq.push(userColor);
//     checkAns(userSeq.length - 1);
// }
// let allBtns = document.querySelectorAll(".btn");
// for(btn of allBtns){
//     btn.addEventListener("click",btnPress);
// }
// function reset() {
//     started = false;
//     gameSeq = [];
//     userSeq=[];
//     level = 0;
// }
// simon.js - WebAudio-based Simon game (drop in to replace existing simon.js)

// Game state
let gameSeq = [];
let userSeq = [];
let started = false;
let level = 0;
let highScore = localStorage.getItem("highScore") ? parseInt(localStorage.getItem("highScore"), 10) : 0;

// DOM
const statusH2 = document.querySelector("#status") || document.querySelector("h2");
const hsDisplay = document.querySelector("#highscore");
const body = document.querySelector("body");
const allBtns = Array.from(document.querySelectorAll(".btn"));

// show highscore on load
if (hsDisplay) hsDisplay.innerText = `High Score: ${highScore}`;

// ------------ WebAudio setup (no external files) ------------
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContextClass();

// small map of frequencies per color
const toneMap = {
  yellow: 523.25, // C5
  red:    392.00, // G4
  purple: 659.25, // E5
  green:  293.66, // D4
  wrong:  110.00  // low A for game over
};

// ensure audio context resumes on first user gesture (some browsers start suspended)
function ensureAudio() {
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(e => { /* ignore */ });
  }
}

// play a tone for `durationMs` milliseconds
function playTone(color, durationMs = 200) {
  ensureAudio();
  const freq = toneMap[color];
  if (!freq) return;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  // connect chain and schedule amplitude envelope
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  // gentle envelope
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
  osc.start(now);

  // ramp down and stop
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.stop(now + durationMs / 1000 + 0.02);

  // cleanup (optional — oscillator auto-stops)
  setTimeout(() => {
    try { osc.disconnect(); gain.disconnect(); } catch (e) {}
  }, durationMs + 100);
}

// ------------ UI flash functions ------------
function gameFlash(btn) {
  if (!btn) return;
  btn.classList.add("flash");
  const color = btn.getAttribute("id");
  playTone(color, 260);
  setTimeout(() => btn.classList.remove("flash"), 320);
}

function userFlash(btn) {
  if (!btn) return;
  btn.classList.add("userflash");
  const color = btn.getAttribute("id");
  playTone(color, 160);
  setTimeout(() => btn.classList.remove("userflash"), 200);
}

// ------------ Game control helpers ------------
function disableButtons() {
  allBtns.forEach(b => (b.style.pointerEvents = "none"));
}
function enableButtons() {
  allBtns.forEach(b => (b.style.pointerEvents = "auto"));
}

function updateStatus(text) {
  if (statusH2) statusH2.innerHTML = text;
}
function updateHighscoreDisplay() {
  if (hsDisplay) hsDisplay.innerText = `High Score: ${highScore}`;
}

// ------------ Sequence playback ------------
function playSequence() {
  // disable clicking while sequence plays
  disableButtons();

  let i = 0;
  const intervalMs = 600; // time between flashes
  const timer = setInterval(() => {
    const color = gameSeq[i];
    const btn = document.querySelector(`.${color}`);
    gameFlash(btn);
    i++;
    if (i >= gameSeq.length) {
      clearInterval(timer);
      // re-enable after a short pause so UI feels responsive
      setTimeout(() => enableButtons(), 200);
    }
  }, intervalMs);
}

// ------------ Level control ------------
function levelUp() {
  userSeq = [];
  level++;
  updateStatus(`Level ${level}`);
  // add a new random color
  const randIdx = Math.floor(Math.random() * 4);
  const colors = ["yellow", "red", "purple", "green"];
  const randColor = colors[randIdx];
  gameSeq.push(randColor);

  // replay entire sequence
  playSequence();
}

// ------------ Answer checking & game over ------------
function checkAns(idx) {
  if (userSeq[idx] === gameSeq[idx]) {
    // correct so far
    if (userSeq.length === gameSeq.length) {
      // completed level — next after short delay
      setTimeout(() => levelUp(), 700);
    }
  } else {
    // wrong -> game over
    gameOver();
  }
}

function gameOver() {
  const score = Math.max(0, level - 1);
  // update highscore
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  updateHighscoreDisplay();

  // status + sound + visual effect
  updateStatus(`💥 Game Over! Your score: <b>${score}</b><br>Press any key to restart`);
  playTone("wrong", 700);

  // add CSS class for shake/red flash (your CSS should define .game-over)
  body.classList.add("game-over");
  setTimeout(() => body.classList.remove("game-over"), 1000);

  // disable input until restart
  disableButtons();
  started = false;
  // keep game state intact until reset() runs on next start
}

// ------------ Button press handler ------------
function btnPress(e) {
  if (!started) return;
  // ensure audio context active
  ensureAudio();

  const btn = this;
  userFlash(btn);
  const userColor = btn.getAttribute("id");
  userSeq.push(userColor);
  checkAns(userSeq.length - 1);
}

// ------------ Reset/start ------------
function resetGame() {
  gameSeq = [];
  userSeq = [];
  level = 0;
  updateStatus("Press any key to start the game");
  enableButtons();
}

// Start on keypress
document.addEventListener("keypress", function () {
  if (!started) {
    // fresh start
    resetGame();
    started = true;
    levelUp();
  }
});

// attach listeners to tiles
allBtns.forEach(btn => btn.addEventListener("click", btnPress));

// initial UI
updateStatus("Press any key to start the game");
updateHighscoreDisplay();
enableButtons();
