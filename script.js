const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const coffeeSteamVideo = document.getElementById('coffeeSteamVideo'); // 김 효과 비디오 요소

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const sentences = [
  "When will you arrive at the station?",
  "I can’t believe how fast time goes by.",
  "What are you doing right now?",
  "Could you help me carry these groceries inside?",
  "I have been waiting for you since morning.",
  "She is reading a book.",
  "They have been working all day.",
  "Let’s grab a coffee and talk for a while.",
  "Do you have any plans for this evening?",
  "It’s been a long day at the office.",
  "I’m looking forward to our trip next month.",
  "Can you recommend a good place to eat?"
];
const translations = [
  "너는 언제 역에 도착하니?",
  "시간이 얼마나 빠르게 지나가는지 믿을 수 없어.",
  "너 지금 뭐하고 있니?",
  "이 식료품들을 안으로 옮기는 것 좀 도와줄 수 있니?",
  "나는 아침부터 너를 기다리고 있었어.",
  "그녀는 책을 읽고 있어.",
  "그들은 하루 종일 일하고 있어.",
  "커피 한 잔 하면서 잠시 이야기하자.",
  "오늘 저녁에 계획 있는 거 있어?",
  "오늘은 사무실에서 긴 하루였어.",
  "다음 달 우리 여행이 기대돼.",
  "맛있는 식당 좀 추천해줄 수 있어?"
];

let sentenceIndex = Number(localStorage.getItem('sentenceIndex') || 0);

const playerImg = new Image();
playerImg.src = 'images/player.png';

const enemyImgs = [
  'images/enemy1.png',
  'images/enemy2.png',
  'images/enemy3.png',
  'images/enemy4.png',
  'images/enemy5.png'
].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const bgmFiles = [
  'sounds/background.mp3',
  'sounds/background1.mp3',
  'sounds/background2.mp3',
  'sounds/background3.mp3'
];
let bgmIndex = 0;
let bgmAudio = new Audio(bgmFiles[bgmIndex]);
bgmAudio.volume = 0.05;
bgmAudio.loop = false;

const volumeBtn = document.getElementById('volumeBtn');
let isMuted = false;
function updateVolumeIcon() {
  volumeBtn.textContent = isMuted ? "🔇" : "🔊";
}
volumeBtn.onclick = function () {
  isMuted = !isMuted;
  bgmAudio.volume = isMuted ? 0 : 0.05;
  updateVolumeIcon();
};
updateVolumeIcon();

function playNextBgm() {
  bgmAudio.removeEventListener('ended', playNextBgm);
  bgmIndex = (bgmIndex + 1) % bgmFiles.length;
  bgmAudio = new Audio(bgmFiles[bgmIndex]);
  bgmAudio.volume = isMuted ? 0 : 0.05;
  bgmAudio.loop = false;
  bgmAudio.addEventListener('ended', playNextBgm);
  bgmAudio.play();
}
bgmAudio.addEventListener('ended', playNextBgm);

const sounds = {
  shoot: new Audio('sounds/shoot.mp3'),
  explosion: new Audio('sounds/explosion.mp3')
};
sounds.shoot.volume = 0.05;
sounds.explosion.volume = 0.05;

setInterval(() => {
  if (bgmAudio && bgmAudio.volume !== (isMuted ? 0 : 0.05)) {
    bgmAudio.volume = isMuted ? 0 : 0.05;
  }
}, 1000);


// Asset 로딩 관리
let allAssetsReady = false;
let assetsToLoad = 1 + enemyImgs.length; // player 이미지 1개 + enemy 이미지들
let loadedAssetCount = 0;
let coffeeVideoAssetReady = false;

function assetLoaded() {
  loadedAssetCount++;
  console.log(`Image asset loaded. ${loadedAssetCount}/${assetsToLoad} images loaded.`);
  checkAllAssetsReady();
}

function coffeeVideoReady() {
  if (!coffeeVideoAssetReady) {
    coffeeVideoAssetReady = true;
    console.log("Coffee steam video is ready (oncanplaythrough).");
    checkAllAssetsReady();
  }
}

function coffeeVideoError() {
  if (!coffeeVideoAssetReady) {
    console.error("Coffee steam video could not be loaded. Steam effect will be disabled.");
    coffeeVideoAssetReady = true; // 에러 발생 시에도 준비된 것으로 간주 (김 효과 없이 게임 진행)
    checkAllAssetsReady();
  }
}

function checkAllAssetsReady() {
  if (loadedAssetCount >= assetsToLoad && coffeeVideoAssetReady) {
    allAssetsReady = true;
    console.log("All game assets (images and video) are ready.");
  }
}

playerImg.onload = assetLoaded;
playerImg.onerror = () => { console.error("Failed to load player image."); assetLoaded(); };

enemyImgs.forEach(img => {
  img.onload = assetLoaded;
  img.onerror = () => { console.error(`Failed to load enemy image: ${img.src}`); assetLoaded(); };
});

if (coffeeSteamVideo) {
  console.log("coffeeSteamVideo element found. Setting up event listeners.");
  coffeeSteamVideo.oncanplaythrough = coffeeVideoReady;
  coffeeSteamVideo.onerror = coffeeVideoError;

  if (coffeeSteamVideo.readyState >= HTMLVideoElement.HAVE_ENOUGH_DATA) {
    console.log("Coffee steam video was already in readyState >= HAVE_ENOUGH_DATA.");
    coffeeVideoReady();
  } else if (coffeeSteamVideo.error) {
    console.error("Coffee steam video had an error state on initial check.");
    coffeeVideoError();
  }
  coffeeSteamVideo.onloadeddata = () => console.log("Coffee steam video: loadeddata event fired.");
  coffeeSteamVideo.onwaiting = () => console.log("Coffee steam video: waiting for data...");
  coffeeSteamVideo.onplaying = () => console.log("Coffee steam video: playing event fired.");


} else {
  console.warn("coffeeSteamVideo element not found in HTML. Assuming ready without steam effect.");
  coffeeVideoAssetReady = true;
  checkAllAssetsReady();
}


const PLAYER_SIZE = 50;
const ENEMY_SIZE = 40;
let player = { x: 0, y: 0, w: PLAYER_SIZE, h: PLAYER_SIZE };
let bullets = [];
let enemies = [];
let enemyBullets = [];
let isGameRunning = false;
let isGamePaused = false;
let lastTime = 0;

const burstColors = [
  '#FF5252', '#FF9800', '#FFD600', '#4CAF50', '#2196F3',
  '#9C27B0', '#E040FB', '#00BCD4', '#FFEB3B', '#FF69B4'
];

let fireworks = null;
let fireworksState = null;
let centerSentence = null;
let centerSentenceIndex = null;
let centerAlpha = 1.0;
let nextSentence = null;
let sentenceActive = false;

let showPlayButton = false;
let playButtonRect = null;
let showTranslation = false;
let isActionLocked = false;

const MODAL_AUX = [
  "can","can't","cannot","could","couldn't","will","would","shall","should",
  "may","might","must","won't","wouldn't","shan't","shouldn't","mayn't","mightn't","mustn't"
];
const DO_AUX = [
  "do", "does", "did", "don't", "doesn't", "didn't"
];
const notVerbIng = [
  "morning", "evening", "everything", "anything", "nothing", "something",
  "building", "ceiling", "meeting", "feeling", "wedding", "clothing"
];

function isAux(word) {
  return MODAL_AUX.includes(word.toLowerCase()) || DO_AUX.includes(word.toLowerCase());
}
function isWh(word) {
  const whs = ["what","when","where","who","whom","whose","which","why","how"];
  return whs.includes(word.toLowerCase());
}
function isVerb(word) {
  const verbs = [
    "arrive", "believe", "help", "carry", "enjoy", "spend", "grab", "talk", "order", "look", "recommend", "eat",
    "plan", "make", "like", "love", "hate", "go", "read", "play", "work", "find", "get", "enjoyed", "forward", "wait"
  ];
  return verbs.includes(word.toLowerCase());
}
function isVing(word) {
  let lw = word.toLowerCase();
  if (notVerbIng.includes(lw)) return false;
  if (/^[a-zA-Z]+ing$/.test(lw)) {
    let base = lw.slice(0, -3);
    return isVerb(base) || (base.endsWith('y') && isVerb(base.slice(0, -1) + 'ie'));
  }
  return false;
}
function isBeen(word) {
  return word.toLowerCase() === 'been';
}
function isQuestion(sentence) {
  return sentence.trim().endsWith('?');
}

function drawCenterSentence() {
  if (!centerSentence) return;

  ctx.save();
  ctx.globalAlpha = centerAlpha;
  ctx.font = "23.52px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let lines = [centerSentence.line1, centerSentence.line2];

  let lineHeight = 30;
  let blockHeight = lines.length * lineHeight;
  let yBase = canvas.height / 2 - blockHeight / 2 + lineHeight / 2;

  const playSize = 36 * 0.49;
  const btnPad = 18 * 0.49;
  const btnH = playSize + btnPad * 2;
  const btnW = playSize + btnPad * 2;
  const btnY = canvas.height / 2 - 15 - 20 + 10 + 5;
  const btnX = 10;
  playButtonRect = { x: btnX, y: btnY, w: btnW, h: btnH };

  if (showPlayButton) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 20 * 0.49);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 3 * 0.49;
    ctx.stroke();
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.moveTo(btnX + btnPad + 6 * 0.49, btnY + btnPad);
    ctx.lineTo(btnX + btnPad + 6 * 0.49, btnY + btnH - btnPad);
    ctx.lineTo(btnX + btnPad + playSize, btnY + btnH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  let verbColored = false;
  const isQ = isQuestion((centerSentence.line1 + " " + centerSentence.line2).trim());
  for (let i = 0; i < lines.length; i++) {
    const words = lines[i].split(" ");
    let wordWidths = words.map(w => ctx.measureText(w).width);
    let spaceWidth = ctx.measureText(" ").width;
    let totalWidth = wordWidths.reduce((a, b) => a + b, 0) + spaceWidth * (words.length - 1);
    let x = (canvas.width - totalWidth) / 2;
    let y = yBase + i * lineHeight;

    for (let j = 0; j < words.length; j++) {
      let raw = words[j];
      let word = raw.replace(/[^a-zA-Z']/g, "");
      let lower = word.toLowerCase();
      let color = "#fff";
      if (isQ && i === 0 && j === 0 && (isAux(lower) || isWh(lower))) {
        color = "#40b8ff";
      } else if (isVerb(lower) && !verbColored) {
        color = "#FFD600";
        verbColored = true;
      } else if (isAux(lower) || isBeen(lower)) {
        color = "#40b8ff";
      } else if (isVing(lower)) {
        color = "#40b8ff";
      }
      ctx.fillStyle = color;
      ctx.fillText(raw, x, y);
      x += wordWidths[j] + spaceWidth;
    }
  }

  if (showTranslation) {
    ctx.save();
    ctx.font = "18.9px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFD600";
    ctx.shadowColor = "#111";
    ctx.shadowBlur = 4;
    ctx.fillText(
      translations[centerSentenceIndex !== null ? centerSentenceIndex : (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1)],
      canvas.width / 2,
      yBase + lines.length * lineHeight + 10
    );
    ctx.restore();
  }
  ctx.restore();
}

function drawFireworks() {
  if (!fireworks) return;
  ctx.save();
  ctx.font = "23.52px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  fireworks.forEach(fw => {
    ctx.globalAlpha = 1;
    ctx.fillStyle = fw.color;
    ctx.fillText(fw.text, fw.x, fw.y);
  });
  ctx.restore();
}
function splitSentence(sentence) {
  const words = sentence.split(" ");
  const half = Math.ceil(words.length / 2);
  const line1 = words.slice(0, half).join(" ");
  const line2 = words.slice(half).join(" ");
  return [line1, line2];
}
function getClockwiseAngle(index, total) {
  return -Math.PI / 2 + (index * 2 * Math.PI) / total;
}
function startFireworks(sentence, fx, fy) {
  const [line1, line2] = splitSentence(sentence);
  const lines = [line1, line2];
  let partsArr = [];
  let totalLines = lines.filter(line => line.trim().length > 0).length;
  lines.forEach((line, i) => {
    if (!line.trim()) return;
    const parts = line.split(" ");
    partsArr = partsArr.concat(parts.map(word => ({ word, row: i })));
  });

  const baseRadius = 51.2 * 0.88;
  const maxRadius = 120.96 * 0.88;

  let centerX = fx;
  const margin = 8;
  if (centerX - maxRadius < margin) centerX = margin + maxRadius;
  if (centerX + maxRadius > canvas.width - margin) centerX = canvas.width - margin - maxRadius;

  fireworks = [];
  fireworksState = {
    t: 0,
    phase: "explode",
    holdDuration: 60,
    explodeDuration: 180,
    gatherDuration: 45,
    originX: centerX,
    originY: fy
  };

  const N = partsArr.length;
  for (let j = 0; j < N; j++) {
    const angle = getClockwiseAngle(j, N);
    const color = burstColors[j % burstColors.length];
    fireworks.push({
      text: partsArr[j].word,
      angle: angle,
      row: partsArr[j].row,
      x: centerX,
      y: fy,
      radius: baseRadius,
      maxRadius: maxRadius,
      color: color,
      arrived: false,
      targetX: canvas.width / 2,
      targetY: canvas.height / 2 + (partsArr[j].row - (totalLines - 1) / 2) * 40
    });
  }
  sentenceActive = true;
  centerAlpha = 1.0;
  showTranslation = false;
}
function updateFireworks() {
  if (!fireworks) return false;

  fireworksState.t++;

  if (fireworksState.phase === "explode") {
    const progress = Math.min(fireworksState.t / fireworksState.explodeDuration, 1);
    const ease = 1 - Math.pow(1 - progress, 2);
    const baseRadius = 51.2 * 0.88;
    const maxRadius = 120.96 * 0.88;
    const radius = baseRadius + (maxRadius - baseRadius) * ease;

    fireworks.forEach((fw) => {
      fw.radius = radius;
      fw.x = fireworksState.originX + Math.cos(fw.angle) * radius;
      fw.y = fireworksState.originY + Math.sin(fw.angle) * radius;
    });

    if (progress >= 1) {
      fireworksState.phase = "hold";
      fireworksState.t = 0;
    }
  } else if (fireworksState.phase === "hold") {
    if (fireworksState.t >= fireworksState.holdDuration) {
      fireworksState.phase = "gather";
      fireworksState.t = 0;
      centerAlpha = 0;
    }
  } else if (fireworksState.phase === "gather") {
    const progress = Math.min(fireworksState.t / fireworksState.gatherDuration, 1);
    const ease = Math.pow(progress, 2);
    fireworks.forEach((fw) => {
      fw.x += (fw.targetX - fw.x) * ease * 0.2;
      fw.y += (fw.targetY - fw.y) * ease * 0.2;
    });

    if (progress >= 1) {
      fireworksState.phase = "done";
      const [line1, line2] = splitSentence(nextSentence);
      centerSentence = { line1, line2 };
      centerSentenceIndex = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
      centerAlpha = 1.0;
      fireworks = null;
      fireworksState = null;
      sentenceActive = false;
      showPlayButton = true;
      showTranslation = false;

      setTimeout(() => {
        let idx = centerSentenceIndex;
        if (idx == null) idx = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
        window.speechSynthesis.cancel();
        speakSentence(sentences[idx], 'female').then(() => {
          setTimeout(() => {
            speakSentence(sentences[idx], 'male');
          }, 800);
        });
      }, 800);
    }
  }
}
async function getVoice(lang = 'en-US', gender = 'female') {
  let voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    await new Promise(resolve => {
      window.speechSynthesis.onvoiceschanged = resolve;
    });
    voices = window.speechSynthesis.getVoices();
  }
  const filtered = voices.filter(v =>
    v.lang === lang &&
    (gender === 'female'
      ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('susan') || v.name.toLowerCase().includes('samantha')
      : v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.toLowerCase().includes('tom') || v.name.toLowerCase().includes('daniel'))
  );
  if (filtered.length) return filtered[0];
  const fallback = voices.filter(v => v.lang === lang);
  return fallback.length ? fallback[0] : null;
}
async function speakSentence(text, gender = 'female') {
  await getVoice();
  return new Promise(async resolve => {
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 1.0;
    utter.pitch = gender === 'female' ? 1.08 : 1.0;
    utter.voice = await getVoice('en-US', gender);
    utter.onend = resolve;
    window.speechSynthesis.speak(utter);
  });
}

function spawnEnemy() {
  const idx = Math.floor(Math.random() * enemyImgs.length);
  const img = enemyImgs[idx];
  const x = Math.random() * (canvas.width - ENEMY_SIZE);
  const y = Math.random() * canvas.height * 0.2 + 20;
  enemies.push({ x, y, w: ENEMY_SIZE, h: ENEMY_SIZE, img, shot: false, imgIndex: idx });
}
function update(delta) {
  enemies = enemies.filter(e => e.y <= canvas.height);
  while (enemies.length < 2) spawnEnemy();
  enemies.forEach(e => e.y += 1);

  bullets = bullets.filter(b => b.y + b.h > 0).map(b => { b.y -= b.speed; return b; });
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height).map(b => { b.y += b.speed; return b; });

  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
        if (!fireworks && !sentenceActive) {
          nextSentence = sentences[sentenceIndex];
          sentenceIndex = (sentenceIndex + 1) % sentences.length;
          localStorage.setItem('sentenceIndex', sentenceIndex);
          const fx = e.x + e.w / 2;
          const fy = e.y + e.h / 2;
          startFireworks(nextSentence, fx, fy);
          sounds.explosion.play();
        }
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
      }
    });
  });

  if (fireworks) updateFireworks();

  if (!centerSentence) {
    showPlayButton = false;
    showTranslation = false;
    isActionLocked = false;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  enemies.forEach(e => {
    if (e.imgIndex === 1) { // enemy2.png (커피잔)
      const scaleFactor = 1.3;
      const enlargedWidth = ENEMY_SIZE * scaleFactor;
      const enlargedHeight = ENEMY_SIZE * scaleFactor;
      const enlargedX = e.x - (enlargedWidth - ENEMY_SIZE) / 2;
      const enlargedY = e.y - (enlargedHeight - ENEMY_SIZE) / 2;

      ctx.drawImage(e.img, enlargedX, enlargedY, enlargedWidth, enlargedHeight);

      if (coffeeSteamVideo && coffeeVideoAssetReady &&
          coffeeSteamVideo.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA) {

        const videoAspectRatio = (coffeeSteamVideo.videoWidth > 0 && coffeeSteamVideo.videoHeight > 0)
                                 ? coffeeSteamVideo.videoWidth / coffeeSteamVideo.videoHeight
                                 : 1;

        let steamWidth = enlargedWidth * 0.7;
        let steamHeight = steamWidth / videoAspectRatio;

        const baseX = enlargedX + (enlargedWidth - steamWidth) / 2;
        const baseYOffset = steamHeight * 0.65;
        const additionalYOffset = 30; // Y축 위로 30px 추가 이동
        const baseY = enlargedY - baseYOffset - additionalYOffset; // 김의 기본 Y 위치 수정

        const steamInstances = [
          { offsetXRatio: 0,    offsetYRatio: 0,     scale: 1.0, alpha: 0.6 },
          { offsetXRatio: -0.15, offsetYRatio: -0.1,  scale: 0.9, alpha: 0.45 },
          { offsetXRatio: 0.15,  offsetYRatio: -0.05, scale: 1.1, alpha: 0.45 }
        ];

        steamInstances.forEach(instance => {
          ctx.save();

          const currentSteamWidth = steamWidth * instance.scale;
          const currentSteamHeight = steamHeight * instance.scale;
          
          const offsetX = steamWidth * instance.offsetXRatio;
          const offsetY = steamHeight * instance.offsetYRatio;

          const steamX = baseX + offsetX - (currentSteamWidth - steamWidth) / 2;
          const steamY = baseY + offsetY - (currentSteamHeight - steamHeight) / 2; 

          ctx.globalAlpha = instance.alpha;

          ctx.drawImage(
            coffeeSteamVideo,
            steamX,
            steamY,
            currentSteamWidth,
            currentSteamHeight
          );
          ctx.restore();
        });

      } else if (e.imgIndex === 1) {
        // console.log("Coffee steam video not drawn: conditions not met.");
      }
    } else {
      ctx.drawImage(e.img, e.x, e.y, ENEMY_SIZE, ENEMY_SIZE);
    }
  });

  ctx.fillStyle = 'red';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
  drawCenterSentence();
  if (fireworks) drawFireworks();
}

function gameLoop(time) {
  if (!isGameRunning || isGamePaused) return;
  const delta = time - lastTime;
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

document.getElementById('startBtn').onclick = startGame;
document.getElementById('pauseBtn').onclick = togglePause;
document.getElementById('stopBtn').onclick = stopGame;

function startGame() {
  console.log("startGame called.");
  if (!allAssetsReady) {
    alert("이미지 및 비디오 로딩 중입니다. 잠시 후 다시 시도하세요.");
    console.warn("Start aborted: Assets not ready.");
    return;
  }
  console.log("Assets are ready, proceeding with game start.");
  isGameRunning = true;
  isGamePaused = false;
  try {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  } catch (e) {}
  bgmIndex = 0;
  bgmAudio = new Audio(bgmFiles[bgmIndex]);
  bgmAudio.volume = isMuted ? 0 : 0.05;
  bgmAudio.loop = false;
  bgmAudio.addEventListener('ended', playNextBgm);
  bgmAudio.play().catch(e => console.error("BGM play error:", e));

  if (coffeeSteamVideo && coffeeVideoAssetReady) {
    console.log(`Attempting to play coffee steam video. ReadyState: ${coffeeSteamVideo.readyState}, Paused: ${coffeeSteamVideo.paused}, Muted: ${coffeeSteamVideo.muted}, CurrentTime: ${coffeeSteamVideo.currentTime}`);
    coffeeSteamVideo.currentTime = 0;
    const playPromise = coffeeSteamVideo.play();

    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log("Coffee steam video playback HAS STARTED successfully (play() promise resolved).");
      }).catch(error => {
        console.error("Error attempting to play coffee steam video (play() promise rejected):", error);
      });
    } else {
      console.warn("coffeeSteamVideo.play() did not return a promise.");
    }
  } else {
    console.warn(`Coffee steam video NOT played. Video Element: ${!!coffeeSteamVideo}, Asset Ready: ${coffeeVideoAssetReady}`);
  }

  bullets = [];
  enemies = [];
  enemyBullets = [];
  fireworks = null;
  fireworksState = null;
  centerSentence = null;
  centerSentenceIndex = null;
  sentenceActive = false;
  centerAlpha = 1.0;
  showPlayButton = false;
  playButtonRect = null;
  showTranslation = false;
  isActionLocked = false;

  spawnEnemy();
  spawnEnemy();

  player.x = canvas.width / 2 - PLAYER_SIZE / 2;
  player.y = canvas.height - PLAYER_SIZE - 10;

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
  console.log("Game loop initiated.");
}

function togglePause() {
  if (!isGameRunning) return;
  isGamePaused = !isGamePaused;
  console.log(`Game paused: ${isGamePaused}`);
  if (isGamePaused) {
    bgmAudio.pause();
    if (coffeeSteamVideo && !coffeeSteamVideo.paused) {
        coffeeSteamVideo.pause();
        console.log("Coffee steam video paused (game pause).");
    }
  } else {
    bgmAudio.play().catch(e => console.error("BGM resume error:", e));
    if (coffeeSteamVideo && coffeeSteamVideo.paused && coffeeVideoAssetReady) {
        console.log("Attempting to resume coffee steam video (game resume).");
        const playPromise = coffeeSteamVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => console.log("Coffee steam video resumed successfully."))
                       .catch(error => console.error("Error resuming coffee steam video:", error));
        }
    }
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

function stopGame() {
  console.log("stopGame called.");
  isGameRunning = false;
  isGamePaused = false;
  bgmAudio.pause();
  if (coffeeSteamVideo && !coffeeSteamVideo.paused) {
      coffeeSteamVideo.pause();
      console.log("Coffee steam video paused (game stop).");
  }
  window.speechSynthesis.cancel();

  bullets = [];
  enemies = [];
  enemyBullets = [];
  fireworks = null;
  fireworksState = null;
  centerSentence = null;
  centerSentenceIndex = null;
  centerAlpha = 0;
  sentenceActive = false;
  showPlayButton = false;
  playButtonRect = null;
  showTranslation = false;
  isActionLocked = false;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  console.log("Game stopped and canvas cleared.");
}

const expandedMargin = 10;

canvas.addEventListener('touchstart', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;
  const touch = e.touches[0];
  const isPlayBtnTouched = showPlayButton && playButtonRect &&
    touch.clientX >= (playButtonRect.x - expandedMargin) &&
    touch.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
    touch.clientY >= (playButtonRect.y - expandedMargin) &&
    touch.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin);

  if (isPlayBtnTouched) {
    showTranslation = true;
    isActionLocked = true;
    let idx = centerSentenceIndex;
    if (idx == null) idx = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
    window.speechSynthesis.cancel();
    speakSentence(sentences[idx], 'female').then(() => {
      setTimeout(() => {
        speakSentence(sentences[idx], 'male');
      }, 800);
    });
    e.preventDefault();
    setTimeout(() => { isActionLocked = false; }, 200);
    return;
  }
  player.x = touch.clientX - player.w / 2;
  player.y = touch.clientY - player.h / 2;
  bullets.push({
    x: player.x + player.w / 2 - 2.5,
    y: player.y,
    w: 5,
    h: 10,
    speed: 2.1
  });
  sounds.shoot.play();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('mousedown', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;
  const isPlayBtnTouched = showPlayButton && playButtonRect &&
    e.clientX >= (playButtonRect.x - expandedMargin) &&
    e.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
    e.clientY >= (playButtonRect.y - expandedMargin) &&
    e.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin);

  if (isPlayBtnTouched) {
    showTranslation = true;
    isActionLocked = true;
    let idx = centerSentenceIndex;
    if (idx == null) idx = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
    window.speechSynthesis.cancel();
    speakSentence(sentences[idx], 'female').then(() => {
      setTimeout(() => {
        speakSentence(sentences[idx], 'male');
      }, 800);
    });
    e.preventDefault();
    setTimeout(() => { isActionLocked = false; }, 200);
    return;
  }
  player.x = e.clientX - player.w / 2;
  player.y = e.clientY - player.h / 2;
  bullets.push({
    x: player.x + player.w / 2 - 2.5,
    y: player.y,
    w: 5,
    h: 10,
    speed: 2.1
  });
  sounds.shoot.play();
  e.preventDefault();
});

canvas.addEventListener('touchmove', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;
  const touch = e.touches[0];
  if (showPlayButton && playButtonRect) {
    if (
      touch.clientX >= (playButtonRect.x - expandedMargin) &&
      touch.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
      touch.clientY >= (playButtonRect.y - expandedMargin) &&
      touch.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)
    ) {
      e.preventDefault();
      return;
    }
  }
  if (!showPlayButton ||
      (showPlayButton && playButtonRect &&
       !(
         touch.clientX >= (playButtonRect.x - expandedMargin) &&
         touch.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
         touch.clientY >= (playButtonRect.y - expandedMargin) &&
         touch.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)
       ))) {
    player.x = touch.clientX - player.w / 2;
    player.y = touch.clientY - player.h / 2;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('mousemove', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;
  if (showPlayButton && playButtonRect) {
    if (
      e.clientX >= (playButtonRect.x - expandedMargin) &&
      e.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
      e.clientY >= (playButtonRect.y - expandedMargin) &&
      e.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)
    ) {
      return;
    }
  }
  if (!showPlayButton ||
      (showPlayButton && playButtonRect &&
       !(
         e.clientX >= (playButtonRect.x - expandedMargin) &&
         e.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
         e.clientY >= (playButtonRect.y - expandedMargin) &&
         e.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)
       ))) {
    player.x = e.clientX - player.w / 2;
    player.y = e.clientY - player.h / 2;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  }
});