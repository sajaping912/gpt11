const canvas = document.getElementById('gameCanvas'); // 1
const ctx = canvas.getContext('2d'); // 2

canvas.width = window.innerWidth; // 3
canvas.height = window.innerHeight; // 4
window.addEventListener('resize', () => { // 5
  canvas.width = window.innerWidth; // 6
  canvas.height = window.innerHeight; // 7
}); // 8

// ===== 영어 문장 리스트 (100개로 확장 가능, 예시 10개만) ===== // 9
const sentences = [ // 10
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
  "Can you recommend a good place to eat?",
  // ...90개 더 추가!
]; // 22

let sentenceIndex = Number(localStorage.getItem('sentenceIndex') || 0); // 23

const playerImg = new Image(); // 24
playerImg.src = 'images/player.png'; // 25
const enemyImgs = ['images/enemy1.png', 'images/enemy2.png'].map(src => { // 26
  const img = new Image(); // 27
  img.src = src; // 28
  return img; // 29
}); // 30
const sounds = { // 31
  shoot: new Audio('sounds/shoot.mp3'), // 32
  explosion: new Audio('sounds/explosion.mp3'), // 33
  background: new Audio('sounds/background.mp3') // 34
}; // 35
sounds.background.loop = true; // 36

let assetsLoaded = false; // 37
let loadedImages = 0; // 38
function onImageLoad() { // 39
  loadedImages++; // 40
  if (loadedImages >= 3) assetsLoaded = true; // 41
} // 42
playerImg.onload = onImageLoad; // 43
enemyImgs.forEach(img => img.onload = onImageLoad); // 44

const PLAYER_SIZE = 50; // 45
const ENEMY_SIZE = 40; // 46
let player = { x: 0, y: 0, w: PLAYER_SIZE, h: PLAYER_SIZE }; // 47
let bullets = []; // 48
let enemies = []; // 49
let enemyBullets = []; // 50
let isGameRunning = false; // 51
let isGamePaused = false; // 52
let lastTime = 0; // 53

const burstColors = [ // 54
  '#FF5252', '#FF9800', '#FFD600', '#4CAF50', '#2196F3',
  '#9C27B0', '#E040FB', '#00BCD4', '#FFEB3B', '#FF69B4'
]; // 55

let fireworks = null; // 56
let fireworksState = null; // 57
let centerSentence = null; // 58
let centerAlpha = 1.0; // 59
let nextSentence = null; // 60
let sentenceActive = false; // 61

function splitSentence(sentence) { // 62
  const words = sentence.split(" "); // 63
  const half = Math.ceil(words.length / 2); // 64
  const line1 = words.slice(0, half).join(" "); // 65
  const line2 = words.slice(half).join(" "); // 66
  return [line1, line2]; // 67
} // 68

function getClockwiseAngle(index, total) { // 69
  return -Math.PI / 2 + (index * 2 * Math.PI) / total; // 70
} // 71

function startFireworks(sentence, fx, fy) { // 72
  const [line1, line2] = splitSentence(sentence); // 73
  const lines = [line1, line2]; // 74
  let partsArr = []; // 75
  let totalLines = lines.filter(line => line.trim().length > 0).length; // 76
  lines.forEach((line, i) => { // 77
    if (!line.trim()) return; // 78
    const parts = line.split(" "); // 79
    partsArr = partsArr.concat(parts.map(word => ({ word, row: i }))); // 80
  }); // 81

  const N = partsArr.length; // 82
  const baseRadius = 51.2; // 83
  const maxRadius = 120.96; // [★] 10% 줄인 값 (원래 134.4) // 84

  fireworks = []; // 85
  fireworksState = { // 86
    t: 0, // 87
    phase: "explode", // 88
    holdDuration: 60, // 89
    explodeDuration: 180, // 90
    gatherDuration: 45, // 91
    originX: fx, // 92
    originY: fy // 93
  }; // 94

  for (let j = 0; j < N; j++) { // 95
    const angle = getClockwiseAngle(j, N); // 96
    const color = burstColors[j % burstColors.length]; // 97
    fireworks.push({ // 98
      text: partsArr[j].word, // 99
      angle: angle, // 100
      row: partsArr[j].row, // 101
      x: fx, // 102
      y: fy, // 103
      radius: baseRadius, // 104
      maxRadius: maxRadius, // 105
      color: color, // 106
      arrived: false, // 107
      targetX: canvas.width / 2, // 108
      targetY: canvas.height / 2 + (partsArr[j].row - (totalLines - 1) / 2) * 40 // 109
    }); // 110
  } // 111
  sentenceActive = true; // 112
  centerAlpha = 1.0; // 113
} // 114

function updateFireworks() { // 115
  if (!fireworks) return false; // 116

  fireworksState.t++; // 117

  if (fireworksState.phase === "explode") { // 118
    const progress = Math.min(fireworksState.t / fireworksState.explodeDuration, 1); // 119
    const ease = 1 - Math.pow(1 - progress, 2); // 120
    const radius = 51.2 + (120.96 - 51.2) * ease; // [★] 수정 // 121

    fireworks.forEach((fw) => { // 122
      fw.radius = radius; // 123
      fw.x = fireworksState.originX + Math.cos(fw.angle) * radius; // 124
      fw.y = fireworksState.originY + Math.sin(fw.angle) * radius; // 125
    }); // 126

    if (progress >= 1) { // 127
      fireworksState.phase = "hold"; // 128
      fireworksState.t = 0; // 129
    } // 130
  } else if (fireworksState.phase === "hold") { // 131
    if (fireworksState.t >= fireworksState.holdDuration) { // 132
      fireworksState.phase = "gather"; // 133
      fireworksState.t = 0; // 134
    } // 135
  } else if (fireworksState.phase === "gather") { // 136
    const progress = Math.min(fireworksState.t / fireworksState.gatherDuration, 1); // 137
    const ease = Math.pow(progress, 2); // 138
    fireworks.forEach((fw) => { // 139
      fw.x += (fw.targetX - fw.x) * ease * 0.2; // 140
      fw.y += (fw.targetY - fw.y) * ease * 0.2; // 141
    }); // 142

    if (progress >= 1) { // 143
      fireworksState.phase = "done"; // 144
      const [line1, line2] = splitSentence(nextSentence); // 145
      centerSentence = { line1, line2 }; // 146
      centerAlpha = 1.0; // 147
      fireworks = null; // 148
      fireworksState = null; // 149
      sentenceActive = false; // 150
    } // 151
  } // 152
} // 153

function fadeOutCenterSentence() { // 154
  if (centerAlpha > 0) { // 155
    centerAlpha -= 0.05; // 156
    if (centerAlpha < 0) centerAlpha = 0; // 157
  } // 158
} // 159

function findMainVerb(words) { // 160
  const verbs = [
    "am", "is", "are", "was", "were", "be", "been", "being",
    "do", "does", "did", "have", "has", "had", "can", "could", "will", "would", "shall", "should", "may", "might", "must",
    "go", "goes", "went", "gone", "come", "comes", "came", "see", "sees", "saw", "seen",
    "make", "makes", "made", "take", "takes", "took", "taken", "eat", "eats", "ate", "eaten", "drink", "drinks", "drank", "drunk",
    "play", "plays", "played", "work", "works", "worked", "study", "studies", "studied",
    "recommend", "order", "orders", "ordered", "talk", "talks", "talked",
    "grab", "grabs", "grabbed", "enjoy", "enjoys", "enjoyed", "believe", "believes", "believed", "spend", "spends", "spent", "look", "looks", "looked", "looking",
    "forward", "looking", "help", "helps", "helped", "carry", "carries", "carried",
    "like", "likes", "liked", "want", "wants", "wanted"
  ]; // 161
  for (let i = 0; i < words.length; i++) { // 162
    let w = words[i].toLowerCase().replace(/[.,?]/g, ''); // 163
    if (verbs.includes(w)) return i; // 164
  } // 165
  return -1; // 166
} // 167

function drawCenterSentence() { // 169
  if (!centerSentence) return; // 170
  ctx.save(); // 171
  ctx.globalAlpha = centerAlpha; // 172
  ctx.font = "23.52px Arial"; // 173
  ctx.textAlign = "left"; // 174
  ctx.textBaseline = "middle"; // 175

  const blueWords = [
    "when", "where", "what", "why", "how", "who", "which",
    "will", "can", "may", "should", "must"
  ]; // 177

  let lines = [centerSentence.line1, centerSentence.line2]; // 178
  let yBase = canvas.height / 2 - 15; // 179
  for (let i = 0; i < lines.length; i++) { // 180
    let words = lines[i].split(" "); // 181
    let verbIdx = findMainVerb(words); // 182
    let totalWidth = 0;
    let wordWidths = [];
    for (let w = 0; w < words.length; w++) {
      wordWidths[w] = ctx.measureText(words[w]).width;
      totalWidth += wordWidths[w];
      if (w < words.length - 1) totalWidth += ctx.measureText(" ").width;
    }
    let px = canvas.width / 2 - totalWidth / 2;

    for (let w = 0; w < words.length; w++) {
      let wordLower = words[w].toLowerCase().replace(/[.,?]/g, '');
      if (blueWords.includes(wordLower)) {
        ctx.fillStyle = "#40A6FF";
      } else if (w === verbIdx) {
        ctx.fillStyle = "#FFD600";
      } else {
        ctx.fillStyle = "#fff";
      }
      ctx.fillText(words[w], px, yBase + i * 30);
      px += wordWidths[w];
      if (w < words.length - 1) px += ctx.measureText(" ").width;
    }
  }
  ctx.restore(); // 183
} // 184

function drawFireworks() { // 185
  if (!fireworks) return; // 186
  ctx.save(); // 187
  ctx.font = "23.52px Arial"; // 188
  ctx.textAlign = "center"; // 189
  ctx.textBaseline = "middle"; // 190
  fireworks.forEach(fw => { // 191
    ctx.globalAlpha = 1;
    ctx.fillStyle = fw.color;
    ctx.fillText(fw.text, fw.x, fw.y);
  }); // 192
  ctx.restore(); // 193
} // 194

function spawnEnemy() { // 195
  const idx = Math.floor(Math.random() * enemyImgs.length); // 196
  const img = enemyImgs[idx]; // 197
  const x = Math.random() * (canvas.width - ENEMY_SIZE); // 198
  const y = Math.random() * canvas.height * 0.2 + 20; // 199
  enemies.push({ x, y, w: ENEMY_SIZE, h: ENEMY_SIZE, img, shot: false }); // 200
} // 201

function startGame() { // 202
  if (!assetsLoaded) {
    alert("이미지 로딩 중입니다. 잠시 후 다시 시도하세요.");
    return;
  }
  isGameRunning = true;
  isGamePaused = false;
  sounds.background.currentTime = 0;
  sounds.background.play();

  enemies = [];
  bullets = [];
  enemyBullets = [];
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
  if (!isGamePaused) requestAnimationFrame(gameLoop);
}

function stopGame() {
  isGameRunning = false;
  isGamePaused = false;
  sounds.background.pause();
}

// 터치로 이동 & 총알 발사 (터치할 때 1발만 발사)
canvas.addEventListener('touchstart', e => {
  if (!isGameRunning || isGamePaused) return;
  const touch = e.touches[0];
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

canvas.addEventListener('touchmove', e => {
  if (!isGameRunning || isGamePaused) return;
  const touch = e.touches[0];
  player.x = touch.clientX - player.w / 2;
  player.y = touch.clientY - player.h / 2;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  e.preventDefault();
}, { passive: false });

function update(delta) {
  enemies = enemies.filter(e => e.y <= canvas.height);
  while (enemies.length < 2) spawnEnemy();
  enemies.forEach(e => e.y += 1);

  bullets = bullets.filter(b => b.y + b.h > 0).map(b => { b.y -= b.speed; return b; });
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height).map(b => { b.y += b.speed; return b; });

  enemyBullets.forEach((b, i) => {
    if (b.x < player.x + player.w && b.x + b.w > player.x && b.y < player.y + player.h && b.y + b.h > player.y) {
      enemyBullets.splice(i, 1);
      sounds.explosion.play();
    }
  });

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

  if (fireworks) {
    updateFireworks();
    if (centerSentence && centerAlpha > 0 && !fireworks) {
      fadeOutCenterSentence();
      if (centerAlpha <= 0) centerSentence = null;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  enemies.forEach(e => ctx.drawImage(e.img, e.x, e.y, e.w, e.h));

  ctx.fillStyle = 'red';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  ctx.fillStyle = 'orange';
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

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

document.getElementById('startBtn').onclick = startGame;
document.getElementById('pauseBtn').onclick = togglePause;
document.getElementById('stopBtn').onclick = stopGame;