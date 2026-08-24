import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { colors, spacing } from '../../theme';
import { liveApi } from '../../api';
import { LiveStreamerCard, LiveStreamerCardData } from '../../components/live/LiveStreamerCard';
import { liveStreamerCardStyles } from '../../components/live/LiveStreamerCard';
import { getGiftEmoji } from '../../components/live/LiveGiftEffects';

type Props = NativeStackScreenProps<HomeStackParamList, 'VipScreen'>;

interface VipRoom extends LiveStreamerCardData {
  host?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
    isVerified?: boolean;
  };
}

const CARD_GAP = spacing.sm ?? 8;
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = (SCREEN_WIDTH - spacing.md * 2 - CARD_GAP) / 2;

const formatTime = (iso?: string) => {
  if (!iso) return 'Starting soon';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const VipScreen = ({ navigation }: Props) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [rooms, setRooms] = useState<VipRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<VipRoom | null>(null);

  const loadRooms = useCallback(async () => {
    try {
      const res = await liveApi.getVipRooms();
      const mapped: VipRoom[] = (res.data || []).map((room: any) => ({
        id: String(room.id),
        title: room.title,
        displayName: room.host?.displayName || room.host?.username || 'Creator',
        username: room.host?.username,
        thumbnail: room.thumbnail || room.host?.avatar,
        viewers: room.viewerCount ?? 0,
        isLive: room.status === 'live',
        status: room.status,
        scheduledAt: room.scheduledAt,
        entryFeeCoins: room.entryFeeCoins,
        entryGift: room.entryGift,
        isJoinable: room.isJoinable,
        isVerified: room.host?.isVerified,
        host: room.host,
      }));
      setRooms(mapped);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRooms();
    }, [loadRooms])
  );

  const featured = useMemo(
    () => rooms.find((room) => room.status === 'live' && room.isJoinable !== false) || rooms[0],
    [rooms]
  );

  const openGiftPay = (room: VipRoom) => {
    if (room.status !== 'live') {
      Alert.alert('Not live yet', `This VIP room starts ${formatTime(room.scheduledAt)}`);
      return;
    }
    if (room.isJoinable === false) {
      Alert.alert('Room full', 'This VIP room already has a viewer.');
      return;
    }
    setSelectedRoom(room);
  };

  const payGiftAndJoin = async () => {
    if (!selectedRoom) return;
    setJoining(true);
    try {
      const room = selectedRoom;
      const joinRes = await liveApi.join(String(room.id));
      const joinData = joinRes.data;
      setSelectedRoom(null);
      navigation.navigate('LiveViewer', {
        roomId: String(room.id),
        title: room.title,
        hostName: room.displayName,
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
      setJoining(false);
    }
  };

  const renderItem = ({ item }: { item: VipRoom }) => (
    <View style={{ width: CARD_WIDTH }}>
      <LiveStreamerCard
        item={item}
        variant="vip"
        onPress={() => openGiftPay(item)}
        onGiftPress={() => openGiftPay(item)}
      />
    </View>
  );

  const giftEmoji = selectedRoom?.entryGift
    ? getGiftEmoji(
        selectedRoom.entryGift.giftId,
        selectedRoom.entryGift.name,
        selectedRoom.entryGift.emoji
      )
    : '🎁';
  const giftCost = selectedRoom?.entryGift?.coinCost ?? selectedRoom?.entryFeeCoins ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>VIP access</Text>
          <Text style={styles.title}>Private rooms</Text>
          <Text style={styles.subtitle}>Tap the gift on a card to pay and enter.</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
      </View>

      {featured ? (
        <View style={styles.featuredCard}>
          <Text style={styles.featuredLabel}>
            {featured.status === 'live' ? 'Featured live VIP' : 'Upcoming VIP'}
          </Text>
          <Text style={styles.featuredTitle}>{featured.title}</Text>
          <Text style={styles.featuredMeta}>
            {featured.displayName} • {featured.status === 'live' ? 'Live now' : formatTime(featured.scheduledAt)}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => String(item.id)}
          numColumns={2}
          columnWrapperStyle={liveStreamerCardStyles.gridRow}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRooms();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No VIP rooms yet</Text>
              <Text style={styles.emptySubtitle}>Creators can schedule private VIP sessions from Go Live</Text>
            </View>
          }
          renderItem={renderItem}
        />
      )}

      <Modal visible={!!selectedRoom} transparent animationType="fade" onRequestClose={() => setSelectedRoom(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalEyebrow}>Send entry gift</Text>
            <Text style={styles.modalTitle}>{selectedRoom?.title}</Text>
            <Text style={styles.modalHost}>to {selectedRoom?.displayName}</Text>

            <View style={styles.modalGiftBubble}>
              <Text style={styles.modalGiftEmoji}>{giftEmoji}</Text>
              <Text style={styles.modalGiftName}>{selectedRoom?.entryGift?.name || 'Entry Gift'}</Text>
              <Text style={styles.modalGiftCost}>🪙 {giftCost} coins</Text>
            </View>

            <Text style={styles.modalHint}>
              This gift is sent to the creator. Coins are deducted from your balance. You only pay once per room.
            </Text>

            <TouchableOpacity
              style={[styles.modalPayBtn, joining && styles.modalPayBtnDisabled]}
              onPress={payGiftAndJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalPayBtnText}>
                  {giftEmoji} Send gift & join
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSelectedRoom(null)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    margin: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 },
  subtitle: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,47,110,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  featuredCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuredLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  featuredTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 4 },
  featuredMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  loader: { marginTop: spacing.lg },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
  },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  emptySubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs, textAlign: 'center' },
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
    color: colors.textPrimary,
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
  modalGiftName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 8 },
  modalGiftCost: { color: '#f5b400', fontSize: 14, fontWeight: '700', marginTop: 4 },
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
});
