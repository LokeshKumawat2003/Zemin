import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  Keyboard,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { liveApi, userApi } from '../../api';
import { getGiftEmoji } from '../../components/live/LiveGiftEffects';
import { useAppSelector } from '../../redux/hooks';
import { LiveStackParamList } from '../../navigation/types';
import { useLiveSocket, LiveGiftPayload } from '../../hooks/useSocket';
import { socketManager } from '../../socket/socketClient';

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveHost'>;

export interface ChatMessage {
  id: string;
  type: 'message' | 'join' | 'gift';
  userId?: string;
  user?: string;
  avatar?: string;
  text?: string;
  giftName?: string;
  coinCost?: number;
  giftEmoji?: string;
}

export type GiftAnimation = {
  id: string;
  emoji: string;
  label: string;
};

const HEART_COLORS = ['#ff4d6d', '#ff8fab', '#a855f7', '#ff477e'];

const formatDuration = (secs: number) => {
  const h = Math.floor(secs / 3600)
    .toString()
    .padStart(2, '0');
  const m = Math.floor((secs % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(secs % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const formatCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

export const useLiveHostScreen = ({ route, navigation }: Props) => {
  const { roomId, title, webrtcToken, livekitUrl, livekitEnabled } = route.params;
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380;
  const chatMaxHeight = Math.min(240, Math.max(180, height * 0.28));
  const currentUser = useAppSelector((state) => state.auth.user);
  const hostAvatarUri = currentUser?.avatar || undefined;
  const hostInitial = (currentUser?.displayName || currentUser?.username || 'U').charAt(0).toUpperCase();

  const [viewers, setViewers] = useState(0);
  const [ending, setEnding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hearts, setHearts] = useState<{ id: string; color: string }[]>([]);
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimation[]>([]);
  const [giftCoinsEarned, setGiftCoinsEarned] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraFront, setIsCameraFront] = useState(true);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);

  const listRef = useRef<any>(null);
  const autoEndTriggeredRef = useRef(false);

  const handleViewerCount = useCallback((count: number) => {
    setViewers(Math.max(0, count - 1));
  }, []);

  useEffect(() => {
    socketManager.connect();
    socketManager.joinLive(roomId);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      socketManager.leaveLive(roomId);
      clearInterval(t);
    };
  }, [roomId]);

  const endStream = useCallback(async (silent = false) => {
    if (ending) return;

    setEnding(true);
    try {
      const res = await liveApi.end(roomId);
      if (!silent) {
        Alert.alert(
          'Stream Ended',
          `Duration: ${res.data.duration}s\nPeak viewers: ${res.data.peakViewers}\nEarnings: $${res.data.earnings}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (e: any) {
      if (!silent) {
        Alert.alert('Error', e?.error?.message || 'Could not end stream');
      }
    } finally {
      setEnding(false);
    }
  }, [ending, navigation, roomId]);

  const confirmEndStream = useCallback(() => {
    Alert.alert('End Live?', 'This will stop your stream for all viewers.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'End Stream', style: 'destructive', onPress: () => { endStream(); } },
    ]);
  }, [endStream]);

  useEffect(() => {
    const backAction = () => {
      if (ending) return false;
      confirmEndStream();
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => subscription.remove();
  }, [confirmEndStream, ending]);

  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if ((nextState === 'background' || nextState === 'inactive') && !autoEndTriggeredRef.current && !ending) {
        autoEndTriggeredRef.current = true;
        endStream(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [endStream, ending]);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => null,
    });
  }, [navigation]);

  const onSocketEvent = useCallback((payload: { userId: string; text: string; sentAt: string }) => {
    if (!payload?.text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `${payload.sentAt}-${payload.userId}`,
        type: 'message',
        userId: payload.userId,
        user: payload.userId === currentUser?.id ? 'You' : 'Viewer',
        text: payload.text,
      },
    ]);
  }, [currentUser?.id]);

  const onLiveGift = useCallback((gift: LiveGiftPayload) => {
    const emoji = getGiftEmoji(gift.giftId, gift.giftName, gift.giftEmoji);
    const animId = `${Date.now()}-${Math.random()}`;
    setGiftAnimations((prev) => [
      ...prev,
      { id: animId, emoji, label: `${gift.senderName} sent ${gift.giftName}` },
    ]);
    setGiftCoinsEarned((prev) => prev + gift.totalCoins);
    setMessages((prev) => [
      ...prev,
      {
        id: `gift-${gift.sentAt}-${gift.senderId}`,
        type: 'gift',
        user: gift.senderName,
        giftName: gift.giftName,
        coinCost: gift.totalCoins,
        giftEmoji: emoji,
      },
    ]);
  }, []);

  const removeGiftAnimation = useCallback((id: string) => {
    setGiftAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useLiveSocket(roomId, onSocketEvent, handleViewerCount, onLiveGift);

  useEffect(() => {
    const cleanup = socketManager.onLiveUserRemoved((payload) => {
      if (payload.roomId !== roomId) return;
      setMessages((prev) => prev.filter((message) => message.userId !== payload.userId));
      setOpenCommentMenuId(null);
    });
    return () => {
      cleanup?.();
    };
  }, [roomId]);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const sendComment = useCallback(() => {
    const text = commentText.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-me`, type: 'message', user: 'You', text },
    ]);
    setCommentText('');
  }, [commentText]);

  const sendHeart = useCallback(() => {
    const id = `${Date.now()}-${Math.random()}`;
    const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    setHearts((prev) => [...prev, { id, color }]);
  }, []);

  const moderateUser = useCallback(async (targetUserId: string, action: 'remove' | 'block') => {
    setOpenCommentMenuId(null);
    setMessages((prev) => prev.filter((message) => message.userId !== targetUserId));

    try {
      if (action === 'block') {
        await userApi.blockUser(targetUserId);
      }
      socketManager.moderateLiveUser(roomId, targetUserId, action);
    } catch (error: any) {
      Alert.alert('Moderation failed', error?.error?.message || 'Could not update this viewer.');
    }
  }, [roomId]);

  const removeHeart = useCallback((id: string) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const toggleMute = useCallback(() => setIsMuted((prev) => !prev), []);
  const toggleCamera = useCallback(() => setIsCameraFront((prev) => !prev), []);

  return {
    roomId,
    title,
    webrtcToken,
    livekitUrl,
    livekitEnabled,
    isCompact,
    chatMaxHeight,
    currentUser,
    hostAvatarUri,
    hostInitial,
    viewers,
    ending,
    elapsed,
    commentText,
    keyboardVisible,
    messages,
    hearts,
    giftAnimations,
    giftCoinsEarned,
    isMuted,
    isCameraFront,
    listRef,
    handleViewerCount,
    confirmEndStream,
    setCommentText,
    setIsCameraFront,
    setIsMuted,
    sendComment,
    sendHeart,
    removeHeart,
    removeGiftAnimation,
    formatDuration,
    formatCount,
    toggleMute,
    toggleCamera,
    openCommentMenuId,
    setOpenCommentMenuId,
    moderateUser,
  };
};
