const http = require('http');
const app = require('./app');
const { connectDB, connectAuthDB } = require('./config/database');
const { port } = require('./config/env');
const { initSocket } = require('./sockets');
const livekitService = require('./services/livekit.service');

const start = async () => {
  // Connect to both databases
  await connectDB();
  await connectAuthDB();

  if (livekitService.isConfigured()) {
    const livekitStatus = await livekitService.initialize();
    if (livekitStatus.ok) {
      console.log('[LiveKit] Credentials verified');
    } else {
      console.error(
        `[LiveKit] Credential check failed: ${livekitStatus.reason}. ` +
          'Generate a fresh API key in LiveKit Cloud and update LIVEKIT_API_KEY / LIVEKIT_API_SECRET in backend/.env, then restart the server.'
      );
    }
  } else {
    console.warn('[LiveKit] Not configured — live streams will use local camera preview only');
  }

  const server = http.createServer(app);
  initSocket(server);

  server.listen(port, () => {
    console.log(`Zemin API running on http://localhost:${port}`);
    console.log(`Health: http://localhost:${port}/health`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
