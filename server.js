const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// 静的ファイルを public フォルダから配信
app.use(express.static(path.join(__dirname, 'public')));

// ルームごとの参加ユーザー管理
// 例: rooms = { roomName: { socketId: username, ... }, ... }
const rooms = {};

// socket.io 接続時処理
io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  // ルーム参加リクエスト
  socket.on('joinRoom', ({ username, room }, callback) => {
    if (!username || !room) {
      callback({ status: 'error', message: 'ニックネームとルーム名が必要です。' });
      return;
    }

    // ルームがなければ作成
    if (!rooms[room]) {
      rooms[room] = {};
    }

    // ニックネームが重複していないかチェック
    if (Object.values(rooms[room]).includes(username)) {
      callback({ status: 'error', message: 'そのニックネームはルーム内で既に使われています。' });
      return;
    }

    // ルームに参加
    socket.join(room);
    rooms[room][socket.id] = username;

    // 参加者へ通知
    socket.to(room).emit('message', {
      user: 'system',
      text: `${username} がルームに参加しました。`,
      image: null
    });

    // 自分にも参加成功メッセージ送る（任意）
    socket.emit('message', {
      user: 'system',
      text: `ようこそ、${username} さん。ルーム「${room}」へ参加しました。`,
      image: null
    });

    callback({ status: 'ok' });
  });

  // チャットメッセージ受信
  socket.on('chatMessage', ({ text, image }) => {
    // どのルームにいるか取得
    const userRooms = Object.keys(socket.rooms).filter(r => r !== socket.id);
    if (userRooms.length === 0) {
      // ルーム未参加なら無視
      return;
    }
    const room = userRooms[0];
    const username = rooms[room][socket.id];
    if (!username) return;

    // 送信者以外へメッセージ送信
    io.to(room).emit('message', {
      user: username,
      text: text || '',
      image: image || null
    });
  });

  // 切断時処理
  socket.on('disconnect', () => {
    // 所属ルームを探して退出処理
    for (const room in rooms) {
      if (rooms[room][socket.id]) {
        const username = rooms[room][socket.id];
        delete rooms[room][socket.id];

        // 退出通知
        socket.to(room).emit('message', {
          user: 'system',
          text: `${username} がルームを退出しました。`,
          image: null
        });

        // もしルームが空なら削除
        if (Object.keys(rooms[room]).length === 0) {
          delete rooms[room];
        }

        break;
      }
    }
    console.log('ユーザー切断:', socket.id);
  });
});

// サーバ起動
server.listen(PORT, () => {
  console.log(`サーバ起動: http://localhost:${PORT}`);
});
