const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

class LiveKitService {
  constructor() {
    this.credentialsVerified = null;
  }

  getApiKey() {
    return (process.env.LIVEKIT_API_KEY || '').trim();
  }

  getApiSecret() {
    return (process.env.LIVEKIT_API_SECRET || '').trim();
  }

  isConfigured() {
    const apiKey = this.getApiKey();
    const apiSecret = this.getApiSecret();
    const url = (process.env.LIVEKIT_URL || '').trim();
    const configured = Boolean(apiKey && apiSecret && url);
    if (configured && apiSecret === apiKey) {
      console.error('[LiveKit] LIVEKIT_API_SECRET must not be the same as LIVEKIT_API_KEY.');
      return false;
    }
    return configured;
  }

  isReady() {
    return this.isConfigured() && this.credentialsVerified === true;
  }

  async initialize() {
    if (!this.isConfigured()) {
      this.credentialsVerified = false;
      return { ok: false, reason: 'LiveKit env vars are missing' };
    }

    const result = await this.verifyCredentials();
    this.credentialsVerified = result.ok;
    return result;
  }

  getUrl() {
    return (process.env.LIVEKIT_URL || 'wss://live.Zemin.app').trim();
  }

  getPublicUrl() {
    return (process.env.LIVEKIT_PUBLIC_URL || this.getUrl()).trim();
  }

  getHttpUrl() {
    return this.getUrl().replace(/^wss:\/\//, 'https://').replace(/^ws:\/\//, 'http://');
  }

  async verifyCredentials() {
    if (!this.isConfigured()) {
      return { ok: false, reason: 'LiveKit env vars are missing' };
    }

    try {
      const client = new RoomServiceClient(
        this.getHttpUrl(),
        this.getApiKey(),
        this.getApiSecret()
      );
      await client.listRooms();
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: err.message || 'LiveKit credential check failed' };
    }
  }

  async generateToken(roomName, identity, role = 'viewer') {
    if (!this.isReady()) {
      return null;
    }

    const token = new AccessToken(
      this.getApiKey(),
      this.getApiSecret(),
      { identity: String(identity), ttl: '4h' }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: role === 'host',
      canSubscribe: true,
      canPublishData: true,
    });

    return await token.toJwt();
  }
}

module.exports = new LiveKitService();
