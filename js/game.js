// ============================================================
// 打砖块游戏 (Breakout Game)
// 纯JavaScript + HTML5 Canvas 实现
// ============================================================

// ========== 常量定义 ==========
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CANVAS_BACKGROUND = '#1a1a2e';

// 砖块常量
const BRICK_ROWS = 8;
const BRICK_COLS = 10;
const BRICK_WIDTH = 65;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 50;
const BRICK_TOTAL_WIDTH = BRICK_COLS * BRICK_WIDTH + (BRICK_COLS - 1) * BRICK_PADDING;
const BRICK_OFFSET_LEFT = (CANVAS_WIDTH - BRICK_TOTAL_WIDTH) / 2;
const BRICK_COLORS = ['#FF6B6B', '#FF6B6B', '#FFA502', '#FFA502', '#2ED573', '#2ED573', '#1E90FF', '#1E90FF'];

// 挡板常量
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 15;
const PADDLE_SPEED = 8;
const PADDLE_Y = CANVAS_HEIGHT - 40;

// 球常量
const BALL_RADIUS = 5;
const BALL_INITIAL_SPEED = 4;

// 游戏常量
const INITIAL_LIVES = 3;
const POINTS_PER_BRICK = 10;
const MAX_SCORE = BRICK_ROWS * BRICK_COLS * POINTS_PER_BRICK;
const RESPAWN_DELAY_MS = 1000;

// 游戏状态枚举
const GAME_STATE = Object.freeze({
  INITIAL: 'initial',
  PLAYING: 'playing',
  WIN: 'win',
  GAME_OVER: 'game_over'
});

// ========== 游戏状态变量 ==========
let canvas, ctx;
let currentState = GAME_STATE.INITIAL;
let score = 0;
let lives = INITIAL_LIVES;

// 挡板状态
let paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
let isPaddleMovingLeft = false;
let isPaddleMovingRight = false;

// 球状态
let ballX = CANVAS_WIDTH / 2;
let ballY = PADDLE_Y - BALL_RADIUS;
let ballVelocityX = 0;
let ballVelocityY = 0;
let isBallAttached = true;

// 砖块数组
let bricks = [];

// 按键状态
let pressedKeys = {};

// 动画帧ID和暂停标志
let animationFrameId = null;
let isRespawning = false;

// ========== 初始化函数 ==========
function init() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  initBricks();
  setupEventListeners();
  gameLoop();
}

// ========== 砖块初始化 ==========
function initBricks() {
  bricks = [];
  for (let row = 0; row < BRICK_ROWS; row++) {
    bricks[row] = [];
    for (let col = 0; col < BRICK_COLS; col++) {
      bricks[row][col] = {
        x: col * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT,
        y: row * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP,
        color: BRICK_COLORS[row],
        active: true
      };
    }
  }
}

// ========== 事件监听 ==========
function setupEventListeners() {
  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleClick);
}

function handleKeyDown(event) {
  pressedKeys[event.key] = true;
  
  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    if (currentState === GAME_STATE.INITIAL) {
      startGame();
    } else if (currentState === GAME_STATE.PLAYING && isBallAttached) {
      launchBall();
    }
  }
  
  if (event.key === 'r' || event.key === 'R') {
    if (currentState === GAME_STATE.WIN || currentState === GAME_STATE.GAME_OVER) {
      restartGame();
    }
  }
}

function handleKeyUp(event) {
  pressedKeys[event.key] = false;
}

function handleMouseMove(event) {
  if (currentState !== GAME_STATE.PLAYING && currentState !== GAME_STATE.INITIAL) return;
  
  const canvasRect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - canvasRect.left;
  const canvasX = mouseX * (CANVAS_WIDTH / canvasRect.width);
  
  paddleX = canvasX - PADDLE_WIDTH / 2;
  paddleX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, paddleX));
  
  if (isBallAttached) {
    ballX = paddleX + PADDLE_WIDTH / 2;
  }
}

function handleClick() {
  if (currentState === GAME_STATE.INITIAL) {
    startGame();
  } else if (currentState === GAME_STATE.PLAYING && isBallAttached) {
    launchBall();
  }
}

// ========== 游戏控制 ==========
function startGame() {
  currentState = GAME_STATE.PLAYING;
  resetBall();
}

function resetBall() {
  isBallAttached = true;
  ballX = paddleX + PADDLE_WIDTH / 2;
  ballY = PADDLE_Y - BALL_RADIUS;
  ballVelocityX = 0;
  ballVelocityY = 0;
}

function launchBall() {
  if (!isBallAttached) return;
  
  isBallAttached = false;
  const launchAngle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI / 3);
  ballVelocityX = BALL_INITIAL_SPEED * Math.cos(launchAngle);
  ballVelocityY = BALL_INITIAL_SPEED * Math.sin(launchAngle);
}

function restartGame() {
  score = 0;
  lives = INITIAL_LIVES;
  paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
  currentState = GAME_STATE.INITIAL;
  isRespawning = false;
  initBricks();
  resetBall();
}

// ========== 游戏循环 ==========
function gameLoop() {
  update();
  draw();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// ========== 更新逻辑 ==========
function update() {
  if (currentState !== GAME_STATE.PLAYING || isRespawning) return;
  
  updatePaddle();
  
  if (isBallAttached) {
    ballX = paddleX + PADDLE_WIDTH / 2;
    return;
  }
  
  moveBall();
  checkWallCollisions();
  checkPaddleCollision();
  checkBrickCollisions();
  checkWinCondition();
}

function updatePaddle() {
  if (pressedKeys['ArrowLeft'] || pressedKeys['a'] || pressedKeys['A']) {
    paddleX -= PADDLE_SPEED;
    if (paddleX < 0) paddleX = 0;
  }
  if (pressedKeys['ArrowRight'] || pressedKeys['d'] || pressedKeys['D']) {
    paddleX += PADDLE_SPEED;
    if (paddleX + PADDLE_WIDTH > CANVAS_WIDTH) {
      paddleX = CANVAS_WIDTH - PADDLE_WIDTH;
    }
  }
}

function moveBall() {
  ballX += ballVelocityX;
  ballY += ballVelocityY;
}

function checkWallCollisions() {
  // 左墙
  if (ballX - BALL_RADIUS < 0) {
    ballX = BALL_RADIUS;
    ballVelocityX = Math.abs(ballVelocityX);
  }
  // 右墙
  if (ballX + BALL_RADIUS > CANVAS_WIDTH) {
    ballX = CANVAS_WIDTH - BALL_RADIUS;
    ballVelocityX = -Math.abs(ballVelocityX);
  }
  // 上墙
  if (ballY - BALL_RADIUS < 0) {
    ballY = BALL_RADIUS;
    ballVelocityY = Math.abs(ballVelocityY);
  }
  // 底部 - 球掉落
  if (ballY - BALL_RADIUS > CANVAS_HEIGHT) {
    handleBallLost();
  }
}

function handleBallLost() {
  lives--;
  if (lives <= 0) {
    currentState = GAME_STATE.GAME_OVER;
  } else {
    isRespawning = true;
    setTimeout(() => {
      isRespawning = false;
      resetBall();
    }, RESPAWN_DELAY_MS);
  }
}

function checkPaddleCollision() {
  if (ballVelocityY <= 0) return;
  
  const paddleLeft = paddleX;
  const paddleRight = paddleX + PADDLE_WIDTH;
  const paddleTop = PADDLE_Y;
  const paddleBottom = PADDLE_Y + PADDLE_HEIGHT;
  
  if (
    ballX + BALL_RADIUS > paddleLeft &&
    ballX - BALL_RADIUS < paddleRight &&
    ballY + BALL_RADIUS >= paddleTop &&
    ballY - BALL_RADIUS <= paddleBottom
  ) {
    // 计算击中位置 (-1 到 1)
    const hitPosition = (ballX - (paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
    
    // 计算反射角度 (-60度 到 +60度)
    const maxAngle = Math.PI / 3;
    const reflectionAngle = hitPosition * maxAngle;
    
    // 保持球速恒定
    ballVelocityX = BALL_INITIAL_SPEED * Math.sin(reflectionAngle);
    ballVelocityY = -BALL_INITIAL_SPEED * Math.cos(reflectionAngle);
    
    // 防止球陷入挡板
    ballY = paddleTop - BALL_RADIUS;
  }
}

function checkBrickCollisions() {
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const brick = bricks[row][col];
      if (!brick.active) continue;
      
      if (isBallCollidingWithBrick(brick)) {
        brick.active = false;
        score += POINTS_PER_BRICK;
        reflectBallFromBrick(brick);
        return; // 每帧只处理一次碰撞
      }
    }
  }
}

function isBallCollidingWithBrick(brick) {
  const brickLeft = brick.x;
  const brickRight = brick.x + BRICK_WIDTH;
  const brickTop = brick.y;
  const brickBottom = brick.y + BRICK_HEIGHT;
  
  return (
    ballX + BALL_RADIUS > brickLeft &&
    ballX - BALL_RADIUS < brickRight &&
    ballY + BALL_RADIUS > brickTop &&
    ballY - BALL_RADIUS < brickBottom
  );
}

function reflectBallFromBrick(brick) {
  const brickCenterX = brick.x + BRICK_WIDTH / 2;
  const brickCenterY = brick.y + BRICK_HEIGHT / 2;
  
  const overlapX = (BRICK_WIDTH / 2 + BALL_RADIUS) - Math.abs(ballX - brickCenterX);
  const overlapY = (BRICK_HEIGHT / 2 + BALL_RADIUS) - Math.abs(ballY - brickCenterY);
  
  if (overlapX < overlapY) {
    ballVelocityX = -ballVelocityX;
  } else {
    ballVelocityY = -ballVelocityY;
  }
}

function checkWinCondition() {
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      if (bricks[row][col].active) return;
    }
  }
  currentState = GAME_STATE.WIN;
}

// ========== 渲染逻辑 ==========
function draw() {
  clearCanvas();
  drawBricks();
  drawPaddle();
  drawBall();
  drawUI();
  drawOverlay();
}

function clearCanvas() {
  ctx.fillStyle = CANVAS_BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawBricks() {
  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const brick = bricks[row][col];
      if (!brick.active) continue;
      
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT);
    }
  }
}

function drawPaddle() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(paddleX, PADDLE_Y, PADDLE_WIDTH, PADDLE_HEIGHT);
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.closePath();
}

function drawUI() {
  ctx.fillStyle = '#ffffff';
  ctx.font = '18px Arial';
  ctx.textAlign = 'left';
  ctx.fillText(`得分: ${score}`, 10, 25);
  ctx.textAlign = 'right';
  ctx.fillText(`生命: ${lives}`, CANVAS_WIDTH - 10, 25);
}

function drawOverlay() {
  if (currentState === GAME_STATE.INITIAL) {
    drawSemiTransparentOverlay();
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('按空格键开始游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  } else if (currentState === GAME_STATE.WIN) {
    drawSemiTransparentOverlay();
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`恭喜通关! 得分: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText('按 R 键重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  } else if (currentState === GAME_STATE.GAME_OVER) {
    drawSemiTransparentOverlay();
    ctx.fillStyle = '#ffffff';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText(`得分: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    ctx.fillText('按 R 键重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
  }
}

function drawSemiTransparentOverlay() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

// ========== 启动游戏 ==========
window.addEventListener('load', init);