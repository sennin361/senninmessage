const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 静的ファイルをpublicフォルダから配信
app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  socket.on('joinRoom', ({ username, room }, callback) => {
    if (!username || !room) {
      callback({ status: 'error', message: 'ニックネームとルーム名が必要です。' });
      return;
    }

    if (!rooms[room]) {
      rooms[room] = {};
    }

    if (Object.values(rooms[room]).includes(username)) {
      callback({ status: 'error', message: 'そのニックネームはルーム内で既に使われています。' });
      return;
    }

    socket.join(room);
    rooms[room][socket.id] = username;

    socket.to(room).emit('message', {
      user: 'system',
      text: `${username} がルームに参加しました。`,
      image: null
    });

    socket.emit('message', {
      user: 'system',
      text: `ようこそ、${username} さん。ルーム「${room}」へ参加しました。`,
      image: null
    });

    callback({ status: 'ok' });
  });

  socket.on('chatMessage', ({ text, image }) => {
    const userRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    if (userRooms.length === 0) return;
    const room = userRooms[0];
    const username = rooms[room][socket.id];
    if (!username) return;

    io.to(room).emit('message', {
      user: username,
      text: text || '',
      image: image || null
    });
  });

  socket.on('disconnect', () => {
    for (const room in rooms) {
      if (rooms[room][socket.id]) {
        const username = rooms[room][socket.id];
        delete rooms[room][socket.id];

        socket.to(room).emit('message', {
          user: 'system',
          text: `${username} がルームを退出しました。`,
          image: null
        });

        if (Object.keys(rooms[room]).length === 0) {
          delete rooms[room];
        }
        break;
      }
    }
    console.log('ユーザー切断:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`サーバ起動: http://localhost:${PORT}`);
});
