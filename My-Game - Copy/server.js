const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const fs = require('fs');

app.use(express.static('public'));
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io/client-dist/'));

const worldConfig = {
  width: 4000,
  height: 4000,
  gridSize: 40,
  spawnX: 2000,
  spawnY: 2000
};

const TILES_FILE = 'tiles.json';
let globalTiles = new Map(); // { tileKey: { playerId: string, color: string } }
let players = {};

function loadTiles() {
  try {
    if (fs.existsSync(TILES_FILE)) {
      const data = fs.readFileSync(TILES_FILE, 'utf8');
      return new Map(JSON.parse(data).map(([key, tile]) => [key, tile]));
    }
  } catch (err) {
    console.error('Error loading tiles:', err);
  }
  return new Map();
}

function saveTiles() {
  const tilesArray = Array.from(globalTiles.entries());
  fs.writeFileSync(TILES_FILE, JSON.stringify(tilesArray));
}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  players[socket.id] = {
    x: worldConfig.spawnX,
    y: worldConfig.spawnY,
    id: socket.id,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    speed: 2.5
  };

  socket.emit('init', {
    id: socket.id,
    players: JSON.parse(JSON.stringify(players)),
    worldConfig,
    tiles: Array.from(globalTiles.entries()).map(([key, tile]) => [key, tile.color])
  });

  socket.on('update', (data) => {
    const player = players[socket.id];
    if (!player) return;

    player.x = data.x;
    player.y = data.y;

    const tileX = Math.floor(data.x / worldConfig.gridSize);
    const tileY = Math.floor(data.y / worldConfig.gridSize);
    const tileKey = `${tileX}:${tileY}`;

    // تحديث المربع بلون اللاعب الحالي
    globalTiles.set(tileKey, {
      playerId: socket.id,
      color: player.color
    });
  });

  socket.on('disconnect', () => {
    const playerId = socket.id;
    
    // إزالة جميع المربعات التي لونها هذا اللاعب
    globalTiles.forEach((tile, key) => {
      if (tile.playerId === playerId) {
        globalTiles.delete(key);
      }
    });

    delete players[playerId];
    saveTiles();
    console.log('❌ User disconnected:', playerId);
  });
});

setInterval(() => {
  const tilesToSend = Array.from(globalTiles.entries()).map(([key, tile]) => [key, tile.color]);
  io.emit('gameState', {
    players: JSON.parse(JSON.stringify(players)),
    tiles: tilesToSend
  });
}, 50);

setInterval(saveTiles, 30000);

server.listen(3000, () => {
  globalTiles = loadTiles();
  console.log('🚀 Server running on http://localhost:3000');
});

