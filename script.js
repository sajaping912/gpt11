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
let showTranslation = false; // For full sentence translation BELOW sentence
let isActionLocked = false;

// For word touch interaction and translation
let centerSentenceWordRects = [];
let activeWordTranslation = null; // Stores { word, translation, x, y, w, h, lineIndex, show }
let wordTranslationTimeoutId = null;
const WORD_TRANSLATION_DURATION = 3000; // ms

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

async function getWordTranslation(word, targetLang = 'ko') {
  const cleanedWord = word.replace(/[^a-zA-Z']/g, "").toLowerCase().trim();
  if (!cleanedWord) return "Error: Invalid word";

  /*
    IMPORTANT: This is a MOCK translation function for demonstration.
    To use a real translation service (Google Translate, DeepL, etc.):
    1. Sign up for the API and get an API key from the service provider.
    2. Replace the mock logic below with an actual `fetch` call to the translation API.
       Example (conceptual for Google Translate API - requires proper setup and billing):
       --------------------------------------------------------------------
       const apiKey = 'YOUR_GOOGLE_CLOUD_API_KEY'; // Keep API keys secure, do not hardcode directly if deploying
       const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
       try {
         const response = await fetch(url, {
           method: 'POST',
           body: JSON.stringify({
             q: cleanedWord,
             target: targetLang, // e.g., 'ko'
             format: 'text'
           }),
           headers: {
             'Content-Type': 'application/json'
           }
         });
         if (!response.ok) {
           const errorData = await response.json();
           console.error('API Error:', errorData);
           throw new Error(`API error: ${response.status}`);
         }
         const data = await response.json();
         if (data.data && data.data.translations && data.data.translations.length > 0) {
           return data.data.translations[0].translatedText;
         } else {
           console.warn('No translation found for:', cleanedWord, data);
           return `[${cleanedWord} 뜻 없음]`;
         }
       } catch (error) {
         console.error('Error fetching translation:', error);
         return `[${cleanedWord} 번역 실패]`;
       }
       --------------------------------------------------------------------
    3. Be mindful of API usage quotas, costs, and terms of service.
    4. Handle network errors and API errors gracefully in a production application.
    The mock logic below provides some basic translations for common words in the sample sentences.
  */

  // Simulate network delay for mock
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

  const mockTranslations = {
      "when": "언제", "will": "~할 것이다", "you": "너는", "arrive": "도착하다", "at": "~에", "the": "그", "station": "역",
      "i": "나는", "can’t": "~할 수 없다", "believe": "믿다", "how": "얼마나", "fast": "빨리", "time": "시간", "goes": "가다", "by": "지나가다",
      "what": "무엇", "are": "~이다", "doing": "하고 있는", "right": "바로", "now": "지금",
      "could": "~할 수 있을까", "help": "돕다", "me": "나를", "carry": "옮기다", "these": "이것들", "groceries": "식료품", "inside": "안으로",
      "have": "가지다", "been": "~해오고 있다", "waiting": "기다리는 중", "for": "~를 위해", "since": "~부터", "morning": "아침",
      "she": "그녀는", "is": "~이다", "reading": "읽고 있는", "a": "하나의", "book": "책",
      "they": "그들은", "working": "일하는 중", "all": "모든", "day": "하루", "종일": "하루 종일",
      "let’s": "~하자", "grab": "잡다", "coffee": "커피", "and": "그리고", "talk": "이야기하다", "while": "동안",
      "do": "하다", "any": "어떤", "plans": "계획들", "this": "이", "evening": "저녁",
      "it’s": "~이다", "long": "긴", "office": "사무실",
      "looking": "기대하는", "forward": "앞으로", "to": "~로", "our": "우리의", "trip": "여행", "next": "다음", "month": "달",
      "can": "~할 수 있다", "recommend": "추천하다", "good": "좋은", "place": "장소", "eat": "먹다"
  };

  if (mockTranslations[cleanedWord]) {
    return mockTranslations[cleanedWord];
  }
  // For compound words or very specific forms, the simple mock might not have them.
  // A real API would handle variations better.
  return `[${cleanedWord} 뜻]`; // Default placeholder if not in mock
}


async function speakWord(word) {
  const cleanWord = word.replace(/[^a-zA-Z']/g, "").trim();
  if (!cleanWord) return;

  let voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    await new Promise(resolve => {
      window.speechSynthesis.onvoiceschanged = resolve;
      window.speechSynthesis.getVoices(); // Some browsers require this to populate voices
    });
    voices = window.speechSynthesis.getVoices();
  }

  return new Promise(async resolve => {
    const utter = new window.SpeechSynthesisUtterance(cleanWord);
    utter.lang = 'en-US';
    utter.rate = 0.95;
    utter.pitch = 1.0;

    const voice = await getVoice('en-US', 'female'); // Use consistent voice for words
    if (voice) utter.voice = voice;

    utter.onend = resolve;
    utter.onerror = (event) => { console.error('SpeechSynthesisUtterance.onerror for word:', event); resolve(); };
    window.speechSynthesis.speak(utter);
  });
}

const englishFont = "23.52px Arial"; // Defined once for consistency

function drawCenterSentence() {
  if (!centerSentence) {
    centerSentenceWordRects = [];
    return;
  }
  centerSentenceWordRects = []; // Recalculate on each draw

  ctx.save();
  ctx.globalAlpha = centerAlpha;
  // englishFont is defined globally now
  ctx.font = englishFont;
  ctx.textAlign = "left"; // Words are placed individually
  ctx.textBaseline = "middle"; // Vertically align text to its middle

  let lines = [centerSentence.line1, centerSentence.line2];
  let lineHeight = 30; // Based on original text display
  let englishBlockHeight = lines.filter(l => l.trim()).length * lineHeight;
  let yBaseEnglishFirstLine = canvas.height / 2 - englishBlockHeight / 2; // This should be middle of first line

  const translationFont = "18.9px Arial"; // For full sentence translation

  // Play Button positioning (remains the same)
  const playSize = 36 * 0.49;
  const btnPad = 18 * 0.49;
  const btnH = playSize + btnPad * 2;
  const btnW = playSize + btnPad * 2;
  const englishBlockCenterY = yBaseEnglishFirstLine + englishBlockHeight / 2 - lineHeight/2 ;//canvas.height / 2;
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
  ctx.font = englishFont; // Ensure it's set before measureText
  ctx.textBaseline = "middle"; // Crucial for y-coordinate meaning center
  let verbColored = false;
  const currentSentenceFullText = (centerSentence.line1 + " " + centerSentence.line2).trim();
  const isQ = isQuestion(currentSentenceFullText);
  const wordHeight = parseFloat(englishFont.match(/(\d*\.?\d*)px/)[1]);


  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    if (!lineText.trim()) continue;

    const words = lineText.split(" ");
    let wordMetrics = words.map(w => ctx.measureText(w));
    let spaceWidth = ctx.measureText(" ").width;
    let totalWidth = wordMetrics.reduce((sum, m) => sum + m.width, 0) + spaceWidth * (words.length - 1);

    let currentX = (canvas.width - totalWidth) / 2;
    // Adjust currentY to be the middle of the text line
    let currentY = yBaseEnglishFirstLine + i * lineHeight + lineHeight/2;


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

      const measuredWidth = wordMetrics[j].width;
      centerSentenceWordRects.push({
        word: rawWord,
        x: currentX,
        y: currentY, // This is the vertical middle of the word
        w: measuredWidth,
        h: wordHeight, // Approximate height from font size
        lineIndex: i // 0 for first line, 1 for second line
      });
      currentX += measuredWidth + spaceWidth;
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
    const lastEnglishLineY = yBaseEnglishFirstLine + (lines.filter(l=>l.trim()).length - 1) * lineHeight + lineHeight/2;
    const translationTextHeight = parseFloat(translationFont.match(/(\d*\.?\d*)px/)[1]);
    const translationBelowY = lastEnglishLineY + lineHeight/2 + 10 + translationTextHeight / 2;
    ctx.fillText(
      translations[centerSentenceIndex],
      canvas.width / 2,
      translationBelowY
    );
    ctx.restore();
  }

  // Draw active word translation
  if (activeWordTranslation && activeWordTranslation.show) {
      ctx.save();
      const wordTransFontFamily = "'Malgun Gothic', 'Nanum Gothic', Arial, sans-serif";
      const wordTransFontSize = 16; // px
      ctx.font = `${wordTransFontSize}px ${wordTransFontFamily}`;
      ctx.textAlign = "center";
      // textBaseline will be set based on position
      ctx.fillStyle = "#98FB98"; // PaleGreen
      ctx.shadowColor = "rgba(0,0,0,0.6)";
      ctx.shadowBlur = 2;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;

      const englishWordMiddleY = activeWordTranslation.y;
      const englishWordHalfHeight = activeWordTranslation.h / 2;
      const padding = 6; // Padding between word and its translation

      let tx = activeWordTranslation.x + activeWordTranslation.w / 2; // Center of the English word
      let ty;

      if (activeWordTranslation.lineIndex === 0) { // Word in the first line, translation above
          ctx.textBaseline = "bottom"; // Anchor translation by its bottom edge
          ty = englishWordMiddleY - englishWordHalfHeight - padding;
      } else { // Word in the second line, translation below
          ctx.textBaseline = "top"; // Anchor translation by its top edge
          ty = englishWordMiddleY + englishWordHalfHeight + padding;
      }

      ctx.fillText(activeWordTranslation.translation, tx, ty);
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
  // Clear any word translation when fireworks start
  if (activeWordTranslation) activeWordTranslation.show = false;
  if (wordTranslationTimeoutId) clearTimeout(wordTranslationTimeoutId);
  activeWordTranslation = null;

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
      centerSentenceIndex = (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1); // Index of the sentence NOW being shown
      centerAlpha = 1.0;
      fireworks = null;
      fireworksState = null;
      sentenceActive = false;
      showPlayButton = true;
      showTranslation = false; // Hide full sentence translation initially
      
      // Clear any word translation from previous sentence/interaction
      if (activeWordTranslation) activeWordTranslation.show = false; // Visually hide
      activeWordTranslation = null; // Clear data
      if (wordTranslationTimeoutId) {
        clearTimeout(wordTranslationTimeoutId);
        wordTranslationTimeoutId = null;
      }
      centerSentenceWordRects = []; // Reset word rects for the new sentence

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
      ? v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('susan') || v.name.toLowerCase().includes('samantha') || v.name.toLowerCase().includes('zira')
      : v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('man') || v.name.toLowerCase().includes('tom') || v.name.toLowerCase().includes('daniel') || v.name.toLowerCase().includes('david'))
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
    const voice = await getVoice('en-US', gender);
    if (voice) utter.voice = voice;
    else console.warn("speakSentence: Voice not set for", text, gender, "using default.");
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
    if (activeWordTranslation) activeWordTranslation.show = false;
    isActionLocked = false;
    centerSentenceWordRects = [];
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);

  enemies.forEach(e => {
    if (e.imgIndex === 1) { // Coffee cup enemy
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

function resetGameStateForStartStop() {
    bullets = []; enemies = []; enemyBullets = [];
    fireworks = null; fireworksState = null;
    centerSentence = null; centerSentenceIndex = null;
    sentenceActive = false; centerAlpha = 1.0;
    showPlayButton = false; playButtonRect = null;
    showTranslation = false; // For full sentence translation
    
    // Clear word translation state
    if (activeWordTranslation) activeWordTranslation.show = false;
    activeWordTranslation = null;
    if (wordTranslationTimeoutId) {
        clearTimeout(wordTranslationTimeoutId);
        wordTranslationTimeoutId = null;
    }
    centerSentenceWordRects = [];
    isActionLocked = false;
}


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
  bgmIndex = 0; // Reset BGM to first track
  bgmAudio = new Audio(bgmFiles[bgmIndex]);
  bgmAudio.volume = isMuted ? 0 : 0.05;
  bgmAudio.loop = false;
  bgmAudio.addEventListener('ended', playNextBgm);
  bgmAudio.play().catch(e => console.error("BGM play error on start:", e));

  if (coffeeSteamVideo && coffeeVideoAssetReady) {
    coffeeSteamVideo.currentTime = 0;
    const playPromise = coffeeSteamVideo.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {}).catch(error => {
        console.error("Error attempting to play coffee steam video on start:", error);
      });
    }
  }

  resetGameStateForStartStop();

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
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    // Optionally hide word translation on pause, or let it persist
    // if (activeWordTranslation) activeWordTranslation.show = false; 
    // if (wordTranslationTimeoutId) clearTimeout(wordTranslationTimeoutId);
  } else {
    bgmAudio.play().catch(e => console.error("BGM resume error:", e));
    if (coffeeSteamVideo && coffeeSteamVideo.paused && coffeeVideoAssetReady) {
        const playPromise = coffeeSteamVideo.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {}).catch(error => console.error("Error resuming coffee steam video:", error));
        }
    }
    lastTime = performance.now(); // Reset time for smooth animation
    requestAnimationFrame(gameLoop);
  }
}

function stopGame() {
  isGameRunning = false; isGamePaused = false;
  bgmAudio.pause();
  if (coffeeSteamVideo && !coffeeSteamVideo.paused) coffeeSteamVideo.pause();
  window.speechSynthesis.cancel();

  resetGameStateForStartStop();
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas
}

const expandedMargin = 10; // For easier touch on buttons

function handleCanvasInteraction(clientX, clientY, event) {
  if (!isGameRunning || isGamePaused) return;
  if (isActionLocked) return;

  // 1. Check Play Button for full sentence
  const isPlayBtnTouched = showPlayButton && playButtonRect &&
    clientX >= (playButtonRect.x - expandedMargin) &&
    clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
    clientY >= (playButtonRect.y - expandedMargin) &&
    clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin);

  if (isPlayBtnTouched) {
    showTranslation = true; // Show full sentence Korean translation
    
    // Hide any active word translation
    if (activeWordTranslation) activeWordTranslation.show = false;
    if (wordTranslationTimeoutId) clearTimeout(wordTranslationTimeoutId);
    activeWordTranslation = null;
    
    isActionLocked = true;
    let idx = centerSentenceIndex !== null ? centerSentenceIndex : (sentenceIndex === 0 ? sentences.length - 1 : sentenceIndex - 1);
    window.speechSynthesis.cancel(); // Cancel any ongoing speech (e.g., word)
    speakSentence(sentences[idx], 'female').then(() => {
      setTimeout(() => {
        speakSentence(sentences[idx], 'male');
      }, 800);
    });
    event.preventDefault();
    setTimeout(() => { isActionLocked = false; }, 200); // Short lock
    return;
  }

  // 2. Check Word Touch for individual word speech and translation
  if (centerSentence && showPlayButton && centerSentenceWordRects.length > 0) {
    for (const wordRect of centerSentenceWordRects) {
      // Check if touch is within the word's bounding box (y is middle, h is full height)
      if (
        clientX >= wordRect.x && clientX <= wordRect.x + wordRect.w &&
        clientY >= wordRect.y - wordRect.h / 2 && clientY <= wordRect.y + wordRect.h / 2
      ) {
        window.speechSynthesis.cancel(); // Stop any other TTS
        speakWord(wordRect.word); // Speak the English word

        // Clear previous word translation timeout and visual
        if (wordTranslationTimeoutId) clearTimeout(wordTranslationTimeoutId);
        if (activeWordTranslation) activeWordTranslation.show = false; // Hide previous immediately
        activeWordTranslation = null; 

        // Get and display Korean translation for the touched word
        getWordTranslation(wordRect.word).then(translation => {
            activeWordTranslation = {
                word: wordRect.word, // Original English word
                translation: translation, // Fetched Korean translation
                x: wordRect.x,    // Position and size of English word
                y: wordRect.y,
                w: wordRect.w,
                h: wordRect.h,
                lineIndex: wordRect.lineIndex, // 0 for top line, 1 for bottom
                show: true // Flag to display it
            };
            // Set a timer to hide this word's translation
            wordTranslationTimeoutId = setTimeout(() => {
                // Only hide if it's still the currently active translation
                if (activeWordTranslation && activeWordTranslation.word === wordRect.word) { 
                    activeWordTranslation.show = false;
                }
            }, WORD_TRANSLATION_DURATION);
        }).catch(err => {
            console.error("Error getting word translation:", err);
            // Optionally, display a brief error message to the user on canvas
        });
        
        showTranslation = false; // Hide full sentence translation if it was shown

        isActionLocked = true;
        event.preventDefault();
        setTimeout(() => { isActionLocked = false; }, 200); // Short lock
        return; // Word processed, no further action
      }
    }
  }

  // 3. Player Movement and Shooting (if no UI element above was hit)
  // Hide any active word translation if user clicks/touches to move/shoot
  if (activeWordTranslation && activeWordTranslation.show) {
    activeWordTranslation.show = false;
    if (wordTranslationTimeoutId) {
        clearTimeout(wordTranslationTimeoutId);
        wordTranslationTimeoutId = null;
    }
  }
  showTranslation = false; // Also hide full sentence translation

  player.x = clientX - player.w / 2;
  player.y = clientY - player.h / 2;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  bullets.push({ x: player.x + player.w / 2 - 2.5, y: player.y, w: 5, h: 10, speed: 2.1 });
  sounds.shoot.play();
  
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
  if (isActionLocked) return; // Don't move player if an action is locked (e.g. TTS)
  
  const touch = e.touches[0];

  // Check if move is over play button or words - if so, don't move player, let touchstart handle it if finger lifts.
  // This prevents player movement when intending to interact with static UI elements via drag-then-lift.
  if (showPlayButton && playButtonRect &&
      touch.clientX >= (playButtonRect.x - expandedMargin) &&
      touch.clientX <= (playButtonRect.x + playButtonRect.w + expandedMargin) &&
      touch.clientY >= (playButtonRect.y - expandedMargin) &&
      touch.clientY <= (playButtonRect.y + playButtonRect.h + expandedMargin)) {
    // e.preventDefault(); // Still prevent default scroll/zoom
    return; // Finger is over the play button
  }

  if (centerSentence && showPlayButton && centerSentenceWordRects.length > 0) {
    for (const wordRect of centerSentenceWordRects) {
      if (
        touch.clientX >= wordRect.x && touch.clientX <= wordRect.x + wordRect.w &&
        touch.clientY >= wordRect.y - wordRect.h/2 && touch.clientY <= wordRect.y + wordRect.h/2
      ) {
        // e.preventDefault();
        return; // Finger is over a word
      }
    }
  }

  // If dragging started outside interactive elements, or moved away from them, update player
  player.x = touch.clientX - player.w / 2;
  player.y = touch.clientY - player.h / 2;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('mousemove', e => {
  if (!isGameRunning || isGamePaused) return;
  // For mouse, action lock isn't as critical for movement, but good for consistency
  if (isActionLocked && (e.buttons !== 1) ) return; // Allow move if mouse button isn't pressed during lock

  // Check if mouse is hovering over interactive elements; if so, don't move player
  // (unless mouse button is pressed, which would be handled by mousedown/handleCanvasInteraction for shooting)
  if (e.buttons !== 1) { // Only prevent player move on hover if not dragging/shooting
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
  }
  // If not hovering over UI or if mouse button is pressed (implying drag/shoot intention)
  player.x = e.clientX - player.w / 2;
  player.y = e.clientY - player.h / 2;
  player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));
});