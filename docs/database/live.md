# Database Schema — Live Streaming

## live_rooms

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Room ID |
| hostId | ObjectId | yes | yes | ref: creators |
| userId | ObjectId | yes | — | ref: users |
| title | String | yes | — | Stream title |
| category | String | yes | yes | Content category |
| thumbnail | String | no | — | Preview image URL |
| status | String | yes | yes | waiting, live, ended |
| visibility | String | yes | — | public, subscribers |
| streamKey | String | yes | unique | RTMP stream key |
| livekitRoom | String | yes | — | LiveKit room name |
| recordingUrl | String | no | — | Recording CDN URL |
| enableRecording | Boolean | yes | — | Record stream |
| enableGuest | Boolean | yes | — | Allow guests |
| maxGuests | Number | yes | — | Max guest slots (4) |
| guests | [Object] | no | — | Active guest list |
| stats | Object | yes | — | Viewer/gift statistics |
| pkBattleId | ObjectId | no | — | ref: pk_battles |
| startedAt | Date | no | — | Stream start time |
| endedAt | Date | no | — | Stream end time |
| createdAt | Date | auto | yes | Created timestamp |

**Indexes:**
- `{ status: 1, category: 1 }` — active rooms by category
- `{ hostId: 1, status: 1 }` — creator's rooms
- `{ status: 1, "stats.currentViewers": -1 }` — popular live rooms

---

## live_messages

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Message ID |
| roomId | ObjectId | yes | yes | ref: live_rooms |
| userId | ObjectId | yes | — | Sender |
| username | String | yes | — | Display name |
| text | String | yes | — | Max 200 chars |
| type | String | yes | — | chat, gift, system, join, leave |
| giftId | ObjectId | no | — | ref: gifts (if type=gift) |
| isDeleted | Boolean | yes | — | Moderation flag |
| createdAt | Date | auto | yes | Timestamp |

**Indexes:**
- `{ roomId: 1, createdAt: -1 }`

---

## live_participants

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Participant ID |
| roomId | ObjectId | yes | yes | ref: live_rooms |
| userId | ObjectId | yes | yes | ref: users |
| role | String | yes | — | viewer, guest, host |
| joinedAt | Date | yes | — | Join timestamp |
| leftAt | Date | no | — | Leave timestamp |
| giftsSent | Number | yes | — | Total gift coins sent |
| isMuted | Boolean | yes | — | Chat muted |
| isKicked | Boolean | yes | — | Kicked from room |

**Indexes:**
- `{ roomId: 1, userId: 1 }` unique compound
- `{ roomId: 1, role: 1 }`

---

## pk_battles

| Field | Type | Required | Index | Description |
|-------|------|----------|-------|-------------|
| _id | ObjectId | auto | PK | Battle ID |
| creatorA | Object | yes | — | { userId, roomId, score } |
| creatorB | Object | yes | — | { userId, roomId, score } |
| duration | Number | yes | — | Battle duration (seconds) |
| status | String | yes | yes | pending, active, completed, cancelled |
| winnerId | ObjectId | no | — | Winner user ID |
| startedAt | Date | no | — | Battle start |
| endedAt | Date | no | — | Battle end |
| createdAt | Date | auto | yes | Created timestamp |

---

## Redis Keys (Live State)

| Key Pattern | Type | TTL | Purpose |
|------------|------|-----|---------|
| `live:room:{id}:viewers` | SET | none | Active viewer userIds |
| `live:room:{id}:count` | STRING | none | Current viewer count |
| `live:room:{id}:peak` | STRING | none | Peak viewer count |
| `live:room:{id}:leaderboard` | SORTED SET | none | Gift leaderboard |
| `live:room:{id}:guest_queue` | LIST | none | Pending guest requests |
| `live:active` | SORTED SET | 30s | Active room listing cache |

---

## Live Room Lifecycle Diagram

```
CREATE ──→ WAITING ──→ START ──→ LIVE ──→ END
                              │       │
                              │       ├── Guest Join/Leave
                              │       ├── PK Battle
                              │       ├── Gifts/Chat
                              │       └── Moderation
                              │
                              └── Auto-end (4hr timeout)
```
