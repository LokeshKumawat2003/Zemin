# Volume 10 — Deployment

**Document ID:** Zemin-SRS-V10  
**Version:** 1.0.0  
**Pages:** ~35  

---

## 1. Infrastructure Overview

```
                    ┌─────────────┐
                    │  Cloudflare  │  DNS + CDN + DDoS
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │    Nginx     │  Reverse Proxy + SSL
                    │  (Load Bal.) │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ API Node  │ │ API Node  │ │ API Node  │  PM2 Cluster
        │ (Docker)  │ │ (Docker)  │ │ (Docker)  │
        └─────┬────┘ └─────┬────┘ └─────┬────┘
              │            │            │
              └────────────┼────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ MongoDB   │     │  Redis    │     │ LiveKit   │
   │ Atlas     │     │  (Docker) │     │ (Docker)  │
   └──────────┘     └──────────┘     └──────────┘
                           │
                    ┌──────▼──────┐
                    │  S3 / R2     │  Media Storage
                    └─────────────┘
```

---

## 2. VPS Setup

### 2.1 Server Specifications

| Server | Specs | Purpose |
|--------|-------|---------|
| API Server 1–3 | 4 vCPU, 8GB RAM, 80GB SSD | Express API (PM2) |
| LiveKit Server | 8 vCPU, 16GB RAM, 100GB SSD | WebRTC media |
| TURN Server | 2 vCPU, 4GB RAM, 40GB SSD | NAT traversal |
| Redis Server | 2 vCPU, 4GB RAM, 40GB SSD | Cache + queues |
| Admin Server | 2 vCPU, 4GB RAM, 40GB SSD | React admin panel |

**Recommended Provider:** DigitalOcean, Hetzner, or AWS EC2

### 2.2 Initial Server Setup

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx

# Setup firewall
ufw allow 22,80,443,3478,5349/tcp
ufw allow 3478/udp
ufw enable

# Create app user
useradd -m -s /bin/bash Zemin
usermod -aG docker Zemin
```

---

## 3. Docker Configuration

### 3.1 API Dockerfile

```dockerfile
# backend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app .
RUN addgroup -g 1001 -S nodejs && adduser -S Zemin -u 1001
USER Zemin
EXPOSE 3000
CMD ["node", "server.js"]
```

### 3.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    env_file: .env.production
    depends_on:
      - redis
    restart: always
    deploy:
      replicas: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
    restart: always

  livekit:
    image: livekit/livekit-server:latest
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    command: --config /etc/livekit.yaml
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api
    restart: always

  admin:
    build: ./admin
    ports:
      - "3001:80"
    restart: always

volumes:
  redis_data:
```

---

## 4. Nginx Configuration

```nginx
# nginx.conf
upstream api_backend {
    least_conn;
    server api:3000;
    keepalive 32;
}

upstream livekit_backend {
    server livekit:7880;
}

server {
    listen 443 ssl http2;
    server_name api.Zemin.app;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # API routes
    location /api/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 500M;
    }

    # Socket.IO
    location /socket.io/ {
        proxy_pass http://api_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # LiveKit WebSocket
    location /livekit/ {
        proxy_pass http://livekit_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

server {
    listen 443 ssl http2;
    server_name admin.Zemin.app;

    ssl_certificate /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;

    location / {
        proxy_pass http://admin:80;
    }
}
```

---

## 5. SSL/TLS

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Generate certificates
certbot --nginx -d api.Zemin.app -d admin.Zemin.app -d live.Zemin.app -d turn.Zemin.app

# Auto-renewal (cron)
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

---

## 6. PM2 Process Management

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'Zemin-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '1G',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: '/var/log/Zemin/error.log',
    out_file: '/var/log/Zemin/out.log',
  }],
};
```

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## 7. MongoDB Atlas

| Setting | Value |
|---------|-------|
| Cluster Tier | M30 (production), M10 (staging) |
| Region | Mumbai (ap-south-1) + US East (backup) |
| Replication | 3-node replica set |
| Storage | 500GB auto-scaling |
| Backup | Continuous cloud backup |
| IP Whitelist | API server IPs only |
| Database User | Least-privilege service account |

**Connection String:**
```
mongodb+srv://Zemin_app:<password>@Zemin-prod.xxxxx.mongodb.net/Zemin_production?retryWrites=true&w=majority
```

---

## 8. Redis Configuration

| Setting | Value |
|---------|-------|
| Version | 7.x |
| Memory | 512MB (Phase 1), 2GB (Phase 2) |
| Persistence | AOF (appendonly yes) |
| Eviction | allkeys-lru |
| Max connections | 1000 |

**Use Cases:**
- Session/token blacklist
- Rate limiting counters
- Feed cache
- Live room state (viewer counts, leaderboards)
- Bull job queue backend

---

## 9. Object Storage

| Provider | Usage |
|----------|-------|
| AWS S3 / Cloudflare R2 | Media uploads, live recordings |
| Cloudinary | Image optimization, video transcoding |

**Bucket Structure:**
```
Zemin-media/
├── avatars/
├── banners/
├── posts/
├── stories/
├── reels/
├── chat/
├── gifts/
├── recordings/
├── kyc/
└── thumbnails/
```

**CDN:** CloudFront or Cloudflare CDN in front of S3/R2

---

## 10. CI/CD Pipeline

### 10.1 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: cd backend && npm ci && npm test

  deploy-api:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t Zemin-api:${{ github.sha }} ./backend
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USER }} --password-stdin
          docker push Zemin-api:${{ github.sha }}
      - name: Deploy to servers
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.API_HOST }}
          username: Zemin
          key: ${{ secrets.SSH_KEY }}
          script: |
            docker pull Zemin-api:${{ github.sha }}
            docker-compose up -d api
            pm2 reload ecosystem.config.js

  deploy-admin:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: cd admin && npm ci && npm run build
      - name: Deploy admin panel
        # Upload build to admin server
```

### 10.2 Branch Strategy

| Branch | Environment | Auto-deploy |
|--------|------------|-------------|
| main | Production | Yes |
| staging | Staging | Yes |
| develop | Development | Manual |
| feature/* | Local | No |

---

## 11. Monitoring

| Tool | Purpose | Alerts |
|------|---------|--------|
| PM2 Plus | Process monitoring | CPU >80%, memory >90% |
| Sentry | Error tracking | New errors, error rate spike |
| UptimeRobot | Endpoint uptime | api.Zemin.app down |
| MongoDB Atlas | DB monitoring | Connections, slow queries |
| Redis INFO | Cache monitoring | Memory >80%, hit rate <70% |
| Nginx access logs | Traffic analysis | 5xx rate >1% |
| Custom dashboard | Business KPIs | Revenue drop, DAU drop |

### 11.1 Health Check Endpoints

```
GET /health          → { status: "ok", uptime: 12345 }
GET /health/db       → { mongodb: "connected", redis: "connected" }
GET /health/livekit  → { livekit: "connected" }
```

---

## 12. Backup & Disaster Recovery

| Component | Backup Strategy | RTO | RPO |
|-----------|----------------|-----|-----|
| MongoDB | Atlas continuous backup + daily snapshots | 1 hour | 1 hour |
| Redis | AOF persistence + daily RDB snapshot | 15 min | 5 min |
| S3 Media | Cross-region replication | 4 hours | 24 hours |
| Application code | Git (GitHub) | 30 min | 0 |
| SSL certificates | Certbot auto-renewal | 1 hour | N/A |
| Environment config | Encrypted secrets manager | 30 min | 0 |

### 12.1 Disaster Recovery Procedure

1. Detect outage (monitoring alerts)
2. Assess scope (API, DB, LiveKit, CDN)
3. If DB failure → Restore from Atlas snapshot
4. If API failure → Deploy to backup server / scale up
5. If LiveKit failure → Failover to backup LiveKit node
6. Verify health checks pass
7. Notify team via Slack/PagerDuty
8. Post-incident review within 24 hours

---

*End of Volume 10*
