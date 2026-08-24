# Live Streaming API Reference

**Base URL:** `/api/v1/live`  
**Endpoints:** 20  

---

## POST /live/create

Create a new live room.

| Property | Value |
|----------|-------|
| Auth | Bearer (Creator) |

**Request:**
```json
{
  "title": "string (max 100)",
  "category": "string",
  "thumbnail": "string (URL, optional)",
  "visibility": "public | subscribers",
  "subscriberTierId": "ObjectId (if subscribers)",
  "enableRecording": true,
  "enableGuest": true,
  "maxGuests": 4
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "roomId": "ObjectId",
    "streamKey": "sk_live_xxx",
    "rtmpUrl": "rtmp://live.Zemin.app/live",
    "webrtcToken": "JWT",
    "livekitRoom": "room_xxx",
    "status": "waiting"
  }
}
```

---

## POST /live/start

**Auth:** Bearer (Host)  
**Request:** `{ "roomId": "ObjectId" }`  
**Effect:** Status → live, notify followers

---

## POST /live/join

**Auth:** Bearer  
**Request:** `{ "roomId": "ObjectId" }`

**Response 200:**
```json
{
  "data": {
    "roomId": "ObjectId",
    "webrtcToken": "JWT",
    "livekitUrl": "wss://live.Zemin.app",
    "host": { "id": "", "username": "", "avatar": "" },
    "viewerCount": 1250,
    "guests": [],
    "pkBattle": null
  }
}
```

**Errors:** SUBSCRIPTION_REQUIRED (403), LIVE_ROOM_ENDED (400)

---

## POST /live/leave

**Request:** `{ "roomId": "ObjectId" }`

---

## POST /live/end

**Auth:** Bearer (Host)  
**Response:** Duration, peakViewers, totalGifts, earnings, recordingUrl

---

## GET /live/active?category=&page=&limit=

Returns paginated list of active live rooms.

---

## GET /live/:roomId

Get room details and current state.

---

## POST /live/invite-guest

**Auth:** Host  
**Request:** `{ "roomId": "ObjectId", "userId": "ObjectId" }`

---

## POST /live/request-guest

**Auth:** Viewer  
**Request:** `{ "roomId": "ObjectId" }`

---

## POST /live/approve-guest

**Auth:** Host  
**Request:** `{ "roomId": "ObjectId", "userId": "ObjectId", "action": "approve|deny" }`

---

## POST /live/remove-guest

**Auth:** Host  
**Request:** `{ "roomId": "ObjectId", "userId": "ObjectId" }`

---

## POST /live/pk/challenge

**Request:**
```json
{
  "roomId": "ObjectId",
  "targetCreatorId": "ObjectId",
  "duration": 180
}
```

**Duration options:** 180 (3min), 300 (5min), 600 (10min)

---

## POST /live/pk/accept

**Request:** `{ "pkBattleId": "ObjectId", "roomId": "ObjectId" }`

---

## POST /live/pk/end

**Request:** `{ "pkBattleId": "ObjectId" }`  
**Response:** `{ winnerId, scores: { creatorA, creatorB } }`

---

## POST /live/moderate

**Auth:** Host, Moderator, Admin  
**Request:**
```json
{
  "roomId": "ObjectId",
  "userId": "ObjectId",
  "action": "mute|kick|ban",
  "duration": 300
}
```

---

## Socket Events Reference

See Volume 7 §10 for complete Socket.IO event documentation.

| Event | Direction | Description |
|-------|-----------|-------------|
| live:join | C→S | Join room channel |
| live:leave | C→S | Leave room channel |
| live:chat | C→S | Send chat message |
| live:started | S→C | Stream started |
| live:ended | S→C | Stream ended |
| live:viewer_count | S→C | Viewer count update |
| live:gift_received | S→C | Gift animation trigger |
| live:pk_score_update | S→C | PK score update |
