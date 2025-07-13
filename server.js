const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

const app = express();
const server = http.createServer(app);
const io = socketIO(server); // ✅ THIS must be defined BEFORE using io

const adminSockets = new Set(); // ✅ Declare adminSockets here

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

/* ✅ WebSocket Connection Logic STARTS Here */
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Admin registration
  socket.on('register-admin', () => {
    adminSockets.add(socket);
    console.log('Admin registered:', socket.id);
    socket.on('disconnect', () => {
      adminSockets.delete(socket);
    });
  });

  const filename = `recording-${Date.now()}.webm`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const writeStream = fs.createWriteStream(filepath, { flags: 'a' });

  socket.on('audio-chunk', (data) => {
    writeStream.write(Buffer.from(data));
    // Send to admins
    adminSockets.forEach(adminSocket => {
      if (adminSocket.connected) {
        adminSocket.emit('live-audio', data);
      }
    });
  });

  socket.on('audio-end', () => {
    writeStream.end();
    console.log('Audio recording saved.');
  });

  socket.on('disconnect', () => {
    writeStream.end();
  });
});
