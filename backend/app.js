const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const routes = require('./routes');
const errorHandler = require('./middleware/error.middleware');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { allowedOrigins, uploadDir } = require('./config/env');
const livekitService = require('./services/livekit.service');

const app = express();

// Required when behind ngrok/reverse proxy so rate-limit sees the real client IP.
app.set('trust proxy', 1);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Zemin-api', timestamp: new Date().toISOString() });
});

app.get('/health/livekit', async (req, res) => {
  if (!livekitService.isConfigured()) {
    return res.status(503).json({
      status: 'not_configured',
      message: 'Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in backend/.env',
    });
  }

  const result = await livekitService.verifyCredentials();
  if (result.ok) {
    return res.json({
      status: 'ok',
      url: livekitService.getPublicUrl(),
      message: 'LiveKit credentials are valid',
    });
  }

  return res.status(503).json({
    status: 'invalid_credentials',
    message:
      'LiveKit rejected the API key/secret. Generate a new key in LiveKit Cloud and update backend/.env.',
    reason: result.reason,
  });
});

app.use('/api/v1', apiLimiter, routes);
app.use(errorHandler);

module.exports = app;
