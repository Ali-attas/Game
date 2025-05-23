const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: "*", // السماح لجميع المصادر
    methods: ["GET", "POST"]
  }
});
const path = require('path');
const fs = require('fs');

// تقديم الملفات الثابتة
app.use(express.static(path.join(__dirname, 'public')));

// إعدادات العالم
const worldConfig = {
  width: 4000,
  height: 4000,
  gridSize: 40,
  spawnX: 2000,
  spawnY: 2000
};

const TILES_FILE = 'tiles.json';
let globalTiles = new Map();
let players = {};

// تحميل وحفظ المربعات
function loadTiles() {
  try {
    if (fs.existsSync(TILES_FILE)) {
      const data = fs.readFileSync(TILES_FILE, 'utf8');
      return new Map(JSON.parse(data));
    }
  } catch (err) {
    console.error('خطأ في تحميل المربعات:', err);
  }
  return new Map();
}

function saveTiles() {
  const tilesArray = Array.from(globalTiles.entries());
  fs.writeFileSync(TILES_FILE, JSON.stringify(tilesArray));
}

// أحداث Socket.io
io.on('connection', (socket) => {
  console.log('✅ لاعب متصل:', socket.id);

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
    tiles: Array.from(globalTiles.entries())
  });

  socket.on('update', (data) => {
    const player = players[socket.id];
    if (!player) return;

    player.x = data.x;
    player.y = data.y;

    const tileX = Math.floor(data.x / worldConfig.gridSize);
    const tileY = Math.floor(data.y / worldConfig.gridSize);
    const tileKey = `${tileX}:${tileY}`;

    globalTiles.set(tileKey, {
      playerId: socket.id,
      color: player.color
    });
  });

  socket.on('disconnect', () => {
    const playerId = socket.id;
    
    globalTiles.forEach((tile, key) => {
      if (tile.playerId === playerId) globalTiles.delete(key);
    });

    delete players[playerId];
    saveTiles();
    console.log('❌ لاعب مغادر:', playerId);
  });
});

// تحديث حالة اللعبة كل 50 مللي ثانية
setInterval(() => {
  io.emit('gameState', {
    players: JSON.parse(JSON.stringify(players)),
    tiles: Array.from(globalTiles.entries())
  });
}, 50);

// حفظ المربعات كل 30 ثانية
setInterval(saveTiles, 30000);

// تشغيل الخادم على المنفذ المحدد
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  globalTiles = loadTiles();
  console.log(`🚀 الخادم يعمل على المنفذ ${PORT}`);
});
