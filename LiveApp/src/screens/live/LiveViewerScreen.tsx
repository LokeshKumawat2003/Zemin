import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LiveStreamPlayer } from '../../components/live/LiveStreamPlayer';
import {
  GiftBurstAnimation,
  GiftItem,
  GiftPickerModal,
  getGiftEmoji,
} from '../../components/live/LiveGiftEffects';
import { colors, typography, spacing } from '../../theme';
import { liveApi, walletApi } from '../../api';
import { LiveStackParamList } from '../../navigation/types';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { useLiveSocket, LiveGiftPayload } from '../../hooks/useSocket';
import { useAppSelector } from '../../redux/hooks';
import { socketManager } from '../../socket/socketClient';
import { isLiveKitConfigured } from '../../utils/livekit';

type Props = NativeStackScreenProps<LiveStackParamList & DiscoverStackParamList, 'LiveViewer'>;

type ChatMessage = {
  id: string;
  type: 'text' | 'gift';
  text?: string;
  isMine: boolean;
  userName: string;
  giftName?: string;
  coinCost?: number;
  giftEmoji?: string;
};

type GiftAnimation = {
  id: string;
  emoji: string;
  label: string;
};

const formatCount = (n: number) => {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

export const LiveViewerScreen = ({ route, navigation }: Props) => {
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
  } = route.params;
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380;
  const chatMaxHeight = Math.min(240, Math.max(180, height * 0.28));

  const user = useAppSelector((s) => s.auth.user);
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const chatListRef = useRef<FlatList<ChatMessage>>(null);

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
                },
              }
            : await liveApi.join(roomId);

        const [giftRes, balRes] = await Promise.all([
          walletApi.getGiftCatalog().catch(() => ({ data: { gifts: [] } })),
          walletApi.getBalance().catch(() => ({ data: { coinBalance: user?.coinBalance ?? 0 } })),
        ]);

        setViewerCount(joinRes.data.viewerCount || 0);
        setGifts(giftRes.data?.gifts || []);
        setCoinBalance(balRes.data?.coinBalance ?? user?.coinBalance ?? 0);

        const token = joinRes.data?.webrtcToken;
        const url = joinRes.data?.livekitUrl;
        const enabled = Boolean(joinRes.data?.livekitEnabled);

        setWebrtcToken(token);
        setLivekitUrl(url);
        setLivekitEnabled(enabled);

        if (!isLiveKitConfigured(token, enabled)) {
          setStreamConnecting(false);
          setStreamError('Live video server is not connected yet. Host camera preview works locally; viewers need LiveKit configured.');
        }
      } catch (e: any) {
        Alert.alert('Error', e?.error?.message || 'Could not join stream');
        navigation.goBack();
      }
    })();

    return () => {
      liveApi.leave(roomId).catch(() => {});
    };
  }, [roomId, navigation, user?.coinBalance, preJoined, initialToken, initialUrl, initialEnabled, initialViewerCount]);

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

  const addGiftAnimation = useCallback((emoji: string, label: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setGiftAnimations((prev) => [...prev, { id, emoji, label }]);
  }, []);

  const removeGiftAnimation = useCallback((id: string) => {
    setGiftAnimations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const appendGiftChat = useCallback((gift: LiveGiftPayload, isMine: boolean) => {
    const emoji = getGiftEmoji(gift.giftId, gift.giftName, gift.giftEmoji);
    setMessages((prev) => [
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
  }, []);

  const onLiveGift = useCallback(
    (gift: LiveGiftPayload) => {
      const emoji = getGiftEmoji(gift.giftId, gift.giftName, gift.giftEmoji);
      if (gift.senderId !== userId) {
        addGiftAnimation(emoji, `${gift.senderName} sent ${gift.giftName}`);
      }
      appendGiftChat(gift, gift.senderId === userId);
    },
    [userId, addGiftAnimation, appendGiftChat]
  );

  const onChatMessage = useCallback(
    (msg: { userId: string; text: string; sentAt: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${msg.sentAt}-${msg.userId}`,
          type: 'text',
          text: msg.text,
          isMine: msg.userId === userId,
          userName: msg.userId === userId ? 'You' : msg.userId.slice(-6),
        },
      ]);
    },
    [userId]
  );

  useLiveSocket(roomId, onChatMessage, setViewerCount, onLiveGift);

  useEffect(() => {
    chatListRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  const sendChat = () => {
    if (!chatText.trim()) return;
    socketManager.sendLiveChat(roomId, chatText.trim());
    setChatText('');
  };

  const sendGift = async (gift: GiftItem) => {
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

      setCoinBalance(res.data?.remainingBalance ?? coinBalance - gift.coinCost);
      setGiftModalVisible(false);

      const emoji = getGiftEmoji(gift.giftId, gift.name, gift.emoji);
      addGiftAnimation(emoji, `Sent ${gift.name}!`);
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not send gift');
    } finally {
      setSendingGift(false);
    }
  };

  const handleStreamConnected = useCallback(() => {
    setStreamConnecting(false);
    setStreamError(null);
  }, []);

  const handleStreamError = useCallback((message: string) => {
    setStreamConnecting(false);
    setStreamError(message || 'Could not connect to live video.');
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={StyleSheet.absoluteFill}>
        <LiveStreamPlayer
          title={title}
          hostName={hostName}
          viewers={viewerCount}
          livekitUrl={livekitUrl}
          webrtcToken={webrtcToken}
          livekitEnabled={livekitEnabled}
          connecting={streamConnecting}
          error={streamError}
          onConnected={handleStreamConnected}
          onStreamError={handleStreamError}
        />
        <View style={styles.backdrop} />
      </View>

      {giftAnimations.map((anim) => (
        <GiftBurstAnimation
          key={anim.id}
          emoji={anim.emoji}
          label={anim.label}
          onDone={() => removeGiftAnimation(anim.id)}
        />
      ))}

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.topBar}>
          <View style={styles.hostChip}>
            <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
              <Text style={styles.hostAvatarInitial}>{hostInitial}</Text>
            </View>
            <View style={styles.hostInfo}>
              <Text style={styles.hostName} numberOfLines={1}>
                {title || hostName || 'Live'}
              </Text>
              <Text style={styles.hostStatus}>Live now • {formatCount(viewerCount)} watching</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <View style={styles.viewerChip}>
              <Text style={styles.viewerIcon}>👁</Text>
              <Text style={styles.viewerText}>{formatCount(viewerCount)}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={chatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={[styles.chatList, { maxHeight: chatMaxHeight, right: isCompact ? 24 : 84 }]}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item.type === 'gift' ? (
              <View style={styles.chatRow}>
                <View style={[styles.chatAvatar, item.isMine && styles.chatAvatarMine]} />
                <View style={[styles.chatBubble, styles.giftBubble, item.isMine && styles.chatBubbleMine]}>
                  <Text style={styles.chatUser}>{item.userName}</Text>
                  <Text style={styles.giftChatText}>
                    {item.giftEmoji} sent {item.giftName} · 🪙 {item.coinCost}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.chatRow}>
                <View style={[styles.chatAvatar, item.isMine && styles.chatAvatarMine]} />
                <View style={[styles.chatBubble, item.isMine && styles.chatBubbleMine]}>
                  <Text style={styles.chatUser}>{item.userName}</Text>
                  <Text style={styles.chatText}>{item.text}</Text>
                </View>
              </View>
            )
          }
        />

        <View style={styles.bottomBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={chatText}
              onChangeText={setChatText}
              placeholder="Say something..."
              placeholderTextColor="rgba(255,255,255,0.62)"
              onSubmitEditing={sendChat}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={sendChat} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>

          {!keyboardVisible && (
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={() => setGiftModalVisible(true)}>
                <Text style={styles.quickActionIcon}>🎁</Text>
                <Text style={styles.quickActionLabel}>Gifts</Text>
              </TouchableOpacity>
              <View style={styles.coinChip}>
                <Text style={styles.coinChipText}>🪙 {coinBalance.toLocaleString()}</Text>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      <GiftPickerModal
        visible={giftModalVisible}
        gifts={gifts}
        coinBalance={coinBalance}
        sending={sendingGift}
        onClose={() => setGiftModalVisible(false)}
        onSelectGift={sendGift}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.36)',
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 24,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  hostChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexShrink: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  hostAvatar: { width: 34, height: 34, borderRadius: 17 },
  hostAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarInitial: { color: '#fff', fontSize: 15, fontWeight: '800' },
  hostInfo: { marginLeft: 8, flexShrink: 1 },
  hostName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hostStatus: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  viewerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  viewerIcon: { fontSize: 12, marginRight: 4 },
  viewerText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  chatList: {
    position: 'absolute',
    left: spacing.md,
    bottom: 120,
  },
  chatListContent: { paddingBottom: 8 },
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  chatAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  chatAvatarMine: { backgroundColor: 'rgba(255,255,255,0.42)' },
  chatBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chatBubbleMine: {
    backgroundColor: 'rgba(255, 45, 85, 0.24)',
  },
  giftBubble: {
    backgroundColor: 'rgba(245, 197, 24, 0.18)',
    borderColor: 'rgba(245, 197, 24, 0.35)',
  },
  chatUser: { color: '#f5c518', fontSize: 12, fontWeight: '700' },
  chatText: { color: '#fff', fontSize: 13, marginTop: 1 },
  giftChatText: { color: '#fff', fontSize: 13, marginTop: 1, fontWeight: '600' },
  bottomBar: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: Platform.OS === 'ios' ? 22 : 12,
    zIndex: 2,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.84)',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  input: { flex: 1, color: '#fff', fontSize: 14, paddingVertical: 2 },
  sendBtn: {
    marginLeft: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary || '#ff2d55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  quickActions: {
    flexDirection: 'row',
    marginTop: 10,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  quickActionIcon: { fontSize: 14, marginRight: 4 },
  quickActionLabel: { color: '#fff', fontSize: 12, fontWeight: '600' },
  coinChip: {
    backgroundColor: 'rgba(245, 197, 24, 0.22)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.4)',
  },
  coinChipText: { color: '#f5c518', fontSize: 12, fontWeight: '700' },
});
