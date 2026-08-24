import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
  AppState,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraType } from 'react-native-camera-kit';
import { LiveCameraPreview } from '../../components/live/LiveCameraPreview';
import { LiveKitHostVideo } from '../../components/live/LiveKitHostVideo';
import {
  GiftBurstAnimation,
  getGiftEmoji,
} from '../../components/live/LiveGiftEffects';
import { colors, spacing } from '../../theme';
import { liveApi } from '../../api';
import { LiveStackParamList } from '../../navigation/types';
import { useLiveSocket, LiveGiftPayload } from '../../hooks/useSocket';
import { socketManager } from '../../socket/socketClient';
import { useAppSelector } from '../../redux/hooks';

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveHost'>;

/** ---------- Types ---------- */
interface ChatMessage {
  id: string;
  type: 'message' | 'join' | 'gift';
  user?: string;
  avatar?: string;
  text?: string;
  giftName?: string;
  coinCost?: number;
  giftEmoji?: string;
}

type GiftAnimation = {
  id: string;
  emoji: string;
  label: string;
};

/** ---------- Helpers ---------- */
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

/** ---------- Floating heart ---------- */
const FloatingHeart = ({ onDone, color }: { onDone: () => void; color: string }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const driftX = (Math.random() - 0.5) * 60;
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -260,
        duration: 2600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: driftX,
        duration: 2600,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(1600),
        Animated.timing(opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ]),
    ]).start(({ finished }) => finished && onDone());
  }, []);

  return (
    <Animated.Text
      style={[
        styles.floatingHeart,
        {
          color,
          opacity,
          transform: [{ translateY }, { translateX }, { scale }],
        },
      ]}
    >
      ❤️
    </Animated.Text>
  );
};

const HEART_COLORS = ['#ff4d6d', '#ff8fab', '#a855f7', '#ff477e'];

export const LiveHostScreen = ({ route, navigation }: Props) => {
  const { roomId, title, webrtcToken, livekitUrl, livekitEnabled } = route.params;
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380;
  const chatMaxHeight = Math.min(240, Math.max(180, height * 0.28));
  const currentUser = useAppSelector((state) => state.auth.user);
  const hostAvatarUri = currentUser?.avatar || undefined;
  const hostInitial = (currentUser?.displayName || currentUser?.username || 'U').charAt(0).toUpperCase();

  const [viewers, setViewers] = useState(0);
  const [ending, setEnding] = useState(false);

  const handleViewerCount = useCallback((count: number) => {
    setViewers(Math.max(0, count - 1));
  }, []);
  const [elapsed, setElapsed] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hearts, setHearts] = useState<{ id: string; color: string }[]>([]);
  const [giftAnimations, setGiftAnimations] = useState<GiftAnimation[]>([]);
  const [giftCoinsEarned, setGiftCoinsEarned] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraFront, setIsCameraFront] = useState(true);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const autoEndTriggeredRef = useRef(false);

  /** live socket + timer setup */
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
          [{ text: 'OK', onPress: () => navigation.goBack() }]
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
      { text: 'End Stream', style: 'destructive', onPress: () => { void endStream(); } },
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
        void endStream(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [endStream, ending]);

  useEffect(() => {
    navigation.setOptions({
      headerBackVisible: false,
      headerLeft: () => (
        <TouchableOpacity onPress={confirmEndStream} style={styles.headerBackBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
      ),
    });
  }, [confirmEndStream, navigation]);

  const onSocketEvent = useCallback((payload: { userId: string; text: string; sentAt: string }) => {
    if (!payload?.text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `${payload.sentAt}-${payload.userId}`,
        type: 'message',
        user: payload.userId === currentUser?.id ? 'You' : `Viewer`,
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
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  /** keyboard visibility tracking so the input bar rises above the keyboard
   *  and secondary widgets (badges / road-to-star) hide out of the way */
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

  const sendComment = () => {
    const text = commentText.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-me`, type: 'message', user: 'You', text },
    ]);
    setCommentText('');
  };

  const sendHeart = () => {
    const id = `${Date.now()}-${Math.random()}`;
    const color = HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)];
    setHearts((prev) => [...prev, { id, color }]);
  };

  const removeHeart = (id: string) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={StyleSheet.absoluteFill}>
        <LiveKitHostVideo
          livekitUrl={livekitUrl}
          webrtcToken={webrtcToken}
          livekitEnabled={livekitEnabled}
          isMuted={isMuted}
          showFlip={false}
          cameraType={isCameraFront ? CameraType.Front : CameraType.Back}
          onCameraTypeChange={(type) => setIsCameraFront(type === CameraType.Front)}
          fallback={
            <LiveCameraPreview
              showFlip
              cameraType={isCameraFront ? CameraType.Front : CameraType.Back}
              onCameraTypeChange={(type) => setIsCameraFront(type === CameraType.Front)}
            />
          }
        />
        <View style={styles.backdrop} />
      </View>

      <KeyboardAvoidingView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.topBar}>
          <View style={styles.hostChip}>
            {hostAvatarUri ? (
              <Image source={{ uri: hostAvatarUri }} style={styles.hostAvatar} />
            ) : (
              <View style={[styles.hostAvatar, styles.hostAvatarFallback]}>
                <Text style={styles.hostAvatarInitial}>{hostInitial}</Text>
              </View>
            )}
            <View style={styles.hostInfo}>
              <Text style={styles.hostName} numberOfLines={1}>
                {title || currentUser?.displayName || currentUser?.username || 'Host'}
              </Text>
              <Text style={styles.hostStatus}>Live now • {formatDuration(elapsed)}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {giftCoinsEarned > 0 && (
              <View style={styles.earningsChip}>
                <Text style={styles.earningsText}>🪙 +{giftCoinsEarned.toLocaleString()}</Text>
              </View>
            )}
            <View style={styles.viewerChip}>
              <Text style={styles.viewerIcon}>👁</Text>
              <Text style={styles.viewerText}>{formatCount(viewers)}</Text>
            </View>
            <TouchableOpacity onPress={confirmEndStream} style={styles.closeBtn} disabled={ending}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View pointerEvents="none" style={styles.heartsColumn}>
          {hearts.map((h) => (
            <FloatingHeart key={h.id} color={h.color} onDone={() => removeHeart(h.id)} />
          ))}
        </View>

        {giftAnimations.map((anim) => (
          <GiftBurstAnimation
            key={anim.id}
            emoji={anim.emoji}
            label={anim.label}
            onDone={() => removeGiftAnimation(anim.id)}
          />
        ))}

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          style={[styles.chatList, { maxHeight: chatMaxHeight, right: isCompact ? 24 : 84 }]}
          contentContainerStyle={styles.chatListContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) =>
            item.type === 'join' ? (
              <View style={styles.joinToast}>
                <Text style={styles.joinToastText}>👋 {item.user} joined</Text>
              </View>
            ) : item.type === 'gift' ? (
              <View style={styles.chatRow}>
                <View style={[styles.chatAvatar, styles.chatAvatarFallback]} />
                <View style={[styles.chatBubble, styles.giftBubble]}>
                  <Text style={styles.chatUser}>{item.user}</Text>
                  <Text style={styles.giftChatText}>
                    {item.giftEmoji} sent {item.giftName} · 🪙 {item.coinCost}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.chatRow}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.chatAvatar} />
                ) : (
                  <View style={[styles.chatAvatar, styles.chatAvatarFallback]} />
                )}
                <View style={styles.chatBubble}>
                  <Text style={styles.chatUser}>{item.user}</Text>
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
              placeholder="Say something..."
              placeholderTextColor="rgba(255,255,255,0.62)"
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={sendComment}
              returnKeyType="send"
              blurOnSubmit={false}
            />
            <TouchableOpacity onPress={sendComment} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>

          {!keyboardVisible && (
            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.quickAction} onPress={() => setIsMuted((prev) => !prev)}>
                <Text style={styles.quickActionIcon}>{isMuted ? '🔇' : '🎙️'}</Text>
                <Text style={styles.quickActionLabel}>{isMuted ? 'Muted' : 'Mic'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => setIsCameraFront((prev) => !prev)}>
                <Text style={styles.quickActionIcon}>📷</Text>
                <Text style={styles.quickActionLabel}>{isCameraFront ? 'Front' : 'Back'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={sendHeart}>
                <Text style={styles.quickActionIcon}>🌹</Text>
                <Text style={styles.quickActionLabel}>Rose</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction}>
                <Text style={styles.quickActionIcon}>🎁</Text>
                <Text style={styles.quickActionLabel}>Gift</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
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
  hostAvatarInitial: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  hostInfo: { marginLeft: 8, flexShrink: 1 },
  hostName: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hostStatus: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 1 },

  headerActions: { flexDirection: 'row', alignItems: 'center' },
  earningsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 197, 24, 0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 197, 24, 0.45)',
  },
  earningsText: { color: '#f5c518', fontSize: 12, fontWeight: '800' },
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
  headerBackBtn: {
    marginLeft: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  headerBackText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },

  heartsColumn: {
    position: 'absolute',
    right: spacing.md,
    bottom: 150,
    width: 40,
    height: 260,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  floatingHeart: { position: 'absolute', bottom: 0, fontSize: 24 },

  chatList: {
    position: 'absolute',
    left: spacing.md,
    right: 84,
    bottom: 120,
  },
  chatListContent: { paddingBottom: 8 },
  joinToast: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(120, 80, 200, 0.68)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  joinToastText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  chatRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  chatAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  chatAvatarFallback: { backgroundColor: 'rgba(255,255,255,0.28)' },
  chatBubble: {
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexShrink: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chatUser: { color: '#f5c518', fontSize: 12, fontWeight: '700' },
  chatText: { color: '#fff', fontSize: 13, marginTop: 1 },
  giftBubble: {
    backgroundColor: 'rgba(245, 197, 24, 0.18)',
    borderColor: 'rgba(245, 197, 24, 0.35)',
  },
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
});