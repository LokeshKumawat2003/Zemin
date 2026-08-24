# Volume 2 — UI/UX Design Specification

**Document ID:** Zemin-SRS-V02  
**Version:** 1.0.0  
**Pages:** ~100  

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Navigation Architecture](#2-navigation-architecture)
3. [Screen Inventory](#3-screen-inventory)
4. [Authentication Screens](#4-authentication-screens)
5. [Home & Discovery Screens](#5-home--discovery-screens)
6. [Creator Profile & Feed Screens](#6-creator-profile--feed-screens)
7. [Content Creation Screens](#7-content-creation-screens)
8. [Chat Screens](#8-chat-screens)
9. [Wallet & Coins Screens](#9-wallet--coins-screens)
10. [Gifts Screens](#10-gifts-screens)
11. [Live Streaming Screens](#11-live-streaming-screens)
12. [Notifications & Settings](#12-notifications--settings)
13. [Admin Dashboard Screens](#13-admin-dashboard-screens)

---

## 1. Design System

### 1.1 Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#FF006E` | CTAs, active states, brand accent |
| `primaryDark` | `#D10058` | Pressed states |
| `secondary` | `#8338EC` | Premium features, badges |
| `accent` | `#FFBE0B` | Coins, gifts, highlights |
| `background` | `#0A0A0F` | App background (dark mode default) |
| `surface` | `#1A1A24` | Cards, modals |
| `surfaceElevated` | `#252532` | Elevated cards |
| `textPrimary` | `#FFFFFF` | Primary text |
| `textSecondary` | `#A0A0B0` | Secondary text |
| `textDisabled` | `#606070` | Disabled text |
| `success` | `#06D6A0` | Success states |
| `error` | `#EF476F` | Errors, destructive actions |
| `warning` | `#FFD166` | Warnings |
| `border` | `#2A2A3A` | Dividers, borders |
| `live` | `#FF0000` | Live indicator |
| `verified` | `#3A86FF` | Verified badge |

### 1.2 Typography

| Style | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
| H1 | Inter | 28px | 700 | 34px |
| H2 | Inter | 22px | 700 | 28px |
| H3 | Inter | 18px | 600 | 24px |
| Body | Inter | 16px | 400 | 22px |
| BodySmall | Inter | 14px | 400 | 20px |
| Caption | Inter | 12px | 400 | 16px |
| Button | Inter | 16px | 600 | 22px |
| Coin | JetBrains Mono | 18px | 700 | 24px |

### 1.3 Spacing Scale

`4, 8, 12, 16, 20, 24, 32, 40, 48, 64` (px)

### 1.4 Component Library

| Component | Variants |
|-----------|----------|
| Button | primary, secondary, outline, ghost, danger |
| Input | text, password, search, phone, OTP |
| Avatar | xs(24), sm(32), md(48), lg(64), xl(96) |
| Badge | verified, live, subscriber, tier |
| Card | post, creator, live, subscription |
| Modal | bottomSheet, center, fullscreen |
| Toast | success, error, info, warning |
| Skeleton | text, avatar, card, list |
| TabBar | bottom (5 tabs), top (scrollable) |
| GiftAnimation | lottie overlay, full-screen burst |

---

## 2. Navigation Architecture

### 2.1 Bottom Tab Navigator

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  Home   │ Discover│ Go Live │  Chat   │ Profile │
│  🏠     │  🔍     │  📹     │  💬     │  👤     │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### 2.2 Stack Navigators

| Stack | Screens |
|-------|---------|
| AuthStack | Splash → Onboarding → Login → Signup → OTP → ForgotPassword |
| HomeStack | HomeFeed → PostDetail → Comments → CreatorProfile |
| DiscoverStack | Discover → Search → CategoryDetail → TrendingCreators |
| LiveStack | LiveHome → LiveRoom → MultiGuest → PKBattle → LiveEnd |
| ChatStack | ChatList → ChatRoom → MediaViewer |
| ProfileStack | Profile → EditProfile → Settings → Wallet → Subscriptions |
| CreateStack | UploadSelect → CameraCapture → EditPost → Publish |

### 2.3 Deep Link Schema

| Path | Screen |
|------|--------|
| `Zemin://creator/:username` | CreatorProfile |
| `Zemin://post/:postId` | PostDetail |
| `Zemin://live/:roomId` | LiveRoom |
| `Zemin://chat/:conversationId` | ChatRoom |
| `Zemin://subscribe/:creatorId` | SubscriptionTiers |

---

## 3. Screen Inventory

| # | Screen | Module | Priority |
|---|--------|--------|----------|
| 1 | Splash | Auth | P0 |
| 2 | Onboarding | Auth | P0 |
| 3 | Login | Auth | P0 |
| 4 | Signup | Auth | P0 |
| 5 | OTP Verification | Auth | P0 |
| 6 | Forgot Password | Auth | P0 |
| 7 | Home Feed | Feed | P0 |
| 8 | Discover | Discovery | P0 |
| 9 | Search | Discovery | P0 |
| 10 | Creator Profile | Profile | P0 |
| 11 | Post Detail | Feed | P0 |
| 12 | Comments | Feed | P0 |
| 13 | Stories Viewer | Stories | P0 |
| 14 | Upload Select | Create | P0 |
| 15 | Camera Capture | Create | P0 |
| 16 | Edit Post | Create | P0 |
| 17 | Publish Post | Create | P0 |
| 18 | Chat List | Chat | P0 |
| 19 | Chat Room | Chat | P0 |
| 20 | Wallet | Payments | P0 |
| 21 | Coin Store | Payments | P0 |
| 22 | Gift Catalog | Gifts | P0 |
| 23 | Live Home | Live | P0 |
| 24 | Live Room (Viewer) | Live | P0 |
| 25 | Live Room (Host) | Live | P0 |
| 26 | Multi-Guest Live | Live | P0 |
| 27 | PK Battle | Live | P0 |
| 28 | Notifications | System | P0 |
| 29 | Settings | System | P0 |
| 30 | Edit Profile | Profile | P0 |
| 31 | Subscription Tiers | Subscriptions | P0 |
| 32 | Creator Dashboard | Creator | P0 |
| 33 | Earnings | Creator | P0 |
| 34 | Withdraw | Creator | P0 |
| 35 | Admin Dashboard | Admin | P0 |

*Full inventory: 180–250 screens across all modules.*

---

## 4. Authentication Screens

### 4.1 Splash Screen

**Screen ID:** `SCR-AUTH-001`  
**Purpose:** Brand introduction while app initializes.

**Components:**
- Full-screen gradient background (`primary` → `secondary`)
- Zemin logo (animated fade-in)
- Loading indicator (bottom)

**User Interactions:**
- None (auto-navigate after 2s)

**Navigation:**
- If authenticated → Home Feed
- If first launch → Onboarding
- Else → Login

**API Connections:** `GET /api/auth/me` (token validation)

**States:**
| State | Behavior |
|-------|----------|
| Loading | Logo pulse animation, check stored token |
| Error (network) | Retry button, "Check connection" message |
| Success | Fade transition to next screen |

---

### 4.2 Onboarding Screen

**Screen ID:** `SCR-AUTH-002`  
**Purpose:** Introduce platform value propositions to new users.

**Components:**
- Horizontal pager (3 slides)
- Illustration per slide (Lottie animation)
- Title + description text
- Dot indicators
- "Skip" button (top-right)
- "Next" / "Get Started" button

**Slides:**
1. "Discover Amazing Creators" — discover illustration
2. "Go Live & Connect" — live streaming illustration
3. "Support Your Favorites" — gifts/subscriptions illustration

**Validation:** None  
**Navigation:** Get Started → Signup  
**API Connections:** None  
**States:** Static content only

---

### 4.3 Login Screen

**Screen ID:** `SCR-AUTH-003`  
**Purpose:** Authenticate returning users.

**Components:**
- Email/phone input field
- Password input field (toggle visibility icon)
- "Forgot Password?" link
- "Login" primary button
- Divider "or continue with"
- Google login button
- Apple login button
- "Don't have an account? Sign Up" link

**Validation Rules:**
| Field | Rule | Error Message |
|-------|------|---------------|
| Email/Phone | Required, valid format | "Enter a valid email or phone" |
| Password | Required, min 8 chars | "Password must be at least 8 characters" |

**User Interactions:**
- Tap Login → validate → API call → navigate to Home
- Tap Google/Apple → OAuth flow
- Tap Sign Up → navigate to Signup

**API Connections:**
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/apple`

**States:**
| State | UI |
|-------|-----|
| Empty | Default form |
| Loading | Button spinner, inputs disabled |
| Error (401) | "Invalid email or password" toast |
| Error (423) | "Account locked. Try again in X minutes" |
| Success | Navigate to Home, store tokens |

---

### 4.4 Signup Screen

**Screen ID:** `SCR-AUTH-004`  
**Purpose:** Register new user accounts.

**Components:**
- Username input (with availability check)
- Email or phone input
- Password input (strength meter)
- Confirm password input
- Terms & Privacy checkbox
- "Create Account" button
- Social signup options

**Validation Rules:**
| Field | Rule | Error Message |
|-------|------|---------------|
| Username | 3–20 chars, alphanumeric+underscore, unique | "Username taken" / "Invalid format" |
| Email | Valid email, unique | "Email already registered" |
| Phone | Valid E.164 format, unique | "Phone already registered" |
| Password | Min 8 chars, 1 upper, 1 lower, 1 number | "Password too weak" |
| Confirm | Must match password | "Passwords don't match" |
| Terms | Must be checked | "Accept terms to continue" |

**API Connections:**
- `GET /api/auth/check-username?username=`
- `POST /api/auth/register`

**Navigation:** Success → OTP Verification

---

### 4.5 OTP Verification Screen

**Screen ID:** `SCR-AUTH-005`  
**Purpose:** Verify email/phone ownership.

**Components:**
- 6-digit OTP input boxes (auto-focus next)
- "Code sent to +91 XXXXX 1234" text
- Countdown timer (60s)
- "Resend Code" button (enabled after timer)
- "Verify" button

**Validation:**
| Rule | Error |
|------|-------|
| 6 digits required | "Enter complete code" |
| Code expires in 5 min | "Code expired. Request new one" |
| Max 3 attempts | "Too many attempts. Request new code" |

**API Connections:**
- `POST /api/auth/verify-otp`
- `POST /api/auth/resend-otp`

**Navigation:** Success → Interest Selection → Home

---

## 5. Home & Discovery Screens

### 5.1 Home Feed Screen

**Screen ID:** `SCR-FEED-001`  
**Purpose:** Primary content consumption screen showing posts from followed creators.

**Components:**
- Top bar: Zemin logo, search icon, notification bell (badge count)
- Stories row (horizontal scroll, avatar rings)
- Feed tabs: "Following" | "For You"
- Post cards (infinite scroll):
  - Creator avatar + name + verified badge + timestamp
  - Post media (image/video with play button)
  - PPV lock overlay (if applicable)
  - Like, comment, share, gift, save actions
  - Like count, comment count
  - Caption (truncated, "more" expand)
- Pull-to-refresh
- FAB: Create post (creators only)

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Tap story avatar | Open Stories Viewer |
| Tap creator name | Navigate to Creator Profile |
| Tap post media | Open Post Detail / play video |
| Tap PPV lock | Show purchase modal |
| Double-tap media | Like + heart animation |
| Tap like | Toggle like, haptic feedback |
| Tap comment | Open Comments sheet |
| Tap gift | Open Gift Catalog |
| Scroll down | Load more (pagination) |

**API Connections:**
- `GET /api/feed/following?page=&limit=20`
- `GET /api/feed/for-you?page=&limit=20`
- `GET /api/stories/following`
- `POST /api/post/like`
- `POST /api/post/unlike`

**States:**
| State | UI |
|-------|-----|
| Loading | Skeleton cards (3) |
| Empty (Following) | "Follow creators to see posts" + Discover CTA |
| Empty (For You) | "Explore trending content" CTA |
| Error | Retry banner |
| End of feed | "You're all caught up!" |

---

### 5.2 Discover Screen

**Screen ID:** `SCR-DISC-001`  
**Purpose:** Explore new creators and trending content.

**Components:**
- Search bar (tap → Search screen)
- Category chips (horizontal scroll): All, Music, Dance, Gaming, Art, Fitness, Comedy, Lifestyle
- "Trending Creators" horizontal carousel
- "Live Now" section (live room cards with viewer count)
- "Recommended For You" grid (creator cards)
- "Top Earners This Week" list
- Banner carousel (admin-managed promotions)

**API Connections:**
- `GET /api/discover/categories`
- `GET /api/discover/trending-creators`
- `GET /api/discover/live-now`
- `GET /api/discover/recommended`
- `GET /api/banners/active`

---

### 5.3 Search Screen

**Screen ID:** `SCR-DISC-002`  
**Purpose:** Full-text search across creators, posts, hashtags.

**Components:**
- Search input (auto-focus, clear button)
- Recent searches (local storage, clear all)
- Tab filters: All | Creators | Posts | Hashtags | Live
- Results list (type-specific cards)
- Empty state: "No results for '{query}'"

**Validation:** Min 2 characters to trigger search (300ms debounce)

**API Connections:**
- `GET /api/search?q=&type=&page=`

---

## 6. Creator Profile & Feed Screens

### 6.1 Creator Profile Screen

**Screen ID:** `SCR-PROF-001`  
**Purpose:** Display creator identity, content, and monetization options.

**Components:**
- Banner image (parallax scroll)
- Avatar (overlapping banner, live ring if live)
- Display name + @username + verified badge
- Bio text + social links
- Stats row: Posts | Followers | Following | Subscribers
- Action buttons: Follow/Unfollow | Subscribe | Message | Gift
- Subscription tier pills (horizontal scroll)
- Content tabs: Posts | Stories | Reels | Live Replays | About
- Content grid (3-column masonry)
- PPV lock icon on premium posts

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Tap Follow | Toggle follow, update count |
| Tap Subscribe | Open Subscription Tiers modal |
| Tap Message | Open Chat (check DM access) |
| Tap Gift | Open Gift Catalog |
| Tap live ring | Join Live Room |
| Tap locked post | PPV purchase modal |

**API Connections:**
- `GET /api/creator/:username`
- `GET /api/creator/:id/posts?page=`
- `POST /api/follow`
- `POST /api/unfollow`
- `GET /api/subscription/tiers/:creatorId`

---

## 7. Content Creation Screens

### 7.1 Upload Select Screen

**Screen ID:** `SCR-CREATE-001`  
**Purpose:** Choose content type to create.

**Components:**
- Option cards: Post | Story | Reel | Go Live
- Recent drafts list
- Camera shortcut button

**Navigation:**
- Post → Camera/Gallery picker → Edit Post
- Story → Camera (story mode) → Publish
- Reel → Camera (reel mode) → Edit → Publish
- Go Live → Live Setup screen

---

### 7.2 Edit Post Screen

**Screen ID:** `SCR-CREATE-003`  
**Purpose:** Edit and configure post before publishing.

**Components:**
- Media preview (crop, filter, trim for video)
- Caption input (max 2200 chars, hashtag/mention autocomplete)
- Visibility toggle: Public | Subscribers Only | PPV
- PPV price input (if PPV selected)
- Subscription tier selector (if tier-locked)
- Location tag (optional)
- "Schedule" button (Phase 2)
- "Publish" primary button

**Validation:**
| Field | Rule |
|-------|------|
| Media | At least 1 image or video required |
| Caption | Max 2200 characters |
| PPV Price | Min $1.00 / ₹50, max $100.00 / ₹5000 |
| Tier | Required if visibility = tier-locked |

**API Connections:**
- `POST /api/upload/media` (multipart)
- `POST /api/post/create`

---

## 8. Chat Screens

### 8.1 Chat List Screen

**Screen ID:** `SCR-CHAT-001`  
**Purpose:** Display all conversations.

**Components:**
- Search conversations input
- Conversation rows:
  - Avatar + online indicator
  - Name + verified badge
  - Last message preview (truncated)
  - Timestamp
  - Unread badge count
- Empty state: "No messages yet"

**API Connections:**
- `GET /api/chat/conversations?page=`
- Socket: `chat:new_message` (real-time update)

---

### 8.2 Chat Room Screen

**Screen ID:** `SCR-CHAT-002`  
**Purpose:** 1:1 messaging between fan and creator.

**Components:**
- Header: avatar, name, online status, menu (report, block)
- Message list (inverted FlatList):
  - Text bubbles (sent: primary, received: surface)
  - Media messages (thumbnail + tap to expand)
  - PPV media (blurred + unlock button)
  - Tip messages (special styling)
  - Timestamps (grouped by date)
- Typing indicator
- Input bar: attach button, text input, send button
- Paid DM indicator (if creator charges per message)

**Validation:**
| Rule | Detail |
|------|--------|
| Text message | Max 5000 characters |
| Media | Max 50MB, image/video/audio |
| Paid DM | Fan must have sufficient wallet balance |

**API Connections:**
- `GET /api/chat/messages/:conversationId?page=`
- `POST /api/chat/send`
- `POST /api/chat/send-media`
- Socket: `chat:message`, `chat:typing`, `chat:read`

**States:**
| State | UI |
|-------|-----|
| Loading | Message skeleton |
| Sending | Optimistic message with clock icon |
| Failed | Red exclamation, tap to retry |
| Paid DM blocked | "Add coins to send message" banner |

---

## 9. Wallet & Coins Screens

### 9.1 Wallet Screen

**Screen ID:** `SCR-WALLET-001`  
**Purpose:** Display balance and transaction history.

**Components:**
- Balance card: coin balance (large) + fiat equivalent
- "Buy Coins" CTA button
- Earnings card (creators only): available balance, pending, total earned
- "Withdraw" button (creators, if ≥ minimum)
- Transaction history list (paginated):
  - Icon (type-specific)
  - Description
  - Amount (+/-)
  - Date
  - Status badge
- Filter tabs: All | Purchases | Gifts | Subscriptions | Earnings | Withdrawals

**API Connections:**
- `GET /api/wallet/balance`
- `GET /api/wallet/transactions?page=&type=`

---

### 9.2 Coin Store Screen

**Screen ID:** `SCR-WALLET-002`  
**Purpose:** Purchase coin packages.

**Components:**
- Current balance display
- Coin package cards (grid):
  - Coin amount + bonus badge
  - Price in local currency
  - "Best Value" tag on recommended package
- Payment method selector (saved cards, Razorpay, Stripe)
- "Purchase" button
- Terms: "Coins are non-refundable"

**API Connections:**
- `GET /api/coin/packages`
- `POST /api/coin/purchase`
- `POST /api/payment/create-order`
- `POST /api/payment/verify`

---

## 10. Gifts Screens

### 10.1 Gift Catalog Screen

**Screen ID:** `SCR-GIFT-001`  
**Purpose:** Browse and send virtual gifts (bottom sheet overlay).

**Components:**
- Current coin balance (top-right)
- Category tabs: Popular | Basic | Premium | Exclusive
- Gift grid (4 columns):
  - Gift animation preview (tap to preview)
  - Gift name
  - Coin cost
- Quantity selector (1, 5, 10, 50, 99)
- "Send" button with total cost
- "Recharge" link if insufficient balance

**API Connections:**
- `GET /api/gift/catalog`
- `POST /api/gift/send`

**Validation:**
| Rule | Error |
|------|-------|
| Sufficient balance | "Not enough coins. Recharge?" |
| Valid recipient | "Creator not available" |
| Rate limit | Max 100 gifts/minute per user |

---

## 11. Live Streaming Screens

### 11.1 Live Home Screen

**Screen ID:** `SCR-LIVE-001`  
**Purpose:** Browse active live streams.

**Components:**
- "Go Live" FAB (creators)
- Category filter tabs
- Live room cards (2-column grid):
  - Stream thumbnail (auto-refresh every 10s)
  - LIVE badge + viewer count
  - Creator avatar + name
  - Stream title
  - Gift activity indicator
- "Recommended" section
- Pull-to-refresh

**API Connections:**
- `GET /api/live/active?page=&category=`

---

### 11.2 Live Room (Viewer) Screen

**Screen ID:** `SCR-LIVE-002`  
**Purpose:** Watch live stream and interact.

**Components:**
- Full-screen video player (WebRTC/LiveKit)
- Top overlay: creator info, viewer count, close button
- Live chat overlay (scrollable, semi-transparent, bottom-left)
- Right sidebar: gift button, share, follow
- Gift animation overlay (full-screen Lottie)
- Gift leaderboard (collapsible, top-right)
- Guest video tiles (multi-guest mode)
- PK battle score bar (PK mode)
- Bottom bar: chat input, gift button, like button (floating hearts)

**User Interactions:**
| Action | Behavior |
|--------|----------|
| Tap gift | Open Gift Catalog sheet |
| Send chat message | Appear in live chat overlay |
| Tap follow | Follow creator inline |
| Tap guest tile | Enlarge guest view |
| Swipe down | Exit with confirmation |
| Double-tap | Send heart animation |

**API Connections:**
- `POST /api/live/join`
- `POST /api/live/leave`
- Socket: `live:chat`, `live:gift`, `live:viewer_count`, `live:guest_join`, `live:pk_score`

**States:**
| State | UI |
|-------|-----|
| Connecting | "Joining stream..." spinner |
| Live | Full player + overlays |
| Reconnecting | "Connection lost. Reconnecting..." |
| Ended | "Stream ended" + creator suggestion cards |
| Subscriber-only | "Subscribe to watch" paywall |

---

### 11.3 Live Room (Host) Screen

**Screen ID:** `SCR-LIVE-003`  
**Purpose:** Broadcast live stream as creator.

**Components:**
- Camera preview (front/back toggle)
- Stream controls: mute mic, flip camera, beauty filter
- Viewer count + duration timer
- Live chat panel (moderatable)
- Gift feed (recent gifts scrolling)
- Guest management: invite, remove
- PK battle controls: challenge, accept, score
- Moderation: mute user, kick user, ban user
- "End Stream" button (confirmation dialog)

**API Connections:**
- `POST /api/live/create`
- `POST /api/live/end`
- `POST /api/live/invite-guest`
- Socket: `live:started`, `live:ended`, `live:gift_received`

---

### 11.4 Multi-Guest Live Screen

**Screen ID:** `SCR-LIVE-004`  
**Purpose:** Live room with up to 4 guest participants.

**Layout:**
```
┌──────────────────────────────┐
│         Host (large)          │
├──────────┬──────────┬────────┤
│ Guest 1  │ Guest 2  │ Guest 3│
├──────────┴──────────┴────────┤
│ Guest 4  │  [Invite +]       │
└──────────────────────────────┘
```

**Components:**
- Grid layout (host 50% top, guests 50% bottom)
- Guest request queue (fans request to join)
- Host controls: approve/deny requests, mute guest, remove guest
- Guest controls: mute self, leave guest spot

**API Connections:**
- `POST /api/live/request-guest`
- `POST /api/live/approve-guest`
- `POST /api/live/remove-guest`
- Socket: `live:guest_request`, `live:guest_approved`, `live:guest_removed`

---

### 11.5 PK Battle Screen

**Screen ID:** `SCR-LIVE-005`  
**Purpose:** Two creators compete for gifts during live stream.

**Layout:**
```
┌──────────────┬──────────────┐
│  Creator A   │  Creator B   │
│  (video)     │  (video)     │
├──────────────┴──────────────┤
│   Score: 1250  vs  980      │
│   ████████░░░░░░░░░░  Timer │
├─────────────────────────────┤
│        Live Chat + Gifts     │
└─────────────────────────────┘
```

**Components:**
- Split-screen video (Creator A | Creator B)
- Score bar with animated progress
- Countdown timer (3:00 default)
- Gift multiplier indicator (last 30s = 2x)
- Winner announcement animation (confetti)
- Rematch button

**Business Rules:**
- PK duration: 3, 5, or 10 minutes (host selects)
- Winner = creator with most gift coins received during battle
- Platform takes standard 20% from both sides
- 2x multiplier activated in final 30 seconds

**API Connections:**
- `POST /api/live/pk/challenge`
- `POST /api/live/pk/accept`
- `POST /api/live/pk/end`
- Socket: `live:pk_started`, `live:pk_score_update`, `live:pk_ended`

---

## 12. Notifications & Settings

### 12.1 Notifications Screen

**Screen ID:** `SCR-NOTIF-001`  
**Purpose:** Display all user notifications.

**Components:**
- Tab filters: All | Mentions | Gifts | Live | System
- "Mark all as read" button
- Notification rows (grouped by date):
  - Icon (type-specific)
  - Message text
  - Timestamp
  - Unread dot
  - Tap → navigate to relevant screen
- Empty state: "No notifications yet"

**Notification Types:**
| Type | Example | Deep Link |
|------|---------|-----------|
| follow | "@user started following you" | Profile |
| like | "@user liked your post" | PostDetail |
| comment | "@user commented on your post" | Comments |
| gift | "@user sent you a Rocket" | Wallet |
| subscription | "@user subscribed to your Premium tier" | Earnings |
| live | "@creator is live now!" | LiveRoom |
| pk | "@creator challenged you to a PK battle" | PKBattle |
| message | "@user sent you a message" | ChatRoom |
| withdrawal | "Your withdrawal of $100 has been processed" | Wallet |
| system | "Welcome to Zemin!" | — |

**API Connections:**
- `GET /api/notifications?page=&type=`
- `PUT /api/notifications/read-all`
- `PUT /api/notifications/:id/read`

---

### 12.2 Settings Screen

**Screen ID:** `SCR-SET-001`  
**Purpose:** App configuration and account management.

**Sections:**
| Section | Items |
|---------|-------|
| Account | Edit Profile, Change Password, Email/Phone, Delete Account |
| Privacy | Blocked Users, Who Can Message Me, Profile Visibility |
| Notifications | Push Preferences, Email Preferences |
| Payments | Payment Methods, Billing History |
| Creator | Creator Dashboard, Subscription Tiers, Payout Settings, DM Pricing |
| App | Language, Theme (Dark/Light/System), Data Usage |
| Support | Help Center, Report a Problem, Terms, Privacy Policy |
| Session | Log Out |

**API Connections:**
- `GET /api/user/settings`
- `PUT /api/user/settings`
- `DELETE /api/user/account`

---

## 13. Admin Dashboard Screens

See **Volume 9 — Admin Panel** for complete admin screen specifications.

**Key Admin Screens:**
| Screen | Purpose |
|--------|---------|
| Dashboard | KPIs, charts, recent activity |
| Users | Search, view, ban, edit users |
| Creators | Verification queue, earnings, content |
| Live Moderation | Active streams, force-end, ban |
| Reports | Content reports queue, actions |
| Payments | Transactions, withdrawals, refunds |
| Analytics | DAU, revenue, retention charts |
| Categories | Manage content categories |
| Notifications | Send push to segments |
| Banners | CMS for promotional banners |
| Roles | Admin user management, permissions |
| Settings | Platform configuration |

---

*End of Volume 2*
