export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OTP: { userId: string; devOtp?: string; avatarUri?: string };
  ForgotPassword: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Wallet: undefined;
  BuyCoins: undefined;
  Withdraw: undefined;
  Settings: undefined;
  Subscriptions: undefined;
  GiftCatalog: undefined;
  SubscriptionTiers: { username: string; creatorId: string };
  CreatorProfile: { username: string };
  FollowList: { username: string; initialTab?: 'followers' | 'following' };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { conversationId: string; recipientName: string };
};

export type LiveStackParamList = {
  LiveHome: undefined;
  LiveHost: {
    roomId: string;
    title: string;
    webrtcToken?: string;
    livekitUrl?: string;
    livekitRoom?: string;
    livekitEnabled?: boolean;
  };
  LiveViewer: {
    roomId: string;
    title: string;
    hostName: string;
    hostId: string;
    webrtcToken?: string;
    livekitUrl?: string;
    livekitEnabled?: boolean;
    viewerCount?: number;
    preJoined?: boolean;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  GoLive: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
};
