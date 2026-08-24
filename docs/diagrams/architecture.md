# Architecture Diagrams

## 1. System Architecture

```mermaid
graph TB
    subgraph Client
        RN[React Native App]
        Admin[Admin Panel - React]
    end

    subgraph CDN
        CF[Cloudflare CDN/WAF]
    end

    subgraph Server
        NG[Nginx Load Balancer]
        API1[API Server 1]
        API2[API Server 2]
        API3[API Server 3]
        LK[LiveKit Server]
        TURN[TURN/STUN Server]
    end

    subgraph Data
        Mongo[(MongoDB Atlas)]
        Redis[(Redis)]
        S3[(S3/R2 Storage)]
    end

    subgraph External
        Stripe[Stripe]
        Razorpay[Razorpay]
        FCM[FCM/APNs]
        Cloudinary[Cloudinary]
    end

    RN --> CF
    Admin --> CF
    CF --> NG
    NG --> API1
    NG --> API2
    NG --> API3
    NG --> LK
    RN --> LK
    RN --> TURN
    API1 --> Mongo
    API2 --> Mongo
    API3 --> Mongo
    API1 --> Redis
    API1 --> S3
    API1 --> Stripe
    API1 --> Razorpay
    API1 --> FCM
    API1 --> Cloudinary
    LK --> TURN
```

---

## 2. Authentication Flow

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant API as API Server
    participant DB as MongoDB
    participant SMS as SMS/Email

    App->>API: POST /auth/register
    API->>DB: Create user
    API->>SMS: Send OTP
    API-->>App: { userId, otpSent }

    App->>API: POST /auth/verify-otp
    API->>DB: Verify OTP
    API-->>App: { tokens }

    App->>API: GET /auth/me (Bearer token)
    API->>DB: Fetch user
    API-->>App: { user profile }

    Note over App,API: Token Refresh
    App->>API: POST /auth/refresh-token
    API->>DB: Validate refresh token
    API-->>App: { new accessToken }
```

---

## 3. Live Streaming Flow

```mermaid
sequenceDiagram
    participant Host as Creator App
    participant API as API Server
    participant LK as LiveKit
    participant Viewer as Fan App
    participant Redis as Redis

    Host->>API: POST /live/create
    API->>LK: Create room
    API-->>Host: { roomId, webrtcToken }

    Host->>LK: Connect (publish)
    Host->>API: POST /live/start
    API->>Redis: Set room active
    API-->>Host: Stream live

    Viewer->>API: POST /live/join
    API->>Redis: INCR viewer count
    API-->>Viewer: { webrtcToken }

    Viewer->>LK: Connect (subscribe)
    Viewer->>API: POST /gift/send
    API->>Redis: Update leaderboard
    API-->>Viewer: Gift sent
    API-->>Host: Socket: gift animation
```

---

## 4. Payment Flow

```mermaid
sequenceDiagram
    participant Fan as Fan App
    participant API as API Server
    participant GW as Razorpay/Stripe
    participant DB as MongoDB

    Fan->>API: POST /coin/purchase
    API->>GW: Create order
    API-->>Fan: { orderId, gatewayKey }

    Fan->>GW: Complete payment
    GW->>API: Webhook: payment.captured
    API->>DB: Credit coins to wallet
    API->>DB: Create transaction
    API-->>Fan: Push: Coins added

    Fan->>API: POST /gift/send
    API->>DB: Debit fan coins
    API->>DB: Credit creator earnings
    API->>DB: Create gift_transaction
```

---

## 5. Database ER Diagram

```mermaid
erDiagram
    users ||--o| creators : "is"
    users ||--o| wallets : "has"
    users ||--o{ posts : "creates"
    users ||--o{ followers : "follows"
    users ||--o{ subscriptions : "subscribes"
    users ||--o{ transactions : "has"
    users ||--o{ conversations : "participates"
    creators ||--o{ subscription_tiers : "defines"
    creators ||--o{ live_rooms : "hosts"
    creators ||--o{ gift_transactions : "receives"
    posts ||--o{ comments : "has"
    posts ||--o{ likes : "has"
    live_rooms ||--o{ live_messages : "contains"
    live_rooms ||--o{ live_participants : "has"
    live_rooms ||--o| pk_battles : "may have"
    conversations ||--o{ messages : "contains"
    subscription_tiers ||--o{ subscriptions : "used in"
```

---

## 6. Mobile App Navigation

```mermaid
graph TD
    Root[Root Navigator]
    Root --> Auth[Auth Stack]
    Root --> Main[Main Tab Navigator]

    Auth --> Splash
    Auth --> Onboarding
    Auth --> Login
    Auth --> Signup
    Auth --> OTP

    Main --> Home[Home Tab]
    Main --> Discover[Discover Tab]
    Main --> GoLive[Go Live Tab]
    Main --> Chat[Chat Tab]
    Main --> Profile[Profile Tab]

    Home --> Feed[Home Feed]
    Home --> PostDetail[Post Detail]
    Home --> Comments[Comments]

    Discover --> DiscoverPage[Discover Page]
    Discover --> Search[Search]
    Discover --> CreatorProfile[Creator Profile]

    GoLive --> LiveSetup[Live Setup]
    GoLive --> LiveHost[Live Host]
    GoLive --> LiveEnd[Live End Summary]

    Chat --> ChatList[Chat List]
    Chat --> ChatRoom[Chat Room]

    Profile --> MyProfile[My Profile]
    Profile --> Settings[Settings]
    Profile --> Wallet[Wallet]
    Profile --> CreatorDash[Creator Dashboard]
```

---

## 7. Deployment Architecture

```mermaid
graph TB
    subgraph Internet
        Users[Mobile Users]
        Admins[Admin Users]
    end

    subgraph Cloudflare
        DNS[DNS]
        WAF[WAF/DDoS]
        CDN[CDN]
    end

    subgraph VPS Cluster
        NG[Nginx]
        subgraph Docker
            API[API x3]
            Redis[Redis]
            LK[LiveKit]
            AdminPanel[Admin Panel]
        end
    end

    subgraph Managed
        Atlas[MongoDB Atlas]
        S3[Object Storage]
    end

    Users --> DNS
    Admins --> DNS
    DNS --> WAF
    WAF --> CDN
    CDN --> NG
    NG --> API
    NG --> LK
    NG --> AdminPanel
    API --> Atlas
    API --> Redis
    API --> S3
    CDN --> S3
```

---

## 8. PK Battle Flow

```mermaid
sequenceDiagram
    participant CA as Creator A
    participant API as API Server
    participant CB as Creator B
    participant Fans as Fans

    CA->>API: POST /live/pk/challenge
    API-->>CB: Socket: pk_challenge

    CB->>API: POST /live/pk/accept
    API-->>CA: Socket: pk_started
    API-->>CB: Socket: pk_started
    API-->>Fans: Socket: pk_started

    loop Battle Duration
        Fans->>API: POST /gift/send
        API-->>CA: Socket: pk_score_update
        API-->>CB: Socket: pk_score_update
    end

    API->>API: Calculate winner
    API-->>CA: Socket: pk_ended
    API-->>CB: Socket: pk_ended
    API-->>Fans: Socket: pk_ended
```
