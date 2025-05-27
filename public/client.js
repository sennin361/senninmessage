const socket = io();

const loginDiv = document.getElementById('login');
const chatDiv = document.getElementById('chat');
const nicknameInput = document.getElementById('nicknameInput');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const roomTitle = document.getElementById('roomTitle');

const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const messagesDiv = document.getElementById('messages');
const imageInput = document.getElementById('imageInput');

let username = '';
let room = '';

joinBtn.addEventListener('click', () => {
  const nick = nicknameInput.value.trim();
  const roomName = roomInput.value.trim();

  if (!nick || !roomName) {
    alert('ニックネームとルーム名を入力してください。');
    return;
  }

  username = nick;
  room = roomName;

  socket.emit('joinRoom', { username, room }, (response) => {
    if (response.status === 'ok') {
      loginDiv.style.display = 'none';
      chatDiv.style.display = 'block';
      roomTitle.textContent = `仙人の集い: ${room}`;
      messageInput.placeholder = 'メッセージを入力してください...';
      messageInput.focus();
    } else {
      alert(response.message);
    }
  });
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (!messageInput.value && !imageInput.files.length) return;

  if (imageInput.files.length) {
    const file = imageInput.files[0];
    const reader = new FileReader();

    reader.onload = () => {
      socket.emit('chatMessage', {
        text: messageInput.value,
        image: reader.result
      });
      messageInput.value = '';
      imageInput.value = '';
    };

    reader.readAsDataURL(file);
  } else {
    socket.emit('chatMessage', {
      text: messageInput.value,
      image: null
    });
    messageInput.value = '';
  }
});

socket.on('message', ({ user, text, image }) => {
  const div = document.createElement('div');

  if (user === 'system') {
    div.className = 'message system';
    div.textContent = `[システム] ${text}`;
  } else {
    const isSelf = (user === username);
    div.className = 'message ' + (isSelf ? 'self' : 'other');

    if (image) {
      div.innerHTML = `<div class="user">${user}</div><img src="${image}" alt="送信画像" />${text ? `<div>${text}</div>` : ''}`;
    } else {
      div.innerHTML = `<div class="user">${user}</div>${text}`;
    }
  }

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
});
