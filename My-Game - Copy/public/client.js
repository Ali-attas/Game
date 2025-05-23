const socket = io();
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const gridSize = 40;

let myId = null;
let gameState = {
  players: {},
  tiles: new Map()
};
let targetPos = { x: 0, y: 0 };
let smoothPlayers = {};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  targetPos = {
    x: e.clientX - rect.left + camera.x,
    y: e.clientY - rect.top + camera.y
  };
});

let camera = { x: 0, y: 0 };

socket.on('init', (data) => {
  myId = data.id;
  gameState.players = data.players;
  gameState.tiles = new Map(data.tiles);
  camera.x = data.players[myId].x - canvas.width/2;
  camera.y = data.players[myId].y - canvas.height/2;
});

socket.on('gameState', (newState) => {
  gameState.players = newState.players;
  gameState.tiles = new Map(newState.tiles);
  
  Object.keys(gameState.players).forEach(id => {
    if (!smoothPlayers[id]) smoothPlayers[id] = { ...gameState.players[id] };
  });
});

function update() {
  const me = gameState.players[myId];
  if (!me || !targetPos) return;

  const dx = targetPos.x - me.x;
  const dy = targetPos.y - me.y;
  const distance = Math.sqrt(dx*dx + dy*dy);
  
  if (distance > 5) {
    me.x += (dx / distance) * me.speed;
    me.y += (dy / distance) * me.speed;
    socket.emit('update', { x: me.x, y: me.y });
  }

  camera.x += (me.x - camera.x - canvas.width/2) * 0.1;
  camera.y += (me.y - camera.y - canvas.height/2) * 0.1;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  gameState.tiles.forEach((color, key) => {
    const [x, y] = key.split(':').map(Number);
    ctx.fillStyle = color;
    ctx.fillRect(
      x * gridSize - camera.x,
      y * gridSize - camera.y,
      gridSize,
      gridSize
    );
  });

  Object.values(gameState.players).forEach(player => {
    if (!smoothPlayers[player.id]) smoothPlayers[player.id] = { ...player };
    const sp = smoothPlayers[player.id];
    sp.x += (player.x - sp.x) * 0.2;
    sp.y += (player.y - sp.y) * 0.2;

    ctx.beginPath();
    ctx.arc(sp.x - camera.x, sp.y - camera.y, 20, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
  });
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();