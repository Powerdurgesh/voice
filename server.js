try {
  const express = require('express');
  const http = require('http');
  const socketIO = require('socket.io');
  const fs = require('fs');
  const path = require('path');
  const nodemailer = require('nodemailer');
  const cron = require('node-cron');

  const app = express();
  const server = http.createServer(app);
  const io = socketIO(server);
  const adminSockets = new Set();

  const UPLOAD_DIR = path.join(__dirname, 'uploads');
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

  app.use(express.static('public'));
  app.use('/uploads', express.static(UPLOAD_DIR));

  io.on('connection', socket => {
    console.log('Client connected:', socket.id);

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

  app.get('/list-recordings', (req, res) => {
    fs.readdir(UPLOAD_DIR, (err, files) => {
      if (err) return res.status(500).send('Error');
      const webmFiles = files.filter(f => f.endsWith('.webm'));
      res.json(webmFiles);
    });
  });

  // Send emails every hour
  cron.schedule('0 * * * *', () => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'chintalapowerdurgesh2003@gmail.com',
        pass: 'twlk csog qvgd qqoc'
      }
    });

    fs.readdir(UPLOAD_DIR, (err, files) => {
      if (err || files.length === 0) return;

      const attachments = files.filter(f => f.endsWith('.webm')).map(f => ({
        filename: f,
        path: path.join(UPLOAD_DIR, f)
      }));

      if (attachments.length === 0) return;

      const mailOptions = {
        from: 'Voice System <chintalapowerdurgesh2003@gmail.com>',
        to: 'chintalapowerdurgesh2003@gmail.com',
        subject: 'Hourly Voice Recordings',
        text: 'Attached are the audio recordings from the past hour.',
        attachments
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('Email failed:', err);
        else console.log('Email sent:', info.response);
      });
    });
  });

  app.get('/', (req, res) => {
    res.redirect('/client.html');
  });

  const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

} catch (err) {
  console.error('💥 Server crashed:', err);
}
