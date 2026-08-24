# Volume 1 — Product Requirements

**Document ID:** Zemin-SRS-V01  
**Version:** 1.0.0  
**Pages:** ~50  

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Business Goals](#2-business-goals)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Feature List](#4-feature-list)
5. [User Journeys](#5-user-journeys)
6. [Functional Requirements](#6-functional-requirements)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [Monetization Model](#8-monetization-model)
9. [Success Metrics](#9-success-metrics)

---

## 1. Product Vision

### 1.1 Vision Statement

Zemin is the all-in-one creator economy platform where talent meets audience. Creators publish exclusive content, go live with interactive features (multi-guest, PK battles, gifts), and monetize through subscriptions, tips, and pay-per-view — while fans discover, engage, and support creators they love.

### 1.2 Problem Statement

Creators today juggle multiple platforms:
- **Tango** for live entertainment but limited monetization depth
- **OnlyFans** for subscriptions but weak live features
- **Patreon** for memberships but no real-time engagement
- **Fanvue** for creator tools but fragmented UX

Zemin unifies these into one cohesive mobile-first platform.

### 1.3 Target Audience

| Segment | Description |
|---------|-------------|
| Primary Creators | 18–35, content creators, influencers, performers |
| Primary Fans | 18–45, entertainment seekers, superfans |
| Secondary | Agencies managing multiple creator accounts |
| Geographic | Global launch; Phase 1: India, US, UK |

### 1.4 Competitive Positioning

| Feature | Zemin | OnlyFans | Patreon | Tango |
|---------|-------|----------|---------|-------|
| Live Streaming | ✅ Multi-guest, PK | ❌ | ❌ | ✅ Basic |
| Subscriptions | ✅ Tiered | ✅ Flat | ✅ Tiered | ❌ |
| Virtual Gifts | ✅ Coins | ❌ | ❌ | ✅ |
| PPV Content | ✅ | ✅ | ❌ | ❌ |
| Direct Messaging | ✅ Paid/Free | ✅ | ❌ | ✅ |
| Creator Analytics | ✅ Advanced | ✅ Basic | ✅ Basic | ✅ Basic |

---

## 2. Business Goals

### 2.1 Primary Goals (Year 1)

| Goal | Target | Timeline |
|------|--------|----------|
| Registered Users | 500,000 | Month 12 |
| Active Creators | 10,000 | Month 12 |
| Monthly GMV | $2M | Month 12 |
| Platform Take Rate | 20% avg | Ongoing |
| DAU/MAU Ratio | >25% | Month 6+ |

### 2.2 Revenue Streams

1. **Platform Commission** — 20% on all creator earnings
2. **Coin Sales Markup** — 30% margin on virtual coin purchases
3. **Premium Creator Tools** — $29/month analytics & promotion suite
4. **Featured Placement** — Sponsored discover slots
5. **Agency Dashboard** — B2B SaaS for talent agencies

### 2.3 Key Business Constraints

- Creators must be 18+ with verified identity
- Platform complies with PCI-DSS (payments), GDPR, and local content laws
- Minimum payout threshold: $50 (or ₹500)
- Content moderation SLA: flagged content reviewed within 4 hours

---

## 3. User Roles & Permissions

### 3.1 Role Matrix

| Permission | Fan | Creator | Moderator | Admin |
|-----------|-----|---------|-----------|-------|
| View public content | ✅ | ✅ | ✅ | ✅ |
| Subscribe to creators | ✅ | ✅ | ✅ | ✅ |
| Publish posts/stories | ❌ | ✅ | ❌ | ✅ |
| Go live | ❌ | ✅ | ❌ | ✅ |
| Send gifts/coins | ✅ | ✅ | ❌ | ✅ |
| Direct message | ✅ | ✅ | ✅ | ✅ |
| Withdraw earnings | ❌ | ✅ | ❌ | ✅ |
| Moderate content | ❌ | ❌ | ✅ | ✅ |
| Manage users | ❌ | ❌ | ❌ | ✅ |
| Access analytics dashboard | ❌ | ✅ (own) | ❌ | ✅ (all) |
| Configure platform | ❌ | ❌ | ❌ | ✅ |

### 3.2 Fan Role

**Description:** End consumer who discovers creators, consumes content, and spends money on subscriptions, gifts, and PPV.

**Capabilities:**
- Browse discover feed, search, follow creators
- Purchase coin packages
- Subscribe to creator tiers
- Send gifts during live streams
- Chat with creators (free or paid DM)
- Receive push notifications
- Manage wallet and transaction history

### 3.3 Creator Role

**Description:** Content producer who monetizes through the platform.

**Capabilities:**
- All Fan capabilities
- Upload posts (photo, video, text), stories, reels
- Set subscription tiers and PPV pricing
- Go live (solo, multi-guest, PK battle)
- View earnings dashboard and analytics
- Request withdrawals
- Manage subscriber list
- Set DM pricing (free/paid)
- Apply for verification badge

**Verification Requirements:**
- Government ID upload
- Selfie verification (liveness check)
- Minimum 100 followers OR admin approval
- Age 18+ confirmed

### 3.4 Moderator Role

**Description:** Trust & safety team member.

**Capabilities:**
- Review reported content and users
- Mute/ban users in live rooms
- Remove posts/stories
- Issue warnings to creators
- Escalate to admin
- View moderation queue

### 3.5 Admin Role

**Description:** Platform operator with full system access.

**Sub-roles:** Super Admin, Finance Admin, Content Admin, Support Admin (RBAC granular permissions — see Volume 9)

---

## 4. Feature List

### 4.1 Authentication & Onboarding

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| AUTH-001 | Email/phone registration | P0 | 1 |
| AUTH-002 | OTP verification | P0 | 1 |
| AUTH-003 | Social login (Google, Apple) | P1 | 1 |
| AUTH-004 | JWT + refresh token auth | P0 | 1 |
| AUTH-005 | Multi-step onboarding (interests, avatar) | P1 | 1 |
| AUTH-006 | Creator application flow | P0 | 1 |
| AUTH-007 | Biometric login (Face ID / fingerprint) | P2 | 2 |
| AUTH-008 | Two-factor authentication | P2 | 2 |

### 4.2 Content & Feed

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| FEED-001 | Home feed (following + algorithmic) | P0 | 1 |
| FEED-002 | Discover/explore page | P0 | 1 |
| FEED-003 | Creator profile page | P0 | 1 |
| FEED-004 | Post creation (photo, video, text) | P0 | 1 |
| FEED-005 | Stories (24h expiry) | P0 | 1 |
| FEED-006 | Reels (short-form video) | P1 | 1 |
| FEED-007 | Like, comment, share, save | P0 | 1 |
| FEED-008 | PPV (pay-per-view) posts | P0 | 1 |
| FEED-009 | Subscriber-only posts | P0 | 1 |
| FEED-010 | Content scheduling | P2 | 2 |
| FEED-011 | Polls and Q&A on posts | P2 | 2 |

### 4.3 Social & Discovery

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| SOC-001 | Follow/unfollow creators | P0 | 1 |
| SOC-002 | Search (creators, hashtags, posts) | P0 | 1 |
| SOC-003 | Trending creators | P1 | 1 |
| SOC-004 | Categories/tags | P1 | 1 |
| SOC-005 | Block and report users | P0 | 1 |
| SOC-006 | Referral program | P2 | 2 |

### 4.4 Subscriptions (Patreon-style)

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| SUB-001 | Creator-defined subscription tiers (up to 5) | P0 | 1 |
| SUB-002 | Monthly recurring billing | P0 | 1 |
| SUB-003 | Tier benefits (exclusive content, badges, DM access) | P0 | 1 |
| SUB-004 | Free trial periods | P1 | 2 |
| SUB-005 | Gift subscriptions | P2 | 2 |
| SUB-006 | Subscription analytics for creators | P1 | 1 |

### 4.5 Messaging & Chat

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| CHAT-001 | 1:1 direct messaging | P0 | 1 |
| CHAT-002 | Paid DM (creator sets price per message) | P0 | 1 |
| CHAT-003 | Media sharing in chat (photo, video, audio) | P0 | 1 |
| CHAT-004 | PPV media in chat | P1 | 1 |
| CHAT-005 | Typing indicators, read receipts | P1 | 1 |
| CHAT-006 | Message reactions | P2 | 2 |
| CHAT-007 | Group chat (creator + subscribers) | P2 | 2 |

### 4.6 Wallet & Coins

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| WAL-001 | In-app wallet | P0 | 1 |
| WAL-002 | Coin packages (IAP-style) | P0 | 1 |
| WAL-003 | Send coins/gifts to creators | P0 | 1 |
| WAL-004 | Transaction history | P0 | 1 |
| WAL-005 | Auto-recharge coins | P2 | 2 |

### 4.7 Gifts

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| GIFT-001 | Gift catalog (animated gifts) | P0 | 1 |
| GIFT-002 | Send gifts on live streams | P0 | 1 |
| GIFT-003 | Send gifts on posts/profile | P1 | 1 |
| GIFT-004 | Gift leaderboard (per live room) | P1 | 1 |
| GIFT-005 | Custom creator gifts | P2 | 2 |

### 4.8 Live Streaming

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| LIVE-001 | Solo live streaming | P0 | 1 |
| LIVE-002 | Live chat overlay | P0 | 1 |
| LIVE-003 | Gift animations on stream | P0 | 1 |
| LIVE-004 | Multi-guest live (up to 4 guests) | P0 | 1 |
| LIVE-005 | PK Battle (2 creators compete) | P0 | 1 |
| LIVE-006 | Live room moderation tools | P0 | 1 |
| LIVE-007 | Live recording & replay | P1 | 1 |
| LIVE-008 | Scheduled live events | P1 | 2 |
| LIVE-009 | Subscriber-only live rooms | P1 | 1 |
| LIVE-010 | Live co-hosting | P2 | 2 |

### 4.9 Notifications

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| NOTIF-001 | Push notifications (FCM/APNs) | P0 | 1 |
| NOTIF-002 | In-app notification center | P0 | 1 |
| NOTIF-003 | Notification preferences | P1 | 1 |
| NOTIF-004 | Email notifications | P2 | 2 |

### 4.10 Settings & Profile

| ID | Feature | Priority | Phase |
|----|---------|----------|-------|
| SET-001 | Edit profile (bio, links, avatar, banner) | P0 | 1 |
| SET-002 | Privacy settings | P0 | 1 |
| SET-003 | Payment methods management | P0 | 1 |
| SET-004 | Creator payout settings | P0 | 1 |
| SET-005 | Account deletion (GDPR) | P0 | 1 |
| SET-006 | Language & region settings | P1 | 2 |

---

## 5. User Journeys

### 5.1 Fan Registration Journey

```
Splash → Onboarding Slides → Sign Up (email/phone)
  → OTP Verification → Set Password → Choose Interests
  → Upload Avatar (optional) → Home Feed
```

**Success Criteria:** User reaches home feed within 90 seconds.

### 5.2 Creator Onboarding Journey

```
Settings → "Become a Creator" → Identity Verification (ID + selfie)
  → Set Creator Profile (bio, categories, banner)
  → Configure Subscription Tiers → Set Payout Method
  → Creator Dashboard → Upload First Post
```

**Success Criteria:** Creator can publish first post within 24 hours of application.

### 5.3 Subscription Purchase Journey

```
Creator Profile → View Tiers → Select Tier → Payment (Stripe/Razorpay)
  → Confirmation → Unlock Exclusive Content → Notification to Creator
```

### 5.4 Live Stream Journey (Creator)

```
Home → Go Live → Camera Preview → Set Title/Category
  → Start Stream → Viewers Join → Receive Gifts
  → Invite Guest (optional) → End Stream → View Analytics
```

### 5.5 PK Battle Journey

```
Creator A Live → Challenge Creator B → Creator B Accepts
  → Split Screen → Fans Send Gifts → Timer Ends
  → Winner Announced → Coin Distribution
```

### 5.6 Gift Sending Journey

```
Live Room → Tap Gift Icon → Select Gift → Confirm (deduct coins)
  → Animated Gift on Stream → Creator Receives Earnings
  → Leaderboard Updated
```

### 5.7 Withdrawal Journey

```
Creator Dashboard → Earnings → Request Withdrawal
  → Select Method (bank/UPI/PayPal) → Enter Amount (≥ minimum)
  → Submit → Admin Review → Payout Processed (3–5 business days)
```

---

## 6. Functional Requirements

### 6.1 Authentication (FR-AUTH)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AUTH-01 | System SHALL support registration via email or phone number | P0 |
| FR-AUTH-02 | System SHALL send OTP via SMS/email and verify within 5 minutes | P0 |
| FR-AUTH-03 | System SHALL issue JWT access token (15 min) and refresh token (30 days) | P0 |
| FR-AUTH-04 | System SHALL hash passwords using bcrypt (cost factor ≥12) | P0 |
| FR-AUTH-05 | System SHALL lock account after 5 failed login attempts for 15 minutes | P0 |
| FR-AUTH-06 | System SHALL support Google OAuth 2.0 and Sign in with Apple | P1 |
| FR-AUTH-07 | System SHALL allow password reset via OTP | P0 |

### 6.2 Content Management (FR-CONTENT)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-CONTENT-01 | System SHALL support image uploads up to 20MB (JPEG, PNG, WebP) | P0 |
| FR-CONTENT-02 | System SHALL support video uploads up to 500MB (MP4, MOV) | P0 |
| FR-CONTENT-03 | System SHALL transcode videos to HLS for adaptive streaming | P0 |
| FR-CONTENT-04 | System SHALL auto-expire stories after 24 hours | P0 |
| FR-CONTENT-05 | System SHALL enforce PPV paywall before content access | P0 |
| FR-CONTENT-06 | System SHALL enforce subscription tier access control | P0 |
| FR-CONTENT-07 | System SHALL support content reporting with reason codes | P0 |
| FR-CONTENT-08 | System SHALL watermark premium content with viewer ID | P1 |

### 6.3 Live Streaming (FR-LIVE)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LIVE-01 | System SHALL support live streaming with <3s latency | P0 |
| FR-LIVE-02 | System SHALL support up to 10,000 concurrent viewers per room | P0 |
| FR-LIVE-03 | System SHALL support multi-guest with up to 4 co-hosts | P0 |
| FR-LIVE-04 | System SHALL run PK battles with configurable duration (3–10 min) | P0 |
| FR-LIVE-05 | System SHALL display real-time gift animations on stream | P0 |
| FR-LIVE-06 | System SHALL allow host to mute/kick viewers | P0 |
| FR-LIVE-07 | System SHALL record live streams for replay (opt-in) | P1 |
| FR-LIVE-08 | System SHALL auto-end streams after 4 hours of inactivity | P0 |

### 6.4 Payments (FR-PAY)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-PAY-01 | System SHALL process payments via Stripe (US/EU) and Razorpay (India) | P0 |
| FR-PAY-02 | System SHALL maintain an in-app wallet with real-time balance | P0 |
| FR-PAY-03 | System SHALL sell coin packages: 100, 500, 1000, 5000, 10000 coins | P0 |
| FR-PAY-04 | System SHALL deduct platform commission (20%) on creator earnings | P0 |
| FR-PAY-05 | System SHALL process withdrawal requests within 5 business days | P0 |
| FR-PAY-06 | System SHALL enforce minimum withdrawal of $50 / ₹500 | P0 |
| FR-PAY-07 | System SHALL handle subscription renewals automatically | P0 |
| FR-PAY-08 | System SHALL issue refunds per admin approval within 7 days | P1 |

### 6.5 Messaging (FR-MSG)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-MSG-01 | System SHALL deliver messages in real-time via Socket.IO | P0 |
| FR-MSG-02 | System SHALL support paid DM with creator-set pricing | P0 |
| FR-MSG-03 | System SHALL encrypt message content at rest | P0 |
| FR-MSG-04 | System SHALL support media attachments up to 50MB in chat | P0 |
| FR-MSG-05 | System SHALL show typing indicators with 3s debounce | P1 |

---

## 7. Non-Functional Requirements

### 7.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-PERF-01 | API response time (p95) | <200ms |
| NFR-PERF-02 | Feed load time | <1.5s |
| NFR-PERF-03 | Live stream start latency | <3s |
| NFR-PERF-04 | Message delivery latency | <500ms |
| NFR-PERF-05 | Image upload + CDN availability | <5s |
| NFR-PERF-06 | Concurrent live viewers (platform) | 100,000+ |

### 7.2 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SCALE-01 | Registered users | 5M+ |
| NFR-SCALE-02 | Daily active users | 500K+ |
| NFR-SCALE-03 | API requests per second | 10,000+ |
| NFR-SCALE-04 | Database read/write ops | 50,000 ops/sec |
| NFR-SCALE-05 | Horizontal scaling | Auto-scale API servers |

### 7.3 Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AVAIL-01 | Platform uptime | 99.9% |
| NFR-AVAIL-02 | Live streaming uptime | 99.5% |
| NFR-AVAIL-03 | Payment processing uptime | 99.99% |
| NFR-AVAIL-04 | Planned maintenance window | Sundays 2–4 AM UTC |

### 7.4 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SEC-01 | Data encryption in transit | TLS 1.3 |
| NFR-SEC-02 | Data encryption at rest | AES-256 |
| NFR-SEC-03 | PCI-DSS compliance | Level 1 |
| NFR-SEC-04 | GDPR compliance | Full |
| NFR-SEC-05 | Penetration testing | Quarterly |
| NFR-SEC-06 | Rate limiting | 100 req/min per IP |

### 7.5 Compatibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-COMPAT-01 | iOS minimum version | iOS 14+ |
| NFR-COMPAT-02 | Android minimum version | Android 8.0 (API 26)+ |
| NFR-COMPAT-03 | Admin panel browsers | Chrome 90+, Firefox 88+, Safari 14+ |
| NFR-COMPAT-04 | Screen sizes | 320px – 428px width (mobile) |

---

## 8. Monetization Model

### 8.1 Revenue Flow

```
Fan Purchase → Platform Wallet/Coins → Creator Earnings (80%)
                                      → Platform Fee (20%)
```

### 8.2 Coin Packages

| Package | Coins | Price (USD) | Price (INR) | Bonus |
|---------|-------|---------------|-------------|-------|
| Starter | 100 | $0.99 | ₹79 | — |
| Basic | 500 | $4.99 | ₹399 | +10% |
| Popular | 1,000 | $9.99 | ₹799 | +15% |
| Premium | 5,000 | $39.99 | ₹3,199 | +20% |
| Mega | 10,000 | $74.99 | ₹5,999 | +25% |

### 8.3 Gift Pricing (Coin Cost)

| Gift | Coins | Creator Earns (USD equiv) |
|------|-------|--------------------------|
| Rose | 10 | $0.08 |
| Heart | 50 | $0.40 |
| Star | 100 | $0.80 |
| Crown | 500 | $4.00 |
| Rocket | 1,000 | $8.00 |
| Castle | 5,000 | $40.00 |
| Universe | 10,000 | $80.00 |

### 8.4 Subscription Tier Example

| Tier | Price/mo | Benefits |
|------|----------|----------|
| Free Follow | $0 | Public posts, live access |
| Supporter | $4.99 | Exclusive posts, badge |
| Premium | $9.99 | All posts, DMs, early live access |
| VIP | $24.99 | All + custom gifts, 1:1 monthly call |
| Inner Circle | $49.99 | All + PPV discount, name in bio |

### 8.5 Creator Earnings Breakdown

| Source | Creator Share | Platform Share |
|--------|--------------|----------------|
| Subscriptions | 80% | 20% |
| PPV purchases | 80% | 20% |
| Gifts/Coins | 80% | 20% |
| Paid DMs | 80% | 20% |
| Tips | 85% | 15% |

---

## 9. Success Metrics

### 9.1 North Star Metric

**Weekly Creator Revenue (WCR)** — Total earnings paid to creators per week.

### 9.2 KPI Dashboard

| Category | Metric | Target (M6) | Target (M12) |
|----------|--------|-------------|--------------|
| Growth | New registrations/day | 2,000 | 5,000 |
| Growth | Creator signups/week | 200 | 500 |
| Engagement | DAU | 50,000 | 150,000 |
| Engagement | Avg session duration | 12 min | 18 min |
| Engagement | Live streams/day | 500 | 2,000 |
| Revenue | ARPU (monthly) | $3.50 | $6.00 |
| Revenue | Creator avg earnings/mo | $150 | $400 |
| Retention | D7 retention | 35% | 45% |
| Retention | D30 retention | 15% | 25% |
| Quality | Content report rate | <0.5% | <0.3% |
| Quality | App crash rate | <0.1% | <0.05% |
| Performance | API p95 latency | <250ms | <200ms |

### 9.3 Analytics Events (Key)

| Event | Properties |
|-------|-----------|
| `user_registered` | method, source, country |
| `creator_verified` | category, time_to_verify |
| `subscription_purchased` | tier, price, creator_id |
| `coin_purchased` | package, amount, currency |
| `gift_sent` | gift_id, coin_cost, live_room_id |
| `live_started` | category, subscriber_only |
| `live_joined` | room_id, viewer_count |
| `pk_battle_started` | creator_a, creator_b |
| `post_created` | type, is_ppv, is_subscriber_only |
| `withdrawal_requested` | amount, method |

---

*End of Volume 1*
