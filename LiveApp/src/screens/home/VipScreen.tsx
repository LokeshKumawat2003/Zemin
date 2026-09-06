import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { colors, spacing } from '../../theme';
import { liveApi } from '../../api';
import type { LiveStreamerCardData } from '../../components/live/LiveStreamerCard';
import { VipGiftModal } from '../../components/home/VipGiftModal';
import { VipScreenHeader } from '../../components/home/VipScreenHeader';
import { VipRoomGrid } from '../../components/home/VipRoomGrid';

type Props = NativeStackScreenProps<HomeStackParamList, 'VipScreen'>;

interface VipRoom extends LiveStreamerCardData {
  host?: { id: string; username: string; displayName?: string; avatar?: string; isVerified?: boolean };
}

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

  return (
    <View style={styles.container}>
      <VipScreenHeader featured={featured} onBack={() => navigation.goBack()} formatTime={formatTime} />

      <VipRoomGrid rooms={rooms} loading={loading} refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadRooms(); }} onRoomPress={openGiftPay} />

      <VipGiftModal
        room={selectedRoom}
        joining={joining}
        onClose={() => setSelectedRoom(null)}
        onPay={payGiftAndJoin}
      />
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
