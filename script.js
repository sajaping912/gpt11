const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

const sentences = [
  "When will you arrive at the station?",
  "I can’t believe how fast time goes by.",
  "What do you usually do on weekends?",
  "Could you help me carry these groceries inside?",
  "I really enjoyed spending time with you today.",
  "Let’s grab a coffee and talk for a while.",
  "Do you have any plans for this evening?",
  "It’s been a long day at the office.",
  "I’d like to order the same as her.",
  "I’m looking forward to our trip next month.",
  "Can you recommend a good place to eat?"
];
const translations = [
  "너는 언제 역에 도착하니?",
  "시간이 얼마나 빠르게 지나가는지 믿을 수 없어.",
  "너는 주말에 보통 무엇을 하니?",
  "이 식료품들을 안으로 옮기는 것 좀 도와줄 수 있니?",
  "오늘 너와 함께 시간을 보내서 정말 즐거웠어.",
  "커피 한 잔 하면서 잠시 이야기하자.",
  "오늘 저녁에 계획 있는 거 있어?",
  "오늘은 사무실에서 긴 하루였어.",
  "나도 그녀와 같은 걸로 주문하고 싶어요.",
  "다음 달 우리 여행이 기대돼.",
  "맛있는 식당 좀 추천해줄 수 있어?"
];

let sentenceIndex = Number(localStorage.getItem('sentenceIndex') || 0);

const playerImg = new Image();
playerImg.src = 'images/player.png';
const enemyImgs = ['images/enemy1.png', 'images/enemy2.png'].map(src => {
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

let assetsLoaded = false;
let loadedImages = 0;
function onImageLoad() {
  loadedImages++;
  if (loadedImages >= 3) assetsLoaded = true;
}
playerImg.onload = onImageLoad;
enemyImgs.forEach(img => img.onload = onImageLoad);

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

// 플레이 버튼/번역 상태
let showPlayButton = false;
let playButtonRect = null;
let showTranslation = false;

// pause(조작 완전 차단) 플래그
let isActionLocked = false;

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
        speakSentence(sentences[idx], 'female');
        setTimeout(() => {
          speakSentence(sentences[idx], 'male');
        }, 1500);
      }, 1000);
    }
  }
}

// === 중앙정렬/플레이버튼 위치수정 drawCenterSentence ===
function drawCenterSentence() {
  if (!centerSentence) return;

  ctx.save();
  ctx.globalAlpha = centerAlpha;
  ctx.font = "23.52px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let lines = [centerSentence.line1, centerSentence.line2];

  let lineHeight = 30;
  let blockHeight = lines.length * lineHeight;
  let yBase = canvas.height / 2 - blockHeight / 2 + lineHeight / 2;

  // 플레이 버튼: x=10, y 기존보다 10px 아래
  const playSize = 36 * 0.49;
  const btnPad = 18 * 0.49;
  const btnH = playSize + btnPad * 2;
  const btnW = playSize + btnPad * 2;
  const btnY = canvas.height / 2 - 15 - 20 + 10;
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

  for (let i = 0; i < lines.length; i++) {
    ctx.fillStyle = "#fff";
    ctx.fillText(lines[i], canvas.width / 2, yBase + i * lineHeight);
  }

  if (showTranslation) {
    ctx.save();
    ctx.font = "21px Arial";
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
// === drawCenterSentence 끝 ===

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

function spawnEnemy() {
  const idx = Math.floor(Math.random() * enemyImgs.length);
  const img = enemyImgs[idx];
  const x = Math.random() * (canvas.width - ENEMY_SIZE);
  const y = Math.random() * canvas.height * 0.2 + 20;
  enemies.push({ x, y, w: ENEMY_SIZE, h: ENEMY_SIZE, img, shot: false });
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
  enemies.forEach(e => ctx.drawImage(e.img, e.x, e.y, e.w, e.h));
  ctx.fillStyle = 'red';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
  drawCenterSentence();
  drawFireworks();
}

function gameLoop(time) {
  if (!isGameRunning || isGamePaused) return;
  const delta = time - lastTime;
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

// 버튼 이벤트 등록
document.getElementById('startBtn').onclick = startGame;
document.getElementById('pauseBtn').onclick = togglePause;
document.getElementById('stopBtn').onclick = stopGame;

// start/pause/stop 함수 정의
function startGame() {
  if (!assetsLoaded) {
    alert("이미지 로딩 중입니다. 잠시 후 다시 시도하세요.");
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
  bgmAudio.play();

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
}

function togglePause() {
  if (!isGameRunning) return;
  isGamePaused = !isGamePaused;
  if (isGamePaused) {
    bgmAudio.pause();
  } else {
    bgmAudio.play();
    requestAnimationFrame(gameLoop);
  }
}

function stopGame() {
  isGameRunning = false;
  isGamePaused = false;
  bgmAudio.pause();
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
}

// ===== 터치/마우스 조작 이벤트 =====

canvas.addEventListener('touchstart', e => {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;
  const touch = e.touches[0];
  const isPlayBtnTouched = showPlayButton && playButtonRect &&
    touch.clientX >= playButtonRect.x && touch.clientX <= playButtonRect.x + playButtonRect.w &&
    touch.clientY >= playButtonRect.y && touch.clientY <= playButtonRect.y + playButtonRect.h;

  if (isPlayBtnTouched) {
    showTranslation = true;
    isActionLocked = true;
    let idx = centerSentenceIndex;
    if (idx == null) idx = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
    window.speechSynthesis.cancel();
    speakSentence(sentences[idx], 'female');
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
    e.clientX >= playButtonRect.x && e.clientX <= playButtonRect.x + playButtonRect.w &&
    e.clientY >= playButtonRect.y && e.clientY <= playButtonRect.y + playButtonRect.h;

  if (isPlayBtnTouched) {
    showTranslation = true;
    isActionLocked = true;
    let idx = centerSentenceIndex;
    if (idx == null) idx = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
    window.speechSynthesis.cancel();
    speakSentence(sentences[idx], 'female');
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
      touch.clientX >= playButtonRect.x && touch.clientX <= playButtonRect.x + playButtonRect.w &&
      touch.clientY >= playButtonRect.y && touch.clientY <= playButtonRect.y + playButtonRect.h
    ) {
      e.preventDefault();
      return;
    }
  }
  if (!showPlayButton ||
      (showPlayButton && playButtonRect &&
       !(touch.clientX >= playButtonRect.x && touch.clientX <= playButtonRect.x + playButtonRect.w &&
         touch.clientY >= playButtonRect.y && touch.clientY <= playButtonRect.y + playButtonRect.h))) {
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
      e.clientX >= playButtonRect.x && e.clientX <= playButtonRect.x + playButtonRect.w &&
      e.clientY >= playButtonRect.y && e.clientY <= playButtonRect.y + playButtonRect.h
    ) {
      return;
    }
  }
  if (!showPlayButton ||
      (showPlayButton && playButtonRect &&
       !(e.clientX >= playButtonRect.x && e.clientX <= playButtonRect.x + playButtonRect.w &&
         e.clientY >= playButtonRect.y && e.clientY <= playButtonRect.y + playButtonRect.h))) {
    player.x = e.clientX - player.w / 2;
    player.y = e.clientY - player.h / 2;
    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  }
});