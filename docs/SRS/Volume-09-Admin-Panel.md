# Volume 9 — Admin Panel

**Document ID:** Zemin-SRS-V09  
**Version:** 1.0.0  
**Tech Stack:** React, Vite, Material UI  
**Pages:** ~45  

---

## 1. Admin Panel Overview

Web-based admin dashboard for platform operators to manage users, creators, content, payments, live streams, and platform configuration.

### 1.1 Access URL

| Environment | URL |
|------------|-----|
| Production | `https://admin.Zemin.app` |
| Staging | `https://staging-admin.Zemin.app` |

---

## 2. Admin Roles & Permissions

| Permission | Super Admin | Finance Admin | Content Admin | Support Admin |
|-----------|:-----------:|:-------------:|:-------------:|:-------------:|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ✅ | ✅ |
| Ban/unban users | ✅ | ❌ | ✅ | ❌ |
| Verify creators | ✅ | ❌ | ✅ | ❌ |
| Moderate content | ✅ | ❌ | ✅ | ✅ |
| Moderate live streams | ✅ | ❌ | ✅ | ✅ |
| View transactions | ✅ | ✅ | ❌ | ❌ |
| Approve withdrawals | ✅ | ✅ | ❌ | ❌ |
| Process refunds | ✅ | ✅ | ❌ | ❌ |
| Manage categories | ✅ | ❌ | ✅ | ❌ |
| Manage banners (CMS) | ✅ | ❌ | ✅ | ❌ |
| Send notifications | ✅ | ❌ | ✅ | ❌ |
| Manage admin users | ✅ | ❌ | ❌ | ❌ |
| Platform settings | ✅ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ❌ |
| Audit logs | ✅ | ✅ | ❌ | ❌ |

---

## 3. Dashboard

**Route:** `/dashboard`  
**Screen ID:** `ADM-001`

### 3.1 KPI Cards

| Metric | Source |
|--------|--------|
| Total Users | users.count |
| Active Creators | creators.count (verified) |
| DAU | analytics (last 24h) |
| Live Now | live_rooms.count (status=live) |
| Revenue Today | transactions.sum (today) |
| Revenue This Month | transactions.sum (month) |
| Pending Withdrawals | withdraw_requests.count (pending) |
| Pending Reports | reports.count (pending) |

### 3.2 Charts

| Chart | Type | Period |
|-------|------|--------|
| User Registrations | Line | 30 days |
| Revenue | Area | 30 days |
| Live Streams | Bar | 7 days |
| Top Creators by Earnings | Table | This month |
| Content Reports | Pie | By reason |

### 3.3 Recent Activity Feed

- New creator applications
- Pending withdrawal requests
- Content reports
- Live streams started/ended

---

## 4. User Management

**Route:** `/users`  
**Screen ID:** `ADM-002`

### 4.1 Features

| Feature | Description |
|---------|-------------|
| Search | By username, email, phone, ID |
| Filter | Role, status (active/banned/deleted), date range |
| View profile | Full user details, activity history |
| Edit user | Update role, display name |
| Ban user | Set ban reason, duration (permanent/temporary) |
| Unban user | Restore access |
| Delete user | Soft delete with confirmation |
| View transactions | User's financial history |
| View content | User's posts, stories, live history |

### 4.2 User Detail View

```
┌─────────────────────────────────────────────┐
│  Avatar  @username  Role: Creator  ✅ Verified│
│  Email: user@email.com  Phone: +91...        │
│  Joined: Jan 15, 2026  Last Active: 2h ago  │
├─────────────────────────────────────────────┤
│  [Profile] [Content] [Transactions] [Reports]│
│  [Activity Log]                              │
├─────────────────────────────────────────────┤
│  Stats: 1,250 followers | 89 subscribers    │
│  Earnings: $650 this month | $5,200 total   │
│  Content: 45 posts | 120 stories | 48h live  │
├─────────────────────────────────────────────┤
│  Actions: [Edit] [Ban] [Verify] [Delete]    │
└─────────────────────────────────────────────┘
```

---

## 5. Creator Verification

**Route:** `/creators/pending`  
**Screen ID:** `ADM-003`

### 5.1 Verification Queue

| Column | Description |
|--------|-------------|
| Applicant | Username, display name, avatar |
| Applied | Date |
| Categories | Selected categories |
| ID Document | View uploaded ID (blurred for privacy) |
| Selfie | View verification selfie |
| Actions | Approve / Reject (with reason) |

### 5.2 Verification API

```
GET  /api/admin/creators/pending?page=1
PUT  /api/admin/creators/:id/verify    { action: "approve" }
PUT  /api/admin/creators/:id/verify    { action: "reject", reason: "..." }
```

---

## 6. Live Moderation

**Route:** `/live`  
**Screen ID:** `ADM-004`

### 6.1 Active Streams View

| Column | Description |
|--------|-------------|
| Creator | Avatar, name, verified badge |
| Title | Stream title |
| Category | Content category |
| Viewers | Current viewer count |
| Duration | Time live |
| Gifts | Total gift coins received |
| Actions | View stream, Force End, Ban Creator |

### 6.2 Moderation Actions

| Action | Effect |
|--------|--------|
| View stream | Open stream preview (WebRTC viewer) |
| Force end | Immediately end stream, notify viewers |
| Mute creator | Disable creator's chat in room |
| Ban creator | End stream + ban creator account |
| Ban viewer | Remove and ban specific viewer |

---

## 7. Reports Management

**Route:** `/reports`  
**Screen ID:** `ADM-005`

### 7.1 Report Queue

| Column | Description |
|--------|-------------|
| Reporter | Who reported |
| Target | Content/user reported (with preview) |
| Reason | spam, harassment, inappropriate, copyright, etc. |
| Description | Reporter's explanation |
| Date | When reported |
| Status | pending, reviewing, resolved, dismissed |
| Actions | View, Resolve, Dismiss, Escalate |

### 7.2 Resolution Actions

| Action | Effect |
|--------|--------|
| Remove content | Delete post/story/message |
| Warn user | Send warning notification |
| Ban user | Temporary or permanent ban |
| Dismiss | No action, mark as dismissed |
| Escalate | Assign to senior moderator |

---

## 8. Payments Management

**Route:** `/payments`  
**Screen ID:** `ADM-006`

### 8.1 Sub-sections

| Tab | Content |
|-----|---------|
| Transactions | All platform transactions with filters |
| Withdrawals | Pending/approved/completed withdrawal requests |
| Refunds | Refund requests and processing |
| Revenue | Revenue analytics and reports |

### 8.2 Withdrawal Approval

```
GET  /api/admin/withdrawals?status=pending
PUT  /api/admin/withdrawals/:id/approve
PUT  /api/admin/withdrawals/:id/reject  { reason: "..." }
```

---

## 9. Analytics

**Route:** `/analytics`  
**Screen ID:** `ADM-007`

### 9.1 Dashboards

| Dashboard | Metrics |
|-----------|---------|
| Growth | Registrations, DAU, MAU, retention curves |
| Revenue | GMV, platform revenue, ARPU, LTV |
| Creators | Active creators, avg earnings, top earners |
| Content | Posts/day, stories/day, live hours/day |
| Engagement | Session duration, messages/day, gifts/day |
| Live | Streams/day, avg viewers, peak concurrent |

### 9.2 Export

- CSV/Excel export for all data tables
- Date range selector
- Scheduled email reports (weekly/monthly)

---

## 10. Categories Management

**Route:** `/categories`  
**Screen ID:** `ADM-008`

CRUD operations for content categories:

| Field | Type |
|-------|------|
| Name | String |
| Slug | String (auto-generated) |
| Icon | Image upload |
| Sort Order | Number |
| Active | Boolean |

Default categories: Music, Dance, Gaming, Art, Fitness, Comedy, Lifestyle, Education, Food, Fashion

---

## 11. Notifications (Push)

**Route:** `/notifications/send`  
**Screen ID:** `ADM-009`

### 11.1 Send Push Notification

| Field | Description |
|-------|-------------|
| Title | Notification title |
| Body | Notification message |
| Target | All users, Creators only, Fans only, Custom segment |
| Deep Link | Optional in-app destination |
| Schedule | Send now or schedule for later |
| Image | Optional notification image |

---

## 12. Banners (CMS)

**Route:** `/banners`  
**Screen ID:** `ADM-010`

Manage promotional banners on Discover and Home screens:

| Field | Description |
|-------|-------------|
| Title | Internal name |
| Image | Banner image (1200×400 recommended) |
| Link Type | Creator profile, Post, Live room, External URL |
| Target ID | Linked entity ID |
| Position | discover, home |
| Start/End Date | Display schedule |
| Sort Order | Display priority |
| Active | Enable/disable |

---

## 13. Roles & Permissions

**Route:** `/admin-users`  
**Screen ID:** `ADM-011`

Manage admin panel users:

| Field | Description |
|-------|-------------|
| Email | Admin login email |
| Role | Super, Finance, Content, Support |
| Permissions | Granular permission overrides |
| Active | Enable/disable access |
| Last Login | Activity tracking |

---

## 14. Platform Settings

**Route:** `/settings`  
**Screen ID:** `ADM-012`

| Setting | Description |
|---------|-------------|
| Platform commission rate | Default 20% |
| Minimum withdrawal | Default $50 |
| Coin packages | Manage packages and pricing |
| Gift catalog | Manage gifts and coin costs |
| Maintenance mode | Enable/disable app access |
| Feature flags | Enable/disable features |
| Content policies | Terms, guidelines text |
| Email templates | Customize system emails |

---

## 15. Admin API Summary

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | /api/admin/dashboard | All admins |
| GET | /api/admin/users | content, support, super |
| PUT | /api/admin/users/:id/ban | content, super |
| GET | /api/admin/creators/pending | content, super |
| PUT | /api/admin/creators/:id/verify | content, super |
| GET | /api/admin/reports | content, support, super |
| PUT | /api/admin/reports/:id/resolve | content, super |
| GET | /api/admin/withdrawals | finance, super |
| PUT | /api/admin/withdrawals/:id/approve | finance, super |
| GET | /api/admin/live/active | content, super |
| POST | /api/admin/live/:roomId/end | content, super |
| GET | /api/admin/analytics/:type | super, finance, content |
| CRUD | /api/admin/categories | content, super |
| CRUD | /api/admin/banners | content, super |
| POST | /api/admin/notifications/send | content, super |
| CRUD | /api/admin/admin-users | super |
| GET/PUT | /api/admin/settings | super |
| GET | /api/admin/audit-logs | super, finance |

---

*End of Volume 9*
