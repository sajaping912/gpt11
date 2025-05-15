// 리소스 로드
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
});

// 이미지 및 사운드 로드
const playerImg = new Image();
playerImg.src   = 'images/player.png';
const enemyImgs = ['images/enemy1.png', 'images/enemy2.png'].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
const sounds = {
  shoot:     new Audio('sounds/shoot.mp3'),
  explosion: new Audio('sounds/explosion.mp3'),
  background: new Audio('sounds/background.mp3')
};
sounds.background.loop = true;

// 게임 상태 및 객체
const PLAYER_SIZE = 50;
const ENEMY_SIZE  = 40;
let player        = { x: 0, y: 0, w: PLAYER_SIZE, h: PLAYER_SIZE };
let bullets       = [];
let enemies       = [];
let enemyBullets  = [];
let isGameRunning = false;
let isGamePaused  = false;
let lastTime      = 0;

// 컨트롤 버튼
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stopBtn  = document.getElementById('stopBtn');
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', togglePause);
stopBtn.addEventListener('click', stopGame);

// 적 스폰
function spawnEnemy() {
  const x = Math.random() * (canvas.width - ENEMY_SIZE);
  enemies.push({
    x,
    y: -ENEMY_SIZE,
    w: ENEMY_SIZE,
    h: ENEMY_SIZE,
    img: enemyImgs[Math.floor(Math.random() * enemyImgs.length)],
    shot: false
  });
}

// 게임 시작
function startGame() {
  if (isGameRunning) return;
  isGameRunning = true;
  isGamePaused  = false;
  sounds.background.play();

  enemies      = [];
  bullets      = [];
  enemyBullets = [];
  spawnEnemy();
  spawnEnemy();

  player.x = canvas.width / 2 - PLAYER_SIZE / 2;
  player.y = canvas.height - PLAYER_SIZE - 10;

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// 일시정지
function togglePause() {
  if (!isGameRunning) return;
  isGamePaused = !isGamePaused;
  if (isGamePaused) {
    sounds.background.pause();
  } else {
    sounds.background.play();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
  }
}

// 정지
function stopGame() {
  isGameRunning = false;
  isGamePaused  = false;
  sounds.background.pause();
  sounds.background.currentTime = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// 터치 이동 + 발사
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!isGameRunning || isGamePaused) return;

  const rect  = canvas.getBoundingClientRect();
  const touch = e.touches[0];

  player.x = touch.clientX - rect.left - player.w / 2;
  player.y = touch.clientY - rect.top - player.h / 2 - 20;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

  // 플레이어 총알 (사각형)
  bullets.push({ x: player.x + player.w / 2 - 2.5, y: player.y, w: 5, h: 10, speed: 7 });
  sounds.shoot.play();

  // 적 총알 (한 번만)
  enemies.forEach(e => {
    if (!e.shot) {
      enemyBullets.push({ x: e.x + e.w / 2 - 2.5, y: e.y + e.h, w: 5, h: 10, speed: 3 });
      e.shot = true;
    }
  });
}, { passive: false });

// 업데이트
function update(delta) {
  enemies = enemies.filter(e => e.y <= canvas.height);
  while (enemies.length < 2) spawnEnemy();
  enemies.forEach(e => e.y += 1);

  bullets      = bullets.filter(b => b.y + b.h > 0).map(b => { b.y -= b.speed; return b; });
  enemyBullets = enemyBullets.filter(b => b.y < canvas.height).map(b => { b.y += b.speed; return b; });

  // 충돌: 적 총알 → 플레이어
  enemyBullets.forEach((b, i) => {
    if (b.x < player.x + player.w && b.x + b.w > player.x && b.y < player.y + player.h && b.y + b.h > player.y) {
      enemyBullets.splice(i, 1);
      sounds.explosion.play();
    }
  });

  // 충돌: 플레이어 총알 → 적
  bullets.forEach((b, bi) => {
    enemies.forEach((e, ei) => {
      if (b.x < e.x + e.w && b.x + b.w > e.x && b.y < e.y + e.h && b.y + b.h > e.y) {
        enemies.splice(ei, 1);
        bullets.splice(bi, 1);
        sounds.explosion.play();
      }
    });
  });
}

// 그리기
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  enemies.forEach(e => ctx.drawImage(e.img, e.x, e.y, e.w, e.h));

  ctx.fillStyle = 'red';
  bullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));

  ctx.fillStyle = 'orange';
  enemyBullets.forEach(b => ctx.fillRect(b.x, b.y, b.w, b.h));
}

// 루프
function gameLoop(time) {
  if (!isGameRunning || isGamePaused) return;
  const delta = time - lastTime;
  lastTime = time;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}