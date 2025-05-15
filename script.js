const canvas = document.getElementById('gameCanvas'); // 1
const ctx = canvas.getContext('2d'); // 2

canvas.width = window.innerWidth; // 3
canvas.height = window.innerHeight; // 4
window.addEventListener('resize', () => { // 5
  canvas.width = window.innerWidth; // 6
  canvas.height = window.innerHeight; // 7
}); // 8

// ===== 영어 문장 리스트 (100개 예시, 7~9단어) ===== // 9
const sentences = [ // 10
  "I can’t believe how fast time goes by.", // 11
  "What do you usually do on weekends?", // 12
  "Could you help me carry these groceries inside?", // 13
  "I really enjoyed spending time with you today.", // 14
  "Let’s grab a coffee and talk for a while.", // 15
  "Do you have any plans for this evening?", // 16
  "It’s been a long day at the office.", // 17
  "I’d like to order the same as her.", // 18
  "I’m looking forward to our trip next month.", // 19
  "Can you recommend a good place to eat?", // 20
  // ... (필요시 추가) // 21
]; // 22

const playerImg = new Image(); // 23
playerImg.src = 'images/player.png'; // 24
const enemyImgs = ['images/enemy1.png', 'images/enemy2.png'].map(src => { // 25
  const img = new Image(); // 26
  img.src = src; // 27
  return img; // 28
}); // 29
const sounds = { // 30
  shoot: new Audio('sounds/shoot.mp3'), // 31
  explosion: new Audio('sounds/explosion.mp3'), // 32
  background: new Audio('sounds/background.mp3') // 33
}; // 34
sounds.background.loop = true; // 35

let assetsLoaded = false; // 36
let loadedImages = 0; // 37
function onImageLoad() { // 38
  loadedImages++; // 39
  if (loadedImages >= 3) assetsLoaded = true; // 40
} // 41
playerImg.onload = onImageLoad; // 42
enemyImgs.forEach(img => img.onload = onImageLoad); // 43

const PLAYER_SIZE = 50; // 44
const ENEMY_SIZE = 40; // 45
let player = { x: 0, y: 0, w: PLAYER_SIZE, h: PLAYER_SIZE }; // 46
let bullets = []; // 47
let enemies = []; // 48
let enemyBullets = []; // 49
let isGameRunning = false; // 50
let isGamePaused = false; // 51
let lastTime = 0; // 52

// 폭발/문장 애니메이션 관련 // 53
let fireworks = null; // 54
let fireworksState = null; // 55
let centerSentence = null; // 56
let centerAlpha = 1.0; // 57
let nextSentence = null; // 58
let sentenceActive = false; // 59

function splitSentence(sentence) { // 60
  const words = sentence.split(" "); // 61
  const half = Math.ceil(words.length / 2); // 62
  const line1 = words.slice(0, half).join(" "); // 63
  const line2 = words.slice(half).join(" "); // 64
  return [line1, line2]; // 65
} // 66

function startFireworks(sentence, fx, fy) { // 67
  const [line1, line2] = splitSentence(sentence); // 68
  const lines = [line1, line2]; // 69
  let partsArr = []; // 70
  let totalLines = lines.filter(line => line.trim().length > 0).length; // 71
  lines.forEach((line, i) => { // 72
    if (!line.trim()) return; // 73
    const parts = line.split(" "); // 74
    partsArr = partsArr.concat(parts.map(word => ({ word, row: i }))); // 75
  }); // 76

  const N = partsArr.length; // 77
  const angleStep = (Math.PI * 2) / N; // 78
  const baseRadius = 80; // 79
  const maxRadius = 210; // 80

  fireworks = []; // 81
  fireworksState = { // 82
    t: 0, // 83
    phase: "explode", // 84
    holdDuration: 60, // 85
    explodeDuration: 180, // 86
    gatherDuration: 45, // 87
    originX: fx, // 88
    originY: fy // 89
  }; // 90

  for (let j = 0; j < N; j++) { // 91
    const angle = angleStep * j; // 92
    fireworks.push({ // 93
      text: partsArr[j].word, // 94
      angle: angle, // 95
      row: partsArr[j].row, // 96
      x: fx, // 97
      y: fy, // 98
      radius: baseRadius, // 99
      maxRadius: maxRadius, // 100
      arrived: false, // 101
      targetX: canvas.width / 2, // 102
      targetY: canvas.height / 2 + (partsArr[j].row - (totalLines - 1) / 2) * 40 // 103
    }); // 104
  } // 105
  sentenceActive = true; // 106
  centerAlpha = 1.0; // 107
} // 108

function updateFireworks() { // 109
  if (!fireworks) return false; // 110

  fireworksState.t++; // 111

  if (fireworksState.phase === "explode") { // 112
    const progress = Math.min(fireworksState.t / fireworksState.explodeDuration, 1); // 113
    const ease = 1 - Math.pow(1 - progress, 2); // 114
    const radius = 80 + (210 - 80) * ease; // 115

    fireworks.forEach((fw) => { // 116
      fw.radius = radius; // 117
      fw.x = fireworksState.originX + Math.cos(fw.angle) * radius; // 118
      fw.y = fireworksState.originY + Math.sin(fw.angle) * radius; // 119
    }); // 120

    if (progress >= 1) { // 121
      fireworksState.phase = "hold"; // 122
      fireworksState.t = 0; // 123
    } // 124
  } else if (fireworksState.phase === "hold") { // 125
    if (fireworksState.t >= fireworksState.holdDuration) { // 126
      fireworksState.phase = "gather"; // 127
      fireworksState.t = 0; // 128
    } // 129
  } else if (fireworksState.phase === "gather") { // 130
    const progress = Math.min(fireworksState.t / fireworksState.gatherDuration, 1); // 131
    const ease = Math.pow(progress, 2); // 132
    fireworks.forEach((fw) => { // 133
      fw.x += (fw.targetX - fw.x) * ease * 0.2; // 134
      fw.y += (fw.targetY - fw.y) * ease * 0.2; // 135
    }); // 136

    if (progress >= 1) { // 137
      fireworksState.phase = "done"; // 138
      const [line1, line2] = splitSentence(nextSentence); // 139
      centerSentence = { line1, line2 }; // 140
      centerAlpha = 1.0; // 141
      fireworks = null; // 142
      fireworksState = null; // 143
      sentenceActive = false; // 144
    } // 145
  } // 146
} // 147

function fadeOutCenterSentence() { // 148
  if (centerAlpha > 0) { // 149
    centerAlpha -= 0.05; // 150
    if (centerAlpha < 0) centerAlpha = 0; // 151
  } // 152
} // 153

function drawFireworks() { // 154
  if (!fireworks) return; // 155
  ctx.save(); // 156
  ctx.font = "bold 28px Arial"; // 157
  ctx.textAlign = "center"; // 158
  ctx.textBaseline = "middle"; // 159
  fireworks.forEach(fw => { // 160
    ctx.globalAlpha = 1; // 161
    ctx.fillStyle = "#fff633"; // 162
    ctx.fillText(fw.text, fw.x, fw.y); // 163
  }); // 164
  ctx.restore(); // 165
} // 166

function drawCenterSentence() { // 167
  if (!centerSentence) return; // 168
  ctx.save(); // 169
  ctx.globalAlpha = centerAlpha; // 170
  ctx.font = "bold 28px Arial"; // 171
  ctx.textAlign = "center"; // 172
  ctx.textBaseline = "middle"; // 173
  const cx = canvas.width / 2; // 174
  const cy = canvas.height / 2; // 175
  ctx.fillStyle = "#fff633"; // 176
  ctx.fillText(centerSentence.line1, cx, cy - 18); // 177
  ctx.fillText(centerSentence.line2, cx, cy + 18); // 178
  ctx.restore(); // 179
} // 180

function spawnEnemy() { // 181
  const idx = Math.floor(Math.random() * enemyImgs.length); // 182
  const img = enemyImgs[idx]; // 183
  const x = Math.random() * (canvas.width - ENEMY_SIZE); // 184
  const y = Math.random() * canvas.height * 0.2 + 20; // 185
  enemies.push({ x, y, w: ENEMY_SIZE, h: ENEMY_SIZE, img, shot: false }); // 186
} // 187

function startGame() { // 188
  if (!assetsLoaded) { // 189
    alert("이미지 로딩 중입니다. 잠시 후 다시 시도하세요."); // 190
    return; // 191
  } // 192
  isGameRunning = true; // 193
  isGamePaused = false; // 194
  sounds.background.currentTime = 0; // 195
  sounds.background.play(); // 196

  enemies = []; // 197
  bullets = []; // 198
  enemyBullets = []; // 199
  spawnEnemy(); // 200
  spawnEnemy(); // 201

  player.x = canvas.width / 2 - PLAYER_SIZE / 2; // 202
  player.y = canvas.height - PLAYER_SIZE - 10; // 203

  fireworks = null; // 204
  fireworksState = null; // 205
  centerSentence = null; // 206
  centerAlpha = 1.0; // 207
  nextSentence = null; // 208
  sentenceActive = false; // 209

  lastTime = performance.now(); // 210
  requestAnimationFrame(gameLoop); // 211
} // 212

function togglePause() { // 213
  if (!isGameRunning) return; // 214
  isGamePaused = !isGamePaused; // 215
  if (isGamePaused) { // 216
    sounds.background.pause(); // 217
  } else { // 218
    sounds.background.play(); // 219
    lastTime = performance.now(); // 220
    requestAnimationFrame(gameLoop); // 221
  } // 222
} // 223

function stopGame() { // 224
  isGameRunning = false; // 225
  isGamePaused = false; // 226
  sounds.background.pause(); // 227
  sounds.background.currentTime = 0; // 228
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 229
  fireworks = null; // 230
  fireworksState = null; // 231
  centerSentence = null; // 232
  centerAlpha = 1.0; // 233
  nextSentence = null; // 234
  sentenceActive = false; // 235
} // 236

canvas.addEventListener('touchstart', e => { // 237
  e.preventDefault(); // 238
  if (!isGameRunning || isGamePaused) return; // 239

  const rect = canvas.getBoundingClientRect(); // 240
  const touch = e.touches[0]; // 241

  player.x = touch.clientX - rect.left - player.w / 2; // 242
  player.y = touch.clientY - rect.top - player.h / 2 - 20; // 243
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x)); // 244
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y)); // 245

  bullets.push({ x: player.x + player.w / 2 - 2.5, y: player.y, w: 5, h: 10, speed: 2.1 }); // 246
  sounds.shoot.play(); // 247

  enemies.forEach(e => { // 248
    if (!e.shot) { // 249
      enemyBullets.push({ x: e.x + e.w / 2 - 2.5, y: e.y + e.h, w: 5, h: 10, speed: 1.5 }); // 250
      e.shot = true; // 251
    } // 252
  }); // 253
}, { passive: false }); // 254

function update(delta) { // 255
  enemies = enemies.filter(e => e.y <= canvas.height); // 256
  while (enemies.length < 2) spawnEnemy(); // 257
  enemies.forEach(e => e.y += 1); // 258

  bullets = bullets.filter(b => b.y + b.h > 0).map(b => { b.y -= b.speed; return b; }); // 259
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height).map(b => { b.y += b.speed; return b; }); // 260

  enemyBullets.forEach((b, i) => { // 261
    if (b.x < player.x + player.w && b.x + b.w > player.x && b.y < player.y + player.h && b.y + b.h > player.y) { // 262
      enemyBullets.splice(i, 1); // 263
      sounds.explosion.play(); // 264
    } // 265
  }); // 266

  bullets.forEach((b, bi) => { // 267
    enemies.forEach((e, ei) => { // 268
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) { // 269
        // 폭발 상태가 아니면(항상 새로) // 270
        if (!fireworks && !sentenceActive) { // 271
          nextSentence = sentences[Math.floor(Math.random() * sentences.length)]; // 272
          const fx = e.x + e.w / 2; // 273
          const fy = e.y + e.h / 2; // 274
          startFireworks(nextSentence, fx, fy); // 275
          sounds.explosion.play(); // 276
        } // 277
        enemies.splice(ei, 1); // 278
        bullets.splice(bi, 1); // 279
      } // 280
    }); // 281
  }); // 282

  if (fireworks) { // 283
    updateFireworks(); // 284
    // 중앙문장이 fade out된 후에는 null 처리 // 285
    if (centerSentence && centerAlpha > 0 && !fireworks) { // 286
      fadeOutCenterSentence(); // 287
      if (centerAlpha <= 0) centerSentence = null; // 288
    } // 289
  } // 290
} // 291

function draw() { // 292
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 293
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h); // 294
  enemies.forEach(e => ctx.drawImage(e.img, e.x, e.y, e.w, e.h)); // 295

  ctx.fillStyle = 'red'; // 296
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h)); // 297

  ctx.fillStyle = 'orange'; // 298
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h)); // 299

  drawCenterSentence(); // 300
  drawFireworks(); // 301
} // 302

function gameLoop(time) { // 303
  if (!isGameRunning || isGamePaused) return; // 304
  const delta = time - lastTime; // 305
  lastTime = time; // 306
  update(delta); // 307
  draw(); // 308
  requestAnimationFrame(gameLoop); // 309
} // 310

// 버튼 연결 // 311
document.getElementById('startBtn').onclick = startGame; // 312
document.getElementById('pauseBtn').onclick = togglePause; // 313
document.getElementById('stopBtn').onclick = stopGame; // 314
