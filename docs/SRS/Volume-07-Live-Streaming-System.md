# Volume 7 — Live Streaming System

**Document ID:** Zemin-SRS-V07  
**Version:** 1.0.0  
**Pages:** ~45  

---

## 1. System Overview

Zemin's live streaming system supports solo broadcasts, multi-guest rooms (up to 4 guests), PK battles, real-time gifts, and live chat — all powered by WebRTC via self-hosted LiveKit with Socket.IO for signaling and event distribution.

### 1.1 Architecture Diagram

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Mobile App  │────│  API Server   │────│  MongoDB    │
│  (RN+LiveKit)│    │  (Express)    │    │             │
└──────┬──────┘     └──────┬───────┘     └─────────────┘
       │                   │
       │ WebRTC            │ Socket.IO
       ▼                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  LiveKit     │    │  Socket.IO    │────│   Redis     │
│  Server      │    │  Server       │    │  (state)    │
└──────┬──────┘     └──────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  TURN/STUN  │
│  Server     │
└─────────────┘
```

---

## 2. Live Room Lifecycle

```
                    ┌──────────┐
                    │ WAITING  │ ← POST /api/live/create
                    └────┬─────┘
                         │ POST /api/live/start
                         ▼
                    ┌──────────┐
          ┌────────│   LIVE   │────────┐
          │        └────┬─────┘        │
          │             │              │
    PK Battle      Guest Join      Gift/Chat
          │             │              │
          │        POST /api/live/end  │
          │             │              │
          │             ▼              │
          │        ┌──────────┐        │
          └───────>│  ENDED   │<───────┘
                   └──────────┘
```

### 2.1 State Transitions

| From | To | Trigger | Actions |
|------|----|---------|---------|
| — | waiting | create | Generate streamKey, LiveKit room, save to DB |
| waiting | live | start | Notify followers, start recording, update Redis |
| live | live | guest join/leave | Update participants, reconfigure layout |
| live | live | pk start | Link two rooms, start score tracking |
| live | ended | end (host) | Calculate earnings, save recording, cleanup |
| live | ended | auto-end | 4hr timeout or host disconnect >60s |
| ended | — | cleanup | Archive data, release LiveKit room |

---

## 3. Host Management

### 3.1 Go Live Flow

1. Creator taps "Go Live" → camera permission check
2. `POST /api/live/create` → returns roomId, streamKey, webrtcToken
3. App connects to LiveKit with token
4. Host enables camera + microphone
5. `POST /api/live/start` → status = live, push notifications to followers
6. Stream active — host sees viewer count, chat, gifts

### 3.2 Host Controls

| Control | Action | Socket Event |
|---------|--------|-------------|
| Mute mic | Toggle audio track | — (local) |
| Flip camera | Switch front/back | — (local) |
| Beauty filter | Apply video processor | — (local) |
| End stream | Confirm → end room | `live:ended` |
| Mute viewer | Prevent chat messages | `live:user_muted` |
| Kick viewer | Remove from room | `live:user_kicked` |
| Ban viewer | Permanent ban from room | `live:user_banned` |
| Invite guest | Send guest invite | `live:guest_invited` |
| Start PK | Challenge another creator | `live:pk_challenge` |

---

## 4. Viewer Management

### 4.1 Join Flow

1. Fan discovers live room (Discover, notification, profile)
2. `POST /api/live/join` → access check (public/subscriber)
3. Receive WebRTC viewer token
4. Connect to LiveKit as viewer (receive-only)
5. Join Socket.IO room for chat/gifts
6. Increment viewer count in Redis

### 4.2 Viewer Limits

| Tier | Max Viewers |
|------|------------|
| Default | 10,000 |
| Verified creator | 25,000 |
| Platform event | 100,000 |

### 4.3 Viewer Tracking (Redis)

```
live:room:{roomId}:viewers     → SET of userIds
live:room:{roomId}:count       → INTEGER (current viewers)
live:room:{roomId}:peak        → INTEGER (peak viewers)
live:room:{roomId}:total       → INTEGER (total unique viewers)
```

---

## 5. Multi-Guest Support

### 5.1 Guest Flow

```
Fan requests guest spot → Host sees request queue
  → Host approves → Fan receives guest token
  → Fan publishes audio/video → Appears in guest tile
  → Host or guest can end guest session
```

### 5.2 Layout Modes

| Guests | Layout |
|--------|--------|
| 0 | Full screen host |
| 1 | Host 60% top, guest 40% bottom |
| 2 | Host 50% top, 2 guests 25% each bottom |
| 3 | Host 40% top, 3 guests 20% each bottom |
| 4 | Host 30% top, 4 guests 17.5% each bottom |

### 5.3 Guest Rules

- Max 4 guests per room
- Guest session max 30 minutes
- Guest must have camera + mic permissions
- Host can mute/remove any guest
- Guest can leave voluntarily
- Guest spot queue max 20 pending requests

---

## 6. PK Battle Logic

### 6.1 PK Flow

```
Creator A (live) → Challenge Creator B
  → Creator B receives notification
  → Creator B accepts → PK Battle starts
  → Split screen layout activated
  → 3/5/10 minute timer starts
  → Fans send gifts to support their creator
  → Scores update in real-time
  → Timer ends → Winner announced
  → Confetti animation → Rematch option
```

### 6.2 Scoring

```javascript
// Score = total coin value of gifts received during PK
const updatePKScore = async (pkBattleId, creatorId, coinValue) => {
  const battle = await PKBattle.findById(pkBattleId);
  const side = battle.creatorA.userId.equals(creatorId) ? 'creatorA' : 'creatorB';
  
  battle[side].score += coinValue;
  
  // 2x multiplier in last 30 seconds
  const remaining = battle.duration - (Date.now() - battle.startedAt) / 1000;
  if (remaining <= 30) {
    battle[side].score += coinValue; // double count
  }
  
  await battle.save();
  socketManager.emit('live:pk_score_update', { pkBattleId, scores: battle });
};
```

### 6.3 PK Rules

| Rule | Value |
|------|-------|
| Duration options | 3, 5, 10 minutes |
| Challenge timeout | 60 seconds to accept |
| 2x multiplier | Last 30 seconds |
| Winner | Highest gift coin total |
| Tie | Both keep earnings, no winner |
| Rematch | Either creator can initiate |
| Max PKs per stream | 5 |

---

## 7. Coin and Gift Flow (Live Context)

```
Fan selects gift → Confirm (deduct coins) → gift.service.sendGift()
  → Deduct fan coinBalance
  → Credit creator availableBalance (80%)
  → Create gift_transaction
  → Socket: live:gift → All viewers see animation
  → Update gift leaderboard (Redis sorted set)
  → If PK active: update PK score
  → Create notification for creator
```

### 7.1 Gift Leaderboard (Redis)

```
ZADD live:room:{roomId}:leaderboard {coinTotal} {userId}
ZREVRANGE live:room:{roomId}:leaderboard 0 9 WITHSCORES  → Top 10 gifters
```

---

## 8. Moderation Tools

| Tool | Scope | Permissions |
|------|-------|-------------|
| Mute user | Per room, timed | Host, Moderator |
| Kick user | Per room | Host, Moderator |
| Ban user | Per room or platform | Host, Moderator, Admin |
| Delete chat message | Per message | Host, Moderator |
| Slow mode | Room-wide (5s between messages) | Host |
| Followers-only chat | Restrict chat to followers | Host |
| Force end stream | Terminate any live room | Moderator, Admin |

---

## 9. Recording Workflow

```
Host enables recording → LiveKit starts room composite recording
  → Stream ends → Recording uploaded to S3/Cloudinary
  → recordingUrl saved to live_rooms
  → Available as replay on creator profile (optional)
  → Auto-delete after 90 days (configurable)
```

---

## 10. Real-Time Socket.IO Events

### 10.1 Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `live:join` | `{ roomId }` | Join live room socket channel |
| `live:leave` | `{ roomId }` | Leave live room |
| `live:chat` | `{ roomId, text }` | Send chat message |
| `live:gift` | `{ roomId, giftId, quantity }` | Send gift (via API, socket for animation) |
| `live:request_guest` | `{ roomId }` | Request guest spot |
| `live:guest_response` | `{ roomId, accept }` | Accept/decline guest invite |
| `live:pk_accept` | `{ pkBattleId }` | Accept PK challenge |
| `live:heart` | `{ roomId }` | Send floating heart |

### 10.2 Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `live:started` | `{ roomId, host }` | Stream started |
| `live:ended` | `{ roomId, stats }` | Stream ended |
| `live:viewer_count` | `{ roomId, count }` | Updated viewer count |
| `live:chat_message` | `{ userId, username, text, type }` | New chat message |
| `live:gift_received` | `{ gift, sender, quantity, animation }` | Gift animation trigger |
| `live:guest_request` | `{ userId, username }` | New guest request (to host) |
| `live:guest_joined` | `{ userId, username, slot }` | Guest joined room |
| `live:guest_removed` | `{ userId }` | Guest removed |
| `live:pk_challenge` | `{ pkBattleId, challenger }` | PK challenge received |
| `live:pk_started` | `{ pkBattleId, creatorA, creatorB, duration }` | PK battle started |
| `live:pk_score_update` | `{ creatorA: score, creatorB: score }` | Score update |
| `live:pk_ended` | `{ winnerId, scores }` | PK battle ended |
| `live:user_muted` | `{ userId, duration }` | User muted |
| `live:user_kicked` | `{ userId }` | User kicked |
| `live:leaderboard_update` | `{ topGifters[] }` | Gift leaderboard update |

---

## 11. WebRTC Signaling Architecture

### 11.1 LiveKit Integration

```javascript
// services/livekit.service.js
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

class LiveKitService {
  constructor() {
    this.roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL,
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );
  }

  generateToken(roomName, participantName, role = 'viewer') {
    const token = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      { identity: participantName, ttl: '4h' }
    );

    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: role === 'host' || role === 'guest',
      canSubscribe: true,
      canPublishData: true,
    });

    return token.toJwt();
  }

  async createRoom(roomName) {
    return this.roomService.createRoom({
      name: roomName,
      emptyTimeout: 300,
      maxParticipants: 10000,
    });
  }

  async deleteRoom(roomName) {
    return this.roomService.deleteRoom(roomName);
  }
}
```

### 11.2 Connection Flow

```
Mobile App                    LiveKit Server              TURN Server
    │                              │                          │
    │── Connect (WSS + token) ────>│                          │
    │                              │                          │
    │<── ICE candidates ──────────│                          │
    │                              │                          │
    │── ICE candidate exchange ──>│── Relay if needed ──────>│
    │                              │                          │
    │<══ WebRTC media stream ═════│                          │
```

---

## 12. TURN/STUN Configuration

```yaml
# coturn configuration
listening-port: 3478
tls-listening-port: 5349
external-ip: <VPS_PUBLIC_IP>
realm: Zemin.app
server-name: turn.Zemin.app
lt-cred-mech: true
user=Zemin:secure_password_here
cert: /etc/ssl/turn.crt
pkey: /etc/ssl/turn.key
```

**LiveKit TURN config:**
```yaml
turn:
  enabled: true
  domain: turn.Zemin.app
  cert_file: /etc/ssl/turn.crt
  key_file: /etc/ssl/turn.key
  tls_port: 5349
  udp_port: 3478
```

---

## 13. Scaling Strategy

### 13.1 Phase 1 (0–10K concurrent viewers)

- Single LiveKit server (4 vCPU, 8GB RAM)
- Single API server
- Redis single instance
- MongoDB Atlas M30

### 13.2 Phase 2 (10K–100K concurrent viewers)

- LiveKit cluster (3 nodes, load balanced)
- API servers (3+ instances, PM2 cluster)
- Redis Sentinel (HA)
- MongoDB sharded cluster
- CDN for recording delivery

### 13.3 Phase 3 (100K+ concurrent viewers)

- LiveKit multi-region deployment
- Dedicated TURN servers per region
- API auto-scaling (Kubernetes)
- Edge caching for live thumbnails
- Separate Socket.IO cluster for live events

### 13.4 Load Estimates

| Viewers | Bandwidth (720p) | LiveKit Nodes | API Instances |
|---------|-----------------|---------------|---------------|
| 1,000 | ~2 Gbps | 1 | 1 |
| 10,000 | ~20 Gbps | 1–2 | 2 |
| 50,000 | ~100 Gbps | 3–5 | 4 |
| 100,000 | ~200 Gbps | 5–10 | 8 |

---

*End of Volume 7*
