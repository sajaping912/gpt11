const canvas = document.getElementById('gameCanvas'); // 1
const ctx = canvas.getContext('2d'); // 2

canvas.width = window.innerWidth; // 3
canvas.height = window.innerHeight; // 4
window.addEventListener('resize', () => { // 5
  canvas.width = window.innerWidth; // 6
  canvas.height = window.innerHeight; // 7
}); // 8

// ===== 영어 문장 리스트 (7~9단어, 예시) ===== // 9
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
  // 반지름 20% 더 줄임 // 79
  const baseRadius = 51.2; // 80
  const maxRadius = 134.4; // 81

  fireworks = []; // 82
  fireworksState = { // 83
    t: 0, // 84
    phase: "explode", // 85
    holdDuration: 60, // 86
    explodeDuration: 180, // 87
    gatherDuration: 45, // 88
    originX: fx, // 89
    originY: fy // 90
  }; // 91

  for (let j = 0; j < N; j++) { // 92
    const angle = angleStep * j; // 93
    fireworks.push({ // 94
      text: partsArr[j].word, // 95
      angle: angle, // 96
      row: partsArr[j].row, // 97
      x: fx, // 98
      y: fy, // 99
      radius: baseRadius, // 100
      maxRadius: maxRadius, // 101
      arrived: false, // 102
      targetX: canvas.width / 2, // 103
      targetY: canvas.height / 2 + (partsArr[j].row - (totalLines - 1) / 2) * 40 // 104
    }); // 105
  } // 106
  sentenceActive = true; // 107
  centerAlpha = 1.0; // 108
} // 109

function updateFireworks() { // 110
  if (!fireworks) return false; // 111

  fireworksState.t++; // 112

  if (fireworksState.phase === "explode") { // 113
    const progress = Math.min(fireworksState.t / fireworksState.explodeDuration, 1); // 114
    const ease = 1 - Math.pow(1 - progress, 2); // 115
    // 반지름 20% 더 줄인 값 사용 // 116
    const radius = 51.2 + (134.4 - 51.2) * ease; // 117

    fireworks.forEach((fw) => { // 118
      fw.radius = radius; // 119
      fw.x = fireworksState.originX + Math.cos(fw.angle) * radius; // 120
      fw.y = fireworksState.originY + Math.sin(fw.angle) * radius; // 121
    }); // 122

    if (progress >= 1) { // 123
      fireworksState.phase = "hold"; // 124
      fireworksState.t = 0; // 125
    } // 126
  } else if (fireworksState.phase === "hold") { // 127
    if (fireworksState.t >= fireworksState.holdDuration) { // 128
      fireworksState.phase = "gather"; // 129
      fireworksState.t = 0; // 130
    } // 131
  } else if (fireworksState.phase === "gather") { // 132
    const progress = Math.min(fireworksState.t / fireworksState.gatherDuration, 1); // 133
    const ease = Math.pow(progress, 2); // 134
    fireworks.forEach((fw) => { // 135
      fw.x += (fw.targetX - fw.x) * ease * 0.2; // 136
      fw.y += (fw.targetY - fw.y) * ease * 0.2; // 137
    }); // 138

    if (progress >= 1) { // 139
      fireworksState.phase = "done"; // 140
      const [line1, line2] = splitSentence(nextSentence); // 141
      centerSentence = { line1, line2 }; // 142
      centerAlpha = 1.0; // 143
      fireworks = null; // 144
      fireworksState = null; // 145
      sentenceActive = false; // 146
    } // 147
  } // 148
} // 149

function fadeOutCenterSentence() { // 150
  if (centerAlpha > 0) { // 151
    centerAlpha -= 0.05; // 152
    if (centerAlpha < 0) centerAlpha = 0; // 153
  } // 154
} // 155

function drawFireworks() { // 156
  if (!fireworks) return; // 157
  ctx.save(); // 158
  ctx.font = "23.52px Arial"; // 159
  ctx.textAlign = "center"; // 160
  ctx.textBaseline = "middle"; // 161
  // 효과 없음, 그림자 없음 // 162
  fireworks.forEach(fw => { // 163
    ctx.globalAlpha = 1; // 164
    ctx.fillStyle = "#fff633"; // 165
    ctx.fillText(fw.text, fw.x, fw.y); // 166
  }); // 167
  ctx.restore(); // 168
} // 169

function drawCenterSentence() { // 170
  if (!centerSentence) return; // 171
  ctx.save(); // 172
  ctx.globalAlpha = centerAlpha; // 173
  ctx.font = "23.52px Arial"; // 174
  ctx.textAlign = "center"; // 175
  ctx.textBaseline = "middle"; // 176
  ctx.fillStyle = "#fff633"; // 177
  ctx.fillText(centerSentence.line1, canvas.width / 2, canvas.height / 2 - 15); // 178
  ctx.fillText(centerSentence.line2, canvas.width / 2, canvas.height / 2 + 15); // 179
  ctx.restore(); // 180
} // 181

function spawnEnemy() { // 182
  const idx = Math.floor(Math.random() * enemyImgs.length); // 183
  const img = enemyImgs[idx]; // 184
  const x = Math.random() * (canvas.width - ENEMY_SIZE); // 185
  const y = Math.random() * canvas.height * 0.2 + 20; // 186
  enemies.push({ x, y, w: ENEMY_SIZE, h: ENEMY_SIZE, img, shot: false }); // 187
} // 188

function startGame() { // 189
  if (!assetsLoaded) { // 190
    alert("이미지 로딩 중입니다. 잠시 후 다시 시도하세요."); // 191
    return; // 192
  } // 193
  isGameRunning = true; // 194
  isGamePaused = false; // 195
  sounds.background.currentTime = 0; // 196
  sounds.background.play(); // 197

  enemies = []; // 198
  bullets = []; // 199
  enemyBullets = []; // 200
  spawnEnemy(); // 201
  spawnEnemy(); // 202

  player.x = canvas.width / 2 - PLAYER_SIZE / 2; // 203
  player.y = canvas.height - PLAYER_SIZE - 10; // 204

  fireworks = null; // 205
  fireworksState = null; // 206
  centerSentence = null; // 207
  centerAlpha = 1.0; // 208
  nextSentence = null; // 209
  sentenceActive = false; // 210

  lastTime = performance.now(); // 211
  requestAnimationFrame(gameLoop); // 212
} // 213

function togglePause() { // 214
  if (!isGameRunning) return; // 215
  isGamePaused = !isGamePaused; // 216
  if (isGamePaused) { // 217
    sounds.background.pause(); // 218
  } else { // 219
    sounds.background.play(); // 220
    lastTime = performance.now(); // 221
    requestAnimationFrame(gameLoop); // 222
  } // 223
} // 224

function stopGame() { // 225
  isGameRunning = false; // 226
  isGamePaused = false; // 227
  sounds.background.pause(); // 228
  sounds.background.currentTime = 0; // 229
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 230
  fireworks = null; // 231
  fireworksState = null; // 232
  centerSentence = null; // 233
  centerAlpha = 1.0; // 234
  nextSentence = null; // 235
  sentenceActive = false; // 236
} // 237

canvas.addEventListener('touchstart', e => { // 238
  e.preventDefault(); // 239
  if (!isGameRunning || isGamePaused) return; // 240

  const rect = canvas.getBoundingClientRect(); // 241
  const touch = e.touches[0]; // 242

  player.x = touch.clientX - rect.left - player.w / 2; // 243
  player.y = touch.clientY - rect.top - player.h / 2 - 20; // 244
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x)); // 245
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y)); // 246

  bullets.push({ x: player.x + player.w / 2 - 2.5, y: player.y, w: 5, h: 10, speed: 2.1 }); // 247
  sounds.shoot.play(); // 248

  enemies.forEach(e => { // 249
    if (!e.shot) { // 250
      enemyBullets.push({ x: e.x + e.w / 2 - 2.5, y: e.y + e.h, w: 5, h: 10, speed: 1.5 }); // 251
      e.shot = true; // 252
    } // 253
  }); // 254
}, { passive: false }); // 255

function update(delta) { // 256
  enemies = enemies.filter(e => e.y <= canvas.height); // 257
  while (enemies.length < 2) spawnEnemy(); // 258
  enemies.forEach(e => e.y += 1); // 259

  bullets = bullets.filter(b => b.y + b.h > 0).map(b => { b.y -= b.speed; return b; }); // 260
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height).map(b => { b.y += b.speed; return b; }); // 261

  enemyBullets.forEach((b, i) => { // 262
    if (b.x < player.x + player.w && b.x + b.w > player.x && b.y < player.y + player.h && b.y + b.h > player.y) { // 263
      enemyBullets.splice(i, 1); // 264
      sounds.explosion.play(); // 265
    } // 266
  }); // 267

  bullets.forEach((b, bi) => { // 268
    enemies.forEach((e, ei) => { // 269
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) { // 270
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
    if (centerSentence && centerAlpha > 0 && !fireworks) { // 285
      fadeOutCenterSentence(); // 286
      if (centerAlpha <= 0) centerSentence = null; // 287
    } // 288
  } // 289
} // 290

function draw() { // 291
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 292
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h); // 293
  enemies.forEach(e => ctx.drawImage(e.img, e.x, e.y, e.w, e.h)); // 294

  ctx.fillStyle = 'red'; // 295
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h)); // 296

  ctx.fillStyle = 'orange'; // 297
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h)); // 298

  drawCenterSentence(); // 299
  drawFireworks(); // 300
} // 301

function gameLoop(time) { // 302
  if (!isGameRunning || isGamePaused) return; // 303
  const delta = time - lastTime; // 304
  lastTime = time; // 305

  update(delta); // 306
  draw(); // 307

  requestAnimationFrame(gameLoop); // 308
} // 309

// 상단 버튼 연결 // 310
document.getElementById('startBtn').onclick = startGame; // 311
document.getElementById('pauseBtn').onclick = togglePause; // 312
document.getElementById('stopBtn').onclick = stopGame; // 313