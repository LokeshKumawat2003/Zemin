import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors as baseColors, typography, spacing } from '../../theme';
import { creatorApi, liveApi } from '../../api';
import { LiveStackParamList } from '../../navigation/types';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';
import { useLivePermissions } from '../../permissions/PermissionsContext';
import { GiftEntryPicker } from '../../components/live/GiftEntryPicker';
import { ScheduleDateTimePicker } from '../../components/live/ScheduleDateTimePicker';
import { GiftItem, getGiftEmoji } from '../../components/live/LiveGiftEffects';
import { LiveStreamerCard, LiveStreamerCardData } from '../../components/live/LiveStreamerCard';
import { useResponsive } from '../../hooks/useResponsive';

const colors = {
  ...baseColors,
  background: '#0d0b10',
  surface: '#18151c',
  surfaceAlt: '#211d27',
  primary: '#ff2f6e',
  accentPurple: '#7c3aed',
  gold: '#f5b400',
  text: '#ffffff',
  textSecondary: '#9b95a3',
  border: '#2a2530',
};

type Props = NativeStackScreenProps<LiveStackParamList, 'LiveHome'>;
type StreamMode = 'public' | 'vip';
type StartMode = 'instant' | 'scheduled';

const EmojiIcon = ({
  symbol,
  size = 16,
  color = '#fff',
  style,
}: {
  symbol: string;
  size?: number;
  color?: string;
  style?: any;
}) => <Text style={[{ fontSize: size, color }, style]}>{symbol}</Text>;

const formatScheduledTime = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const CARD_GAP = spacing.sm ?? 8;

export const LiveHomeScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { cardWidth } = useResponsive();
  const vipCardWidth = cardWidth;
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [vipRooms, setVipRooms] = useState<any[]>([]);
  const [streamMode, setStreamMode] = useState<StreamMode>('public');
  const [startMode, setStartMode] = useState<StartMode>('instant');
  const [title, setTitle] = useState('');
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [joiningGift, setJoiningGift] = useState(false);
  const [selectedJoinRoom, setSelectedJoinRoom] = useState<any | null>(null);
  const { ensureAll } = useLivePermissions(['camera', 'microphone']);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activeRes, vipRes] = await Promise.all([
        liveApi.getActive().catch(() => ({ data: [] })),
        liveApi.getVipRooms().catch(() => ({ data: [] })),
      ]);
      setLiveRooms(activeRes.data || []);
      setVipRooms(vipRes.data || []);
    } catch {
      setLiveRooms([]);
      setVipRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const ensureCreatorAccess = async () => {
    if (user?.isCreator) return;
    try {
      await creatorApi.apply({
        displayName: user?.displayName,
        bio: 'New creator on Zemin',
      });
      await dispatch(bootstrapAuth()).unwrap();
    } catch (e: any) {
      const message = e?.error?.message || e?.message || '';
      if (message.toLowerCase().includes('already a creator')) return;
      throw e;
    }
  };

  const navigateToHost = (
    roomId: string,
    streamTitle: string,
    webrtcToken?: string,
    livekitUrl?: string,
    livekitRoom?: string,
    livekitEnabled?: boolean
  ) => {
    navigation.navigate('LiveHost', {
      roomId,
      title: streamTitle,
      webrtcToken,
      livekitUrl,
      livekitRoom,
      livekitEnabled,
    });
  };

  const goLive = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Enter a stream title');
      return;
    }

    if (streamMode === 'vip') {
      if (!selectedGift) {
        Alert.alert('Gift required', 'Choose a gift viewers will send to enter your VIP room');
        return;
      }
      if (startMode === 'scheduled' && scheduledDate.getTime() <= Date.now()) {
        Alert.alert('Schedule required', 'Pick a future date and time');
        return;
      }
    }

    setStarting(true);
    try {
      await ensureCreatorAccess();

      const permissionResults = await ensureAll();
      const cameraGranted = permissionResults.camera === 'granted';
      const micGranted = permissionResults.microphone === 'granted';

      if (!cameraGranted || !micGranted) {
        Alert.alert('Permissions required', 'Camera and microphone access are needed before you can go live.');
        return;
      }

      if (streamMode === 'vip') {
        const createRes = await liveApi.createVip({
          title: title.trim(),
          entryGiftId: selectedGift!.giftId,
          entryFeeCoins: selectedGift!.coinCost,
          startMode,
          scheduledAt: startMode === 'scheduled' ? scheduledDate.toISOString() : undefined,
          category: 'vip',
        });
        const {
          roomId,
          webrtcToken,
          livekitUrl,
          livekitRoom,
          livekitEnabled,
        } = createRes.data;

        if (startMode === 'instant') {
          await liveApi.start(roomId);
          navigateToHost(roomId, title.trim(), webrtcToken, livekitUrl, livekitRoom, livekitEnabled);
        } else {
          Alert.alert(
            'VIP room scheduled',
            `Your VIP room is scheduled for ${formatScheduledTime(scheduledDate.toISOString())}. Start it from here when the time arrives.`
          );
        }
      } else {
        const createRes = await liveApi.create({ title: title.trim(), category: 'general' });
        const { roomId, webrtcToken, livekitUrl, livekitRoom, livekitEnabled } = createRes.data;
        await liveApi.start(roomId);
        navigateToHost(roomId, title.trim(), webrtcToken, livekitUrl, livekitRoom, livekitEnabled);
      }

      setTitle('');
      setSelectedGift(null);
      const resetDate = new Date();
      resetDate.setHours(resetDate.getHours() + 1, 0, 0, 0);
      setScheduledDate(resetDate);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || e?.message || 'Could not start live stream');
    } finally {
      setStarting(false);
    }
  };

  const startScheduledVip = async (room: any) => {
    if (!room?.id) return;
    setStarting(true);
    try {
      await ensureCreatorAccess();
      const permissionResults = await ensureAll();
      if (permissionResults.camera !== 'granted' || permissionResults.microphone !== 'granted') {
        Alert.alert('Permissions required', 'Camera and microphone access are needed.');
        return;
      }
      const startRes = await liveApi.start(String(room.id));
      const {
        roomId,
        webrtcToken,
        livekitUrl,
        livekitRoom,
        livekitEnabled,
        title: streamTitle,
      } = startRes.data;
      navigateToHost(
        String(roomId || room.id),
        streamTitle || room.title,
        webrtcToken,
        livekitUrl,
        livekitRoom,
        livekitEnabled
      );
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not start VIP room');
    } finally {
      setStarting(false);
    }
  };

  const renderRoomCard = (item: any) => (
    <TouchableOpacity
      key={String(item.id)}
      style={styles.roomCard}
      onPress={() =>
        navigation.navigate('LiveViewer', {
          roomId: String(item.id),
          title: item.title,
          hostName: item.host?.displayName || item.host?.username || 'Creator',
          hostId: String(item.host?.id || ''),
        })
      }
    >
      <Image
        source={{ uri: item.thumbnail || item.host?.avatar || 'https://via.placeholder.com/240' }}
        style={styles.roomImage}
      />
      <View style={styles.roomOverlay}>
        <View style={styles.roomTopRow}>
          <View style={styles.livePillSmall}>
            <View style={styles.liveDotSmall} />
            <Text style={styles.livePillText}>LIVE</Text>
          </View>
          <Text style={styles.viewerText}>{item.viewerCount || 0}</Text>
        </View>
        <View style={styles.roomInfo}>
          <Text numberOfLines={1} style={styles.roomTitle}>{item.title}</Text>
          <Text style={styles.roomHost}>@{item.host?.username || 'creator'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const mapVipRoom = (item: any): LiveStreamerCardData => ({
    id: String(item.id),
    title: item.title,
    displayName: item.host?.displayName || item.host?.username || 'Creator',
    username: item.host?.username,
    thumbnail: item.thumbnail || item.host?.avatar,
    viewers: item.viewerCount ?? 0,
    isLive: item.status === 'live',
    status: item.status,
    scheduledAt: item.scheduledAt,
    entryFeeCoins: item.entryFeeCoins,
    entryGift: item.entryGift,
    isJoinable: item.isJoinable,
    isVerified: item.host?.isVerified,
  });

  const openVipJoin = (item: any) => {
    const isMine = String(item.host?.id) === String(user?.id);
    const isLive = item.status === 'live';

    if (isMine && !isLive) {
      startScheduledVip(item);
      return;
    }
    if (!isLive) {
      Alert.alert('Not live yet', `Scheduled for ${formatScheduledTime(item.scheduledAt)}`);
      return;
    }
    if (item.isJoinable === false) {
      Alert.alert('Room full', 'This VIP room already has a viewer.');
      return;
    }
    setSelectedJoinRoom(item);
  };

  const payGiftAndJoin = async () => {
    if (!selectedJoinRoom) return;
    setJoiningGift(true);
    try {
      const joinRes = await liveApi.join(String(selectedJoinRoom.id));
      const joinData = joinRes.data;
      const room = selectedJoinRoom;
      setSelectedJoinRoom(null);
      navigation.navigate('LiveViewer', {
        roomId: String(room.id),
        title: room.title,
        hostName: room.host?.displayName || room.host?.username || 'Creator',
        hostId: String(room.host?.id || ''),
        preJoined: true,
        webrtcToken: joinData?.webrtcToken,
        livekitUrl: joinData?.livekitUrl,
        livekitEnabled: joinData?.livekitEnabled,
        viewerCount: joinData?.viewerCount,
      });
    } catch (e: any) {
      Alert.alert('Cannot join', e?.error?.message || 'Gift payment failed');
    } finally {
      setJoiningGift(false);
    }
  };

  const renderVipCard = (item: any) => {
    const isMine = String(item.host?.id) === String(user?.id);
    const isLive = item.status === 'live';
    const cardData = mapVipRoom(item);

    return (
      <View key={String(item.id)} style={{ width: vipCardWidth, marginBottom: CARD_GAP }}>
        <LiveStreamerCard
          item={cardData}
          variant="vip"
          onPress={() => openVipJoin(item)}
          onGiftPress={() => openVipJoin(item)}
        />
        {isMine && !isLive ? (
          <TouchableOpacity
            style={styles.vipStartBtnOverlay}
            onPress={() => startScheduledVip(item)}
            disabled={starting}
          >
            <Text style={styles.vipStartBtnText}>{starting ? 'Starting...' : 'Start VIP Room'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  };

  const joinGiftEmoji = selectedJoinRoom?.entryGift
    ? getGiftEmoji(
        selectedJoinRoom.entryGift.giftId,
        selectedJoinRoom.entryGift.name,
        selectedJoinRoom.entryGift.emoji
      )
    : '🎁';
  const joinGiftCost =
    selectedJoinRoom?.entryGift?.coinCost ?? selectedJoinRoom?.entryFeeCoins ?? 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.eyebrow}>Creator Studio</Text>
            <Text style={styles.title}>Live</Text>
          </View>
          <View style={styles.headerBadge}>
            <EmojiIcon symbol="🔴" size={10} color={colors.live} style={styles.badgeIcon} />
            <Text style={styles.headerBadgeText}>Now Streaming</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Go live</Text>
              <Text style={styles.heroTitle}>Public stream or VIP private room with gift entry</Text>
            </View>
            <View style={styles.heroBadgeIcon}>
              <EmojiIcon symbol="✨" size={20} color={colors.gold} />
            </View>
          </View>

          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeChip, streamMode === 'public' && styles.modeChipActive]}
              onPress={() => setStreamMode('public')}
            >
              <Text style={[styles.modeChipText, streamMode === 'public' && styles.modeChipTextActive]}>
                Public Live
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeChip, streamMode === 'vip' && styles.modeChipActive]}
              onPress={() => setStreamMode('vip')}
            >
              <Text style={[styles.modeChipText, streamMode === 'vip' && styles.modeChipTextActive]}>
                VIP Private
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.titleInput}
              placeholder={streamMode === 'vip' ? 'VIP room title' : "What's your stream about?"}
              placeholderTextColor={colors.textSecondary}
              value={title}
              onChangeText={setTitle}
            />

            {streamMode === 'vip' && (
              <>
                <GiftEntryPicker
                  selectedGiftId={selectedGift?.giftId}
                  onSelect={setSelectedGift}
                />

                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeChip, startMode === 'instant' && styles.modeChipActive]}
                    onPress={() => setStartMode('instant')}
                  >
                    <Text style={[styles.modeChipText, startMode === 'instant' && styles.modeChipTextActive]}>
                      Start instantly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeChip, startMode === 'scheduled' && styles.modeChipActive]}
                    onPress={() => setStartMode('scheduled')}
                  >
                    <Text style={[styles.modeChipText, startMode === 'scheduled' && styles.modeChipTextActive]}>
                      Schedule
                    </Text>
                  </TouchableOpacity>
                </View>

                {startMode === 'scheduled' ? (
                  <ScheduleDateTimePicker
                    value={scheduledDate}
                    onChange={setScheduledDate}
                    minimumDate={new Date()}
                  />
                ) : null}

                {selectedGift ? (
                  <View style={styles.selectedGiftPreview}>
                    <Text style={styles.selectedGiftEmoji}>
                      {getGiftEmoji(selectedGift.giftId, selectedGift.name, selectedGift.emoji)}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.selectedGiftTitle}>Entry gift: {selectedGift.name}</Text>
                      <Text style={styles.selectedGiftMeta}>Viewers send this gift • 🪙 {selectedGift.coinCost}</Text>
                    </View>
                  </View>
                ) : null}

                <Text style={styles.vipHint}>
                  Viewers tap the gift to pay and enter. One viewer per VIP room. You receive the gift coins.
                </Text>
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, starting && styles.primaryButtonDisabled]}
              onPress={goLive}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.buttonContent}>
                  <EmojiIcon symbol={streamMode === 'vip' ? '👑' : '▶️'} size={16} color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    {streamMode === 'vip'
                      ? startMode === 'instant'
                        ? 'Create & Start VIP'
                        : 'Schedule VIP Room'
                      : 'Start Stream'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>VIP Rooms</Text>
          <Text style={styles.sectionHint}>{vipRooms.length} available</Text>
        </View>
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : vipRooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No VIP rooms yet</Text>
            <Text style={styles.emptySubtitle}>Create a private VIP room with a gift entry fee</Text>
          </View>
        ) : (
          <View style={styles.vipGrid}>{vipRooms.map(renderVipCard)}</View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Public Live</Text>
          <Text style={styles.sectionHint}>{liveRooms.length} active</Text>
        </View>
        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : liveRooms.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No public streams</Text>
            <Text style={styles.emptySubtitle}>Be the first to go live!</Text>
          </View>
        ) : (
          <View style={styles.roomList}>{liveRooms.map(renderRoomCard)}</View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedJoinRoom}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedJoinRoom(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Send entry gift</Text>
            <Text style={styles.modalTitle}>{selectedJoinRoom?.title}</Text>
            <Text style={styles.modalHost}>
              to {selectedJoinRoom?.host?.displayName || selectedJoinRoom?.host?.username}
            </Text>

            <View style={styles.modalGiftBubble}>
              <Text style={styles.modalGiftEmoji}>{joinGiftEmoji}</Text>
              <Text style={styles.modalGiftName}>
                {selectedJoinRoom?.entryGift?.name || 'Entry Gift'}
              </Text>
              <Text style={styles.modalGiftCost}>🪙 {joinGiftCost} coins</Text>
            </View>

            <Text style={styles.modalHint}>
              Tap to send this gift to the creator. Coins are deducted from your balance once per room.
            </Text>

            <TouchableOpacity
              style={[styles.modalPayBtn, joiningGift && styles.modalPayBtnDisabled]}
              onPress={payGiftAndJoin}
              disabled={joiningGift}
            >
              {joiningGift ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPayBtnText}>{joinGiftEmoji} Send gift & join</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedJoinRoom(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  eyebrow: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontSize: 30,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  badgeIcon: {
    marginRight: 4,
  },
  headerBadgeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  heroGlow: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary + '22',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heroLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.text,
    flexShrink: 1,
    fontSize: 18,
  },
  heroBadgeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
  },
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  modeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(255,47,110,0.12)',
  },
  modeChipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  modeChipTextActive: {
    color: colors.primary,
  },
  inputCard: {
    gap: spacing.sm,
  },
  titleInput: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    fontWeight: '500',
  },
  vipHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  selectedGiftPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,47,110,0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,47,110,0.25)',
    padding: spacing.md,
  },
  selectedGiftEmoji: {
    fontSize: 36,
  },
  selectedGiftTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  selectedGiftMeta: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  vipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: spacing.md,
  },
  vipStartBtnOverlay: {
    backgroundColor: colors.accentPurple,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: -4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalEyebrow: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 6,
  },
  modalHost: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  modalGiftBubble: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,47,110,0.1)',
    borderRadius: 20,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,47,110,0.25)',
    marginBottom: spacing.md,
  },
  modalGiftEmoji: { fontSize: 56 },
  modalGiftName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  modalGiftCost: { color: colors.gold, fontSize: 14, fontWeight: '700', marginTop: 4 },
  modalHint: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  modalPayBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPayBtnDisabled: { opacity: 0.7 },
  modalPayBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalCancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  roomList: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  roomCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  roomOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  roomTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  livePillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.live,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  livePillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 4,
  },
  viewerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roomInfo: {
    gap: 2,
  },
  roomTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  roomHost: {
    color: '#f7f7f7',
    fontSize: 12,
    fontWeight: '600',
  },
  vipCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  vipCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  vipCardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  vipCardMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  vipCardSchedule: {
    color: colors.gold,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  vipStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  vipStatusLive: {
    backgroundColor: colors.primary,
  },
  vipStatusWaiting: {
    backgroundColor: colors.accentPurple,
  },
  vipStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  vipJoinBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  vipJoinBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  vipStartBtn: {
    backgroundColor: colors.accentPurple,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  vipStartBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
  vipFullText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  loadingCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
});
