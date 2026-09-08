import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, Platform, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { liveApi, walletApi } from '../../api';
import { GiftItem, getGiftEmoji } from '../../components/live/LiveGiftEffects';
import { LiveStackParamList } from '../../navigation/types';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { useLiveSocket, LiveGiftPayload } from '../../hooks/useSocket';
import { useAppSelector } from '../../redux/hooks';
import { socketManager } from '../../socket/socketClient';
import { isLiveKitConfigured } from '../../utils/livekit';

type Props = NativeStackScreenProps<
  LiveStackParamList & DiscoverStackParamList,
  'LiveViewer'
>;

export type ChatMessage = {
  id: string;
  type: 'text' | 'gift';
  text?: string;
  isMine: boolean;
  userName: string;
  giftName?: string;
  coinCost?: number;
  giftEmoji?: string;
};

export type GiftAnimation = {
  id: string;
  emoji: string;
  label: string;
};

const formatCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

export const useLiveViewerScreen = ({ route, navigation }: Props) => {
  const {
    roomId,
    title,
    hostName,
    hostId,
    preJoined,
    webrtcToken: initialToken,
    livekitUrl: initialUrl,
    livekitEnabled: initialEnabled,
    viewerCount: initialViewerCount,
    roomType: initialRoomType,
    entryGift: initialEntryGift,
  } = route.params;

  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const user = useAppSelector(s => s.auth.user);
  const userId = user?.id;
  const hostInitial = (hostName || title || 'U').charAt(0).toUpperCase();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [coinBalance, setCoinBalance] = useState(user?.coinBalance ?? 0);
  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [sendingGift, setSendingGift] = useState(false);
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimation[]>([]);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamConnecting, setStreamConnecting] = useState(true);
  const [livekitUrl, setLivekitUrl] = useState<string>();
  const [webrtcToken, setWebrtcToken] = useState<string>();
  const [livekitEnabled, setLivekitEnabled] = useState(false);
  const [playbackType, setPlaybackType] = useState<'livekit' | 'video'>('livekit');
  const [playbackUrl, setPlaybackUrl] = useState<string>();
  const [roomType, setRoomType] = useState<'public' | 'vip'>('public');
  const [entryGiftName, setEntryGiftName] = useState<string>();
  const [entryGiftEmoji, setEntryGiftEmoji] = useState<string>();
  const [entryGiftCost, setEntryGiftCost] = useState(0);
  const [hasLiveAccess, setHasLiveAccess] = useState(
    initialRoomType !== 'vip' || Boolean(preJoined && initialToken),
  );
  const [privateLockVisible, setPrivateLockVisible] = useState(false);
  const [unlockingPrivateLive, setUnlockingPrivateLive] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const chatListRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const joinRes =
          preJoined && initialToken
            ? {
                data: {
                  viewerCount: initialViewerCount || 0,
                  webrtcToken: initialToken,
                  livekitUrl: initialUrl,
                  livekitEnabled: initialEnabled,
                  roomType: initialRoomType,
                  entryGift: initialEntryGift,
                  hasPaidEntry: true,
                },
              }
            : await liveApi.join(roomId);

        const [giftRes, balRes] = await Promise.all([
          walletApi.getGiftCatalog().catch(() => ({ data: { gifts: [] } })),
          walletApi
            .getBalance()
            .catch(() => ({ data: { coinBalance: user?.coinBalance ?? 0 } })),
        ]);

        setViewerCount(joinRes.data.viewerCount || 0);
        setGifts(giftRes.data?.gifts || []);
        setCoinBalance(balRes.data?.coinBalance ?? user?.coinBalance ?? 0);

        const token = joinRes.data?.webrtcToken;
        const url = joinRes.data?.livekitUrl;
        const enabled = Boolean(joinRes.data?.livekitEnabled);
      const nextPlaybackType = joinRes.data?.playbackType === 'video' ? 'video' : 'livekit';
      const nextPlaybackUrl = joinRes.data?.playbackUrl;
      setRoomType(joinRes.data?.roomType === 'vip' ? 'vip' : 'public');
      setEntryGiftName(joinRes.data?.entryGift?.name);
      setEntryGiftEmoji(joinRes.data?.entryGift?.emoji);
      setEntryGiftCost(joinRes.data?.entryGift?.coinCost ?? joinRes.data?.entryFeeCoins ?? 0);
      const joinedPrivateRoom = joinRes.data?.roomType === 'vip';
      setHasLiveAccess(!joinedPrivateRoom || Boolean(joinRes.data?.hasPaidEntry));
      setPrivateLockVisible(joinedPrivateRoom && !joinRes.data?.hasPaidEntry);

        setWebrtcToken(token);
        setLivekitUrl(url);
        setLivekitEnabled(enabled);
      setPlaybackType(nextPlaybackType);
      setPlaybackUrl(nextPlaybackUrl);

      if (nextPlaybackType !== 'video' && !isLiveKitConfigured(token, enabled)) {
          setStreamConnecting(false);
          setStreamError(
            'Live video server is not connected yet. Host camera preview works locally; viewers need LiveKit configured.',
          );
        }
      } catch (e: any) {
        Alert.alert('Error', e?.error?.message || 'Could not join stream');
        navigation.goBack();
      }
    })();

    return () => {
      liveApi.leave(roomId).catch(() => {});
    };
  }, [
    roomId,
    navigation,
    user?.coinBalance,
    preJoined,
    initialToken,
    initialUrl,
    initialEnabled,
    initialViewerCount,
  ]);

  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () =>
      setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(hideEvt, () =>
      setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const addGiftAnimation = useCallback((emoji: string, label: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setGiftAnimations(prev => [...prev, { id, emoji, label }]);
  }, []);

  const removeGiftAnimation = useCallback((id: string) => {
    setGiftAnimations(prev => prev.filter(a => a.id !== id));
  }, []);

  const appendGiftChat = useCallback(
    (gift: LiveGiftPayload, isMine: boolean) => {
      const emoji = getGiftEmoji(gift.giftId, gift.giftName, gift.giftEmoji);
      setMessages(prev => [
        ...prev,
        {
          id: `gift-${gift.sentAt}-${gift.senderId}`,
          type: 'gift',
          isMine,
          userName: isMine ? 'You' : gift.senderName,
          giftName: gift.giftName,
          coinCost: gift.totalCoins,
          giftEmoji: emoji,
        },
      ]);
    },
    [],
  );

  const onLiveGift = useCallback(
    (gift: LiveGiftPayload) => {
      const emoji = getGiftEmoji(gift.giftId, gift.giftName, gift.giftEmoji);
      if (gift.senderId !== userId) {
        addGiftAnimation(emoji, `${gift.senderName} sent ${gift.giftName}`);
      }
      appendGiftChat(gift, gift.senderId === userId);
    },
    [userId, addGiftAnimation, appendGiftChat],
  );

  const onChatMessage = useCallback(
    (msg: { userId: string; userName?: string; text: string; sentAt: string; isFake?: boolean }) => {
      setMessages(prev => [
        ...prev,
        {
          id: `${msg.sentAt}-${msg.userId}`,
          type: 'text',
          text: msg.text,
          isMine: msg.userId === userId,
          userName: msg.userId === userId ? 'You' : msg.userName || msg.userId.slice(-6),
        },
      ]);
    },
    [userId],
  );

  useLiveSocket(roomId, onChatMessage, setViewerCount, onLiveGift, hasLiveAccess);

  useEffect(() => {
    const cleanup = socketManager.onLivePrivacyChanged((data) => {
      if (data.roomId !== roomId) return;
      setRoomType('vip');
      if (data.preservedViewerIds?.includes(userId || '')) return;
      setPrivateLockVisible(true);
      setHasLiveAccess(false);
      setEntryGiftCost(data.entryFeeCoins ?? 0);
      setEntryGiftName(data.entryGift?.name);
      setEntryGiftEmoji(data.entryGift?.emoji);
      setWebrtcToken(undefined);
      setLivekitEnabled(false);
    });
    return () => {
      cleanup?.();
    };
  }, [roomId, userId]);

  const unlockPrivateLive = useCallback(async () => {
    if (unlockingPrivateLive) return;
    setUnlockingPrivateLive(true);
    try {
      const joinRes = await liveApi.join(roomId);
      const data = joinRes.data;
      setWebrtcToken(data?.webrtcToken);
      setLivekitUrl(data?.livekitUrl);
      setLivekitEnabled(Boolean(data?.livekitEnabled));
      setRoomType(data?.roomType === 'vip' ? 'vip' : 'public');
      setEntryGiftName(data?.entryGift?.name);
      setEntryGiftEmoji(data?.entryGift?.emoji);
      setEntryGiftCost(data?.entryGift?.coinCost ?? data?.entryFeeCoins ?? 0);
      setHasLiveAccess(true);
      setPrivateLockVisible(false);
      setStreamConnecting(true);
    } catch (e: any) {
      Alert.alert('Cannot join', e?.error?.message || 'Send the entry gift to join this private live.');
    } finally {
      setUnlockingPrivateLive(false);
    }
  }, [roomId, unlockingPrivateLive]);

  useEffect(() => {
    const cleanup = socketManager.onLiveModerated((data) => {
      if (data.roomId !== roomId) return;
      Alert.alert(
        data.action === 'block' ? 'Blocked from live' : 'Removed from live',
        'You can no longer join this live room.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    });
    return () => {
      cleanup?.();
    };
  }, [navigation, roomId]);

  useEffect(() => {
    chatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendChat = useCallback(() => {
    if (!chatText.trim()) return;
    socketManager.sendLiveChat(roomId, chatText.trim());
    setChatText('');
  }, [chatText, roomId]);

  const sendGift = useCallback(
    async (gift: GiftItem) => {
      if (!hostId || sendingGift) return;
      if (coinBalance < gift.coinCost) {
        Alert.alert('Not enough coins', 'Buy more coins to send this gift.');
        return;
      }

      setSendingGift(true);
      try {
        const res = await walletApi.sendGift({
          giftId: gift.giftId,
          recipientId: hostId,
          quantity: 1,
          context: { type: 'live', roomId },
        });

        setCoinBalance(
          res.data?.remainingBalance ?? coinBalance - gift.coinCost,
        );
        setGiftModalVisible(false);

        const emoji = getGiftEmoji(gift.giftId, gift.name, gift.emoji);
        addGiftAnimation(emoji, `Sent ${gift.name}!`);
      } catch (e: any) {
        Alert.alert('Error', e?.error?.message || 'Could not send gift');
      } finally {
        setSendingGift(false);
      }
    },
    [coinBalance, hostId, roomId, sendingGift, addGiftAnimation],
  );

  const handleStreamConnected = useCallback(() => {
    setStreamConnecting(false);
    setStreamError(null);
  }, []);

  const handleStreamError = useCallback((message: string) => {
    setStreamConnecting(false);
    setStreamError(message || 'Could not connect to live video.');
  }, []);

  return {
    title,
    hostName,
    roomId,
    hostInitial,
    isCompact,
    messages,
    chatText,
    viewerCount,
    gifts,
    coinBalance,
    giftModalVisible,
    sendingGift,
    giftAnimations,
    streamError,
    streamConnecting,
    livekitUrl,
    webrtcToken,
    livekitEnabled,
    playbackType,
    playbackUrl,
    roomType,
    entryGiftName,
    entryGiftEmoji,
    entryGiftCost,
    privateLockVisible,
    unlockingPrivateLive,
    unlockPrivateLive,
    keyboardVisible,
    chatListRef,
    setChatText,
    setGiftModalVisible,
    sendChat,
    sendGift,
    handleStreamConnected,
    handleStreamError,
    removeGiftAnimation,
    formatCount,
  };
};
