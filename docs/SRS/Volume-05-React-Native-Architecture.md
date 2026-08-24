# Volume 5 — React Native Architecture

**Document ID:** Zemin-SRS-V05  
**Version:** 1.0.0  
**Pages:** ~35  

---

## 1. Project Structure

```
Zemin-mobile/
├── android/                    # Android native project
├── ios/                        # iOS native project
├── src/
│   ├── api/                    # API client & endpoint modules
│   │   ├── client.ts           # Axios instance, interceptors
│   │   ├── auth.api.ts
│   │   ├── post.api.ts
│   │   ├── live.api.ts
│   │   ├── chat.api.ts
│   │   ├── wallet.api.ts
│   │   ├── gift.api.ts
│   │   ├── subscription.api.ts
│   │   └── index.ts
│   ├── assets/
│   │   ├── images/
│   │   ├── animations/         # Lottie gift animations
│   │   ├── fonts/
│   │   └── icons/
│   ├── components/
│   │   ├── common/             # Button, Input, Avatar, Badge, Card
│   │   ├── feed/               # PostCard, StoryRing, CommentItem
│   │   ├── live/               # LivePlayer, GiftOverlay, PKScoreBar
│   │   ├── chat/               # MessageBubble, ChatInput
│   │   ├── wallet/             # CoinPackage, TransactionItem
│   │   └── creator/            # TierCard, EarningsChart
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useSocket.ts
│   │   ├── useLiveStream.ts
│   │   ├── useInfiniteScroll.ts
│   │   ├── useDebounce.ts
│   │   └── usePermissions.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthStack.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── HomeStack.tsx
│   │   ├── DiscoverStack.tsx
│   │   ├── LiveStack.tsx
│   │   ├── ChatStack.tsx
│   │   ├── ProfileStack.tsx
│   │   └── linking.ts          # Deep link config
│   ├── redux/
│   │   ├── store.ts
│   │   ├── hooks.ts            # useAppDispatch, useAppSelector
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── userSlice.ts
│   │       ├── feedSlice.ts
│   │       ├── chatSlice.ts
│   │       ├── liveSlice.ts
│   │       ├── walletSlice.ts
│   │       └── notificationSlice.ts
│   ├── screens/
│   │   ├── auth/               # Splash, Login, Signup, OTP
│   │   ├── home/               # HomeFeed, PostDetail, Comments
│   │   ├── discover/           # Discover, Search, Categories
│   │   ├── profile/            # Profile, EditProfile, CreatorDashboard
│   │   ├── create/             # Upload, Camera, EditPost, Publish
│   │   ├── chat/               # ChatList, ChatRoom
│   │   ├── live/               # LiveHome, LiveRoom, PKBattle
│   │   ├── wallet/             # Wallet, CoinStore, Withdraw
│   │   ├── gifts/              # GiftCatalog
│   │   ├── settings/           # Settings, Notifications, Privacy
│   │   └── subscription/       # Tiers, ManageSubscriptions
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── storage.service.ts  # MMKV wrapper
│   │   ├── notification.service.ts
│   │   ├── media.service.ts    # Camera, gallery, compression
│   │   ├── payment.service.ts  # Razorpay/Stripe SDK
│   │   └── analytics.service.ts
│   ├── socket/
│   │   ├── socketClient.ts     # Socket.IO connection manager
│   │   ├── liveEvents.ts
│   │   ├── chatEvents.ts
│   │   └── notificationEvents.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   └── index.ts
│   ├── utils/
│   │   ├── formatters.ts       # Date, currency, number
│   │   ├── validators.ts
│   │   ├── permissions.ts
│   │   └── helpers.ts
│   ├── constants/
│   │   ├── api.constants.ts
│   │   ├── app.constants.ts
│   │   └── route.constants.ts
│   └── types/
│       ├── auth.types.ts
│       ├── user.types.ts
│       ├── post.types.ts
│       ├── live.types.ts
│       ├── chat.types.ts
│       ├── wallet.types.ts
│       └── navigation.types.ts
├── App.tsx
├── index.js
├── app.json
├── tsconfig.json
├── babel.config.js
├── metro.config.js
└── package.json
```

---

## 2. Key Dependencies

```json
{
  "dependencies": {
    "react": "19.0.0",
    "react-native": "0.86.0",
    "@react-navigation/native": "^7.0.0",
    "@react-navigation/bottom-tabs": "^7.0.0",
    "@react-navigation/native-stack": "^7.0.0",
    "@reduxjs/toolkit": "^2.5.0",
    "react-redux": "^9.2.0",
    "axios": "^1.7.0",
    "socket.io-client": "^4.8.0",
    "react-native-mmkv": "^3.2.0",
    "react-native-vision-camera": "^4.6.0",
    "react-native-video": "^6.9.0",
    "react-native-livekit": "^2.0.0",
    "@livekit/react-native": "^2.0.0",
    "lottie-react-native": "^7.2.0",
    "react-native-reanimated": "^3.16.0",
    "react-native-gesture-handler": "^2.21.0",
    "react-native-fast-image": "^8.6.0",
    "@react-native-firebase/messaging": "^21.0.0",
    "react-native-razorpay": "^2.3.0",
    "@stripe/stripe-react-native": "^0.40.0"
  }
}
```

---

## 3. State Management (Redux Toolkit)

### 3.1 Store Configuration

```typescript
// src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';
import feedReducer from './slices/feedSlice';
import chatReducer from './slices/chatSlice';
import liveReducer from './slices/liveSlice';
import walletReducer from './slices/walletSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
    feed: feedReducer,
    chat: chatReducer,
    live: liveReducer,
    wallet: walletReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefault) => getDefault({
    serializableCheck: { ignoredActions: ['live/setRoom'] },
  }),
});
```

### 3.2 Auth Slice Example

```typescript
// src/redux/slices/authSlice.ts
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: User | null;
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => { /* ... */ },
    logout: (state) => { /* clear all */ },
    updateToken: (state, action) => { /* ... */ },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.fulfilled, (state, action) => { /* ... */ })
      .addCase(refreshAccessToken.fulfilled, (state, action) => { /* ... */ });
  },
});
```

---

## 4. API Client

```typescript
// src/api/client.ts
import axios from 'axios';
import { storage } from '../services/storage.service';

const apiClient = axios.create({
  baseURL: 'https://api.Zemin.app/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = storage.getString('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      const refreshed = await refreshToken();
      if (refreshed) return apiClient(error.config);
      // Force logout
      store.dispatch(logout());
    }
    return Promise.reject(error.response?.data || error);
  }
);
```

---

## 5. Navigation Architecture

```typescript
// src/navigation/RootNavigator.tsx
const RootNavigator = () => {
  const { isAuthenticated, isLoading } = useAppSelector(state => state.auth);

  if (isLoading) return <SplashScreen />;

  return (
    <NavigationContainer linking={linking}>
      {isAuthenticated ? <MainTabNavigator /> : <AuthStack />}
    </NavigationContainer>
  );
};
```

### Tab Structure

| Tab | Stack | Primary Screens |
|-----|-------|----------------|
| Home | HomeStack | Feed, PostDetail, Comments |
| Discover | DiscoverStack | Discover, Search, Categories |
| Go Live | LiveStack | LiveSetup, LiveHost, LiveEnd |
| Chat | ChatStack | ChatList, ChatRoom |
| Profile | ProfileStack | Profile, Settings, Wallet |

---

## 6. Socket.IO Integration

```typescript
// src/socket/socketClient.ts
import { io, Socket } from 'socket.io-client';

class SocketManager {
  private socket: Socket | null = null;

  connect(token: string) {
    this.socket = io('https://api.Zemin.app', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    this.setupListeners();
  }

  joinLiveRoom(roomId: string) {
    this.socket?.emit('live:join', { roomId });
  }

  sendLiveChat(roomId: string, text: string) {
    this.socket?.emit('live:chat', { roomId, text });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const socketManager = new SocketManager();
```

---

## 7. Live Streaming (LiveKit)

```typescript
// src/hooks/useLiveStream.ts
import { Room, RoomEvent } from 'livekit-client';

export const useLiveStream = (roomId: string, role: 'host' | 'viewer') => {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState([]);

  const connect = async (token: string) => {
    const liveRoom = new Room({ adaptiveStream: true, dynacast: true });
    await liveRoom.connect('wss://live.Zemin.app', token);
    setRoom(liveRoom);

    if (role === 'host') {
      await liveRoom.localParticipant.enableCameraAndMicrophone();
    }
  };

  const disconnect = () => {
    room?.disconnect();
    setRoom(null);
  };

  return { room, participants, connect, disconnect };
};
```

---

## 8. Local Storage (MMKV)

```typescript
// src/services/storage.service.ts
import { MMKV } from 'react-native-mmkv';

export const storage = new MMKV({ id: 'Zemin-storage' });

export const StorageService = {
  setTokens: (access: string, refresh: string) => {
    storage.set('accessToken', access);
    storage.set('refreshToken', refresh);
  },
  getAccessToken: () => storage.getString('accessToken'),
  clearAll: () => storage.clearAll(),
  setUser: (user: User) => storage.set('user', JSON.stringify(user)),
  getUser: () => JSON.parse(storage.getString('user') || 'null'),
};
```

---

## 9. Performance Guidelines

| Area | Strategy |
|------|----------|
| Feed scrolling | FlashList, memoized PostCard, image caching (FastImage) |
| Video playback | Preload thumbnails, lazy load on viewport |
| Live streaming | Adaptive bitrate, disconnect inactive viewers |
| Chat | Inverted FlatList, paginate messages, optimistic UI |
| Images | CDN URLs with width params, WebP format |
| Bundle size | Code splitting by screen, lazy navigation |
| Memory | Release video players on unmount, limit cached images |

---

## 10. Environment Configuration

```typescript
// src/constants/api.constants.ts
const ENV = {
  development: {
    API_URL: 'http://localhost:3000/api/v1',
    SOCKET_URL: 'http://localhost:3000',
    LIVEKIT_URL: 'ws://localhost:7880',
  },
  staging: {
    API_URL: 'https://staging-api.Zemin.app/api/v1',
    SOCKET_URL: 'https://staging-api.Zemin.app',
    LIVEKIT_URL: 'wss://staging-live.Zemin.app',
  },
  production: {
    API_URL: 'https://api.Zemin.app/api/v1',
    SOCKET_URL: 'https://api.Zemin.app',
    LIVEKIT_URL: 'wss://live.Zemin.app',
  },
};
```

---

*End of Volume 5*
