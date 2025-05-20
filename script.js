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
  checkAllAssetsReady();
}

function coffeeVideoReady() {
  if (!coffeeVideoAssetReady) {
    coffeeVideoAssetReady = true;
    checkAllAssetsReady();
  }
}

function coffeeVideoError() {
  if (!coffeeVideoAssetReady) {
    console.error("Coffee steam video could not be loaded. Steam effect will be disabled.");
    coffeeVideoAssetReady = true;
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
  coffeeSteamVideo.oncanplaythrough = coffeeVideoReady;
  coffeeSteamVideo.onerror = coffeeVideoError;
  if (coffeeSteamVideo.readyState >= HTMLVideoElement.HAVE_ENOUGH_DATA) coffeeVideoReady();
  else if (coffeeSteamVideo.error) coffeeVideoError();
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
let showTranslation = false; // For translation BELOW sentence (Play button full sentence)
let isActionLocked = false;

// For word touch interaction
let centerSentenceWordRects = [];
// showTranslationForWordTouch is no longer needed for VISUALS of single word translation
// activeTouchedWord no longer needs to store Korean translation or its specific position details
// We still might need to know which word was touched if other non-visual logic depended on it,
// but for now, it's simplified.


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
    if (base.endsWith('e') && !base.endsWith('ee') && base !== 'be') base = base.slice(0, -1);
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

async function speakWord(word) {
  const cleanWord = word.replace(/[^a-zA-Z']/g, "").trim();
  if (!cleanWord) return;

  let voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    await new Promise(resolve => {
      window.speechSynthesis.onvoiceschanged = resolve;
      window.speechSynthesis.getVoices();
    });
    voices = window.speechSynthesis.getVoices();
  }

  return new Promise(async resolve => {
    const utter = new window.SpeechSynthesisUtterance(cleanWord);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1.0;

    const voice = await getVoice('en-US', 'female');
    if (voice) utter.voice = voice;

    utter.onend = resolve;
    utter.onerror = (event) => { console.error('SpeechSynthesisUtterance.onerror for word:', event); resolve(); };
    window.speechSynthesis.speak(utter);
  });
}


function drawCenterSentence() {
  if (!centerSentence) {
    centerSentenceWordRects = [];
    return;
  }
  centerSentenceWordRects = [];

  ctx.save();
  ctx.globalAlpha = centerAlpha;
  const englishFont = "23.52px Arial";
  ctx.font = englishFont;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let lines = [centerSentence.line1, centerSentence.line2];
  let lineHeight = 30;
  let englishBlockHeight = lines.filter(l => l.trim()).length * lineHeight;
  let yBaseEnglishFirstLine = canvas.height / 2 - englishBlockHeight / 2 + lineHeight / 2;

  const translationFont = "18.9px Arial"; // Still used for full sentence translation

  // SPECIFIC WORD KOREAN TRANSLATION DRAWING CODE REMOVED

  // Play Button positioning
  const playSize = 36 * 0.49;
  const btnPad = 18 * 0.49;
  const btnH = playSize + btnPad * 2;
  const btnW = playSize + btnPad * 2;
  const englishBlockCenterY = yBaseEnglishFirstLine + (englishBlockHeight - lineHeight) / 2;
  const btnY = englishBlockCenterY - btnH / 2;
  const btnX = 10;
  playButtonRect = { x: btnX, y: btnY, w: btnW, h: btnH };

  if (showPlayButton) {
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.roundRect(playButtonRect.x, playButtonRect.y, playButtonRect.w, playButtonRect.h, 20 * 0.49);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#4CAF50";
    ctx.lineWidth = 3 * 0.49;
    ctx.stroke();
    ctx.fillStyle = "#4CAF50";
    ctx.beginPath();
    ctx.moveTo(playButtonRect.x + btnPad + 6 * 0.49, playButtonRect.y + btnPad);
    ctx.lineTo(playButtonRect.x + btnPad + 6 * 0.49, playButtonRect.y + playButtonRect.h - btnPad);
    ctx.lineTo(playButtonRect.x + btnPad + playSize, playButtonRect.y + playButtonRect.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Draw English Sentence and store word rects
  ctx.font = englishFont;
  ctx.textBaseline = "middle";
  let verbColored = false;
  const currentSentenceFullText = (centerSentence.line1 + " " + centerSentence.line2).trim();
  const isQ = isQuestion(currentSentenceFullText);
  // let sentenceWordIndexCounter = 0; // Not strictly needed if not translating word-by-word

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (!lineText.trim()) continue;

    const words = lineText.split(" ");
    let wordMetrics = words.map(w => ctx.measureText(w));
    let spaceWidth = ctx.measureText(" ").width;
    let totalWidth = wordMetrics.reduce((sum, m) => sum + m.width, 0) + spaceWidth * (words.length - 1);

    let currentX = (canvas.width - totalWidth) / 2;
    let currentY = yBaseEnglishFirstLine + i * lineHeight;

    for (let j = 0; j < words.length; j++) {
      let rawWord = words[j];
      let cleanedWord = rawWord.replace(/[^a-zA-Z']/g, "");
      let lowerCleanedWord = cleanedWord.toLowerCase();
      let color = "#fff";

      if (isQ && i === 0 && j === 0 && (isAux(lowerCleanedWord) || isWh(lowerCleanedWord))) {
        color = "#40b8ff";
      } else if (isVerb(lowerCleanedWord) && !verbColored) {
        color = "#FFD600";
        verbColored = true;
      } else if (isAux(lowerCleanedWord) || isBeen(lowerCleanedWord)) {
        color = "#40b8ff";
      } else if (isVing(lowerCleanedWord)) {
        color = "#40b8ff";
      }
      ctx.fillStyle = color;
      ctx.fillText(rawWord, currentX, currentY);

      const wordWidth = wordMetrics[j].width;
      const wordHeight = parseFloat(englishFont);
      centerSentenceWordRects.push({
        word: rawWord,
        x: currentX,
        y: currentY,
        w: wordWidth,
        h: wordHeight,
        // sentenceWordIndex: sentenceWordIndexCounter++ // No longer needed for word translation
      });
      currentX += wordWidth + spaceWidth;
    }
  }

  // Draw FULL sentence translation BELOW (for play button)
  if (showTranslation && centerSentenceIndex !== null && translations[centerSentenceIndex]) {
    ctx.save();
    ctx.font = translationFont;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFD600";
    ctx.shadowColor = "#111";
    ctx.shadowBlur = 4;
    const lastEnglishLineY = yBaseEnglishFirstLine + (lines.filter(l=>l.trim()).length - 1) * lineHeight;
    const translationTextHeight = parseFloat(translationFont);
    const translationBelowY = lastEnglishLineY + lineHeight/2 + 10 + translationTextHeight / 2;
    ctx.fillText(
      translations[centerSentenceIndex],
      canvas.width / 2,
      translationBelowY
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
  // No need to manage showTranslationForWordTouch or activeTouchedWord for word translation visuals
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
      // No need to reset word translation specific states here
      centerSentenceWordRects = [];

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
      window.speechSynthesis.getVoices();
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
  if (fallback.length) return fallback[0];
  return voices.find(v => v.default && v.lang.startsWith(lang.split('-')[0])) || voices.find(v=>v.default) || voices[0];
}
async function speakSentence(text, gender = 'female') {
  return new Promise(async resolve => {
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 1.0;
    utter.pitch = gender === 'female' ? 1.08 : 1.0;
    utter.voice = await getVoice('en-US', gender);
    if (!utter.voice) console.warn("speakSentence: Voice not set for", text, gender);
    utter.onend = resolve;
    utter.onerror = (event) => { console.error('SpeechSynthesisUtterance.onerror for sentence:', event); resolve(); };
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
    // No word translation visual state to reset
    isActionLocked = false;
    centerSentenceWordRects = [];
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  enemies.forEach(e => {
    if (e.imgIndex === 1) {
      const scaleFactor = 1.3;
      const enlargedWidth = ENEMY_SIZE * scaleFactor;
      const enlargedHeight = ENEMY_SIZE * scaleFactor;
      const enlargedX = e.x - (enlargedWidth - ENEMY_SIZE) / 2;
      const enlargedY = e.y - (enlargedHeight - ENEMY_SIZE) / 2;
      ctx.drawImage(e.img, enlargedX, enlargedY, enlargedWidth, enlargedHeight);
      if (coffeeSteamVideo && coffeeVideoAssetReady && coffeeSteamVideo.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA) {
        const videoAspectRatio = (coffeeSteamVideo.videoWidth > 0 && coffeeSteamVideo.videoHeight > 0) ? coffeeSteamVideo.videoWidth / coffeeSteamVideo.videoHeight : 1;
        let steamWidth = enlargedWidth * 0.7;
        let steamHeight = steamWidth / videoAspectRatio;
        const baseX = enlargedX + (enlargedWidth - steamWidth) / 2;
        const baseYOffset = steamHeight * 0.65;
        const additionalYOffset = 30;
        const baseY = enlargedY - baseYOffset - additionalYOffset;
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
          ctx.drawImage(coffeeSteamVideo, steamX, steamY, currentSteamWidth, currentSteamHeight);
          ctx.restore();
        });
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
  if (!allAssetsReady) {
    alert("이미지 및 비디오 로딩 중입니다. 잠시 후 다시 시도하세요.");
    return;
  }
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
    coffeeSteamVideo.currentTime = 0;
    const playPromise = coffeeSteamVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(error => {
        console.error("Error attempting to play coffee steam video:", error);
      });
    }
  }

  bullets = []; enemies = []; enemyBullets = [];
  fireworks = null; fireworksState = null;
  centerSentence = null; centerSentenceIndex = null;
  sentenceActive = false; centerAlpha = 1.0;
  showPlayButton = false; playButtonRect = null;
  showTranslation = false;
  // No word translation visual state to reset
  centerSentenceWordRects = [];
  isActionLocked = false;

  spawnEnemy(); spawnEnemy();
  player.x = canvas.width / 2 - PLAYER_SIZE / 2;
  player.y = canvas.height - PLAYER_SIZE - 10;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (!isGameRunning) return;
  isGamePaused = !isGamePaused;
  if (isGamePaused) {
    bgmAudio.pause();
    if (coffeeSteamVideo && !coffeeSteamVideo.paused) coffeeSteamVideo.pause();
    window.speechSynthesis.cancel();
  } else {
    bgmAudio.play().catch(e => console.error("BGM resume error:", e));
    if (coffeeSteamVideo && coffeeSteamVideo.paused && coffeeVideoAssetReady) {
        const playPromise = coffeeSteamVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {}).catch(error => console.error("Error resuming coffee steam video:", error));
        }
    }
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

function stopGame() {
  isGameRunning = false; isGamePaused = false;
  bgmAudio.pause();
  if (coffeeSteamVideo && !coffeeSteamVideo.paused) coffeeSteamVideo.pause();
  window.speechSynthesis.cancel();

  bullets = []; enemies = []; enemyBullets = [];
  fireworks = null; fireworksState = null;
  centerSentence = null; centerSentenceIndex = null;
  centerAlpha = 0; sentenceActive = false;
  showPlayButton = false; playButtonRect = null;
  showTranslation = false;
  // No word translation visual state to reset
  centerSentenceWordRects = [];
  isActionLocked = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

const expandedMargin = 10;

function handleCanvasInteraction(clientX, clientY, event) {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;

  // 1. Check Play Button
  const isPlayBtnTouched = showPlayButton && playButtonRect &&
    clientX >= (playButtonRect.x - expandedMargin) &&
    clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
    clientY >= (playButtonRect.y - expandedMargin) &&
    clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin);

  if (isPlayBtnTouched) {
    showTranslation = true; // Full sentence translation BELOW
    // No single word translation to hide or manage
    isActionLocked = true;
    let idx = centerSentenceIndex !== null ? centerSentenceIndex : (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
    window.speechSynthesis.cancel();
    speakSentence(sentences[idx], 'female').then(() => {
      setTimeout(() => {
        speakSentence(sentences[idx], 'male');
      }, 800);
    });
    event.preventDefault();
    setTimeout(() => { isActionLocked = false; }, 200);
    return;
  }

  // 2. Check Word Touch (Only for speaking the word)
  if (centerSentence && showPlayButton && centerSentenceWordRects.length > 0) {
    for (const wordRect of centerSentenceWordRects) {
      if (
        clientX >= wordRect.x && clientX <= wordRect.x + wordRect.w &&
        clientY >= wordRect.y - wordRect.h / 2 && clientY <= wordRect.y + wordRect.h / 2
      ) {
        window.speechSynthesis.cancel();
        speakWord(wordRect.word);

        // Korean translation logic REMOVED
        // showTranslationForWordTouch = false; // No longer used for visuals
        // activeTouchedWord related to Korean translation REMOVED

        isActionLocked = true;
        event.preventDefault();
        setTimeout(() => { isActionLocked = false; }, 200);
        return;
      }
    }
  }

  // 3. Player Movement and Shooting
  if (!(showPlayButton && playButtonRect && clientX >= playButtonRect.x && clientX <= playButtonRect.x + playButtonRect.w && clientY >= playButtonRect.y && clientY <= playButtonRect.y + playButtonRect.h)) {
      player.x = clientX - player.w / 2;
      player.y = clientY - player.h / 2;
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
      bullets.push({ x: player.x + player.w / 2 - 2.5, y: player.y, w: 5, h: 10, speed: 2.1 });
      sounds.shoot.play();
  }
  event.preventDefault();
}


canvas.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  handleCanvasInteraction(touch.clientX, touch.clientY, e);
}, { passive: false });

canvas.addEventListener('mousedown', e => {
  handleCanvasInteraction(e.clientX, e.clientY, e);
});


canvas.addEventListener('touchmove', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;
  const touch = e.touches[0];

  if (showPlayButton && playButtonRect &&
      touch.clientX >= (playButtonRect.x - expandedMargin) &&
      touch.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
      touch.clientY >= (playButtonRect.y - expandedMargin) &&
      touch.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)) {
    e.preventDefault(); return;
  }

  if (centerSentence && showPlayButton && centerSentenceWordRects.length > 0) {
    for (const wordRect of centerSentenceWordRects) {
      if (
        touch.clientX >= wordRect.x && touch.clientX <= wordRect.x + wordRect.w &&
        touch.clientY >= wordRect.y - wordRect.h/2 && touch.clientY <= wordRect.y + wordRect.h/2
      ) {
        e.preventDefault(); return;
      }
    }
  }

  player.x = touch.clientX - player.w / 2;
  player.y = touch.clientY - player.h / 2;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('mousemove', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;

  if (showPlayButton && playButtonRect &&
      e.clientX >= (playButtonRect.x - expandedMargin) &&
      e.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
      e.clientY >= (playButtonRect.y - expandedMargin) &&
      e.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)) {
    return;
  }

   if (centerSentence && showPlayButton && centerSentenceWordRects.length > 0) {
    for (const wordRect of centerSentenceWordRects) {
      if (
        e.clientX >= wordRect.x && e.clientX <= wordRect.x + wordRect.w &&
        e.clientY >= wordRect.y - wordRect.h/2 && e.clientY <= wordRect.y + wordRect.h/2
      ) {
        return;
      }
    }
  }

  player.x = e.clientX - player.w / 2;
  player.y = e.clientY - player.h / 2;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
});