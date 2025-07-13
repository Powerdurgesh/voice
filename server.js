io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  const filename = `recording-${Date.now()}.webm`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const writeStream = fs.createWriteStream(filepath, { flags: 'a' });

  socket.on('audio-chunk', (data) => {
    writeStream.write(Buffer.from(data));
  });

  socket.on('audio-end', () => {
    writeStream.end();
    console.log('Audio recording saved.');
  });

  socket.on('disconnect', () => {
    writeStream.end();
  });
});
