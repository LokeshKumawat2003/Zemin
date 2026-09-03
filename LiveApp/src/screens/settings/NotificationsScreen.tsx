import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { notificationApi, unwrapApiResponse } from '../../api';
import { Button } from '../../components/common/Button';
import { HomeStackParamList } from '../../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'Notifications'>;

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: {
    targetType?: string;
    targetId?: string;
    actorUsername?: string;
    actorName?: string;
    hostId?: string;
    hostName?: string;
    hostUsername?: string;
    roomTitle?: string;
    giftName?: string;
  };
  isRead: boolean;
  createdAt: string;
};

type FilterKey = 'all' | 'social' | 'gifts' | 'live' | 'messages' | 'system';

const FILTER_TABS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'social', label: 'Social' },
  { key: 'gifts', label: 'Gifts' },
  { key: 'live', label: 'Live' },
  { key: 'messages', label: 'Messages' },
  { key: 'system', label: 'System' },
];

const TYPE_ICONS: Record<string, string> = {
  follow: '👤',
  like: '❤️',
  comment: '💬',
  gift: '🎁',
  subscription: '⭐',
  live: '📹',
  message: '✉️',
  system: '🔔',
};

const SOCIAL_TYPES = new Set(['follow', 'like', 'comment']);
const GIFT_TYPES = new Set(['gift', 'subscription']);

const formatRelativeTime = (isoDate: string) => {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
};

const matchesFilter = (item: NotificationItem, filter: FilterKey) => {
  if (filter === 'all') return true;
  if (filter === 'social') return SOCIAL_TYPES.has(item.type);
  if (filter === 'gifts') return GIFT_TYPES.has(item.type);
  if (filter === 'live') return item.type === 'live';
  if (filter === 'messages') return item.type === 'message';
  return item.type === 'system';
};

export const NotificationsScreen = ({ navigation }: Props) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const filteredItems = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)),
    [items, filter]
  );

  const load = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1 && !append) {
      setError(null);
    }

    try {
      const res = await notificationApi.list(pageNum);
      const payload = unwrapApiResponse<
        NotificationItem[] | { data?: NotificationItem[]; meta?: { totalPages?: number } }
      >(res);
      const nextItems = (
        Array.isArray(payload) ? payload : payload?.data || []
      ) as NotificationItem[];
      const meta = Array.isArray(payload) ? {} : payload?.meta || {};
      const totalPages = meta.totalPages ?? 1;

      setItems((prev) => (append ? [...prev, ...nextItems] : nextItems));
      setPage(pageNum);
      setHasMore(pageNum < totalPages);
    } catch (e: any) {
      setError(e?.message || 'Could not load notifications');
      if (!append) {
        setItems([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load(1);
  };

  const loadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    load(page + 1, true);
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      load(1);
    } catch {
      Alert.alert('Error', 'Could not mark all as read');
    }
  };

  const handlePress = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationApi.markRead(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
      } catch {
        // Continue navigation even if mark-read fails.
      }
    }

    const data = item.data || {};
    const targetType = data.targetType || item.type;

    if (targetType === 'post' && data.targetId) {
      navigation.navigate('PostDetail', { postId: String(data.targetId) });
      return;
    }

    if ((targetType === 'user' || item.type === 'follow') && data.actorUsername) {
      navigation.navigate('CreatorProfile', { username: data.actorUsername });
      return;
    }

    if (targetType === 'live' && data.targetId) {
      navigation.navigate('LiveViewer', {
        roomId: String(data.targetId),
        title: data.roomTitle || item.title,
        hostName: data.hostName || 'Creator',
        hostId: String(data.hostId || data.targetId),
      });
      return;
    }

    if (targetType === 'chat' && data.targetId) {
      navigation.getParent()?.navigate('Chat', {
        screen: 'ChatRoom',
        params: {
          conversationId: String(data.targetId),
          recipientName: data.actorName || data.actorUsername || 'Chat',
        },
      });
      return;
    }

    if (item.type === 'gift' && data.actorUsername) {
      navigation.navigate('CreatorProfile', { username: data.actorUsername });
      return;
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.row, !item.isRead && styles.unread]}
      onPress={() => handlePress(item)}
    >
      <Text style={styles.icon}>{TYPE_ICONS[item.type] || '🔔'}</Text>
      <View style={styles.content}>
        <Text style={styles.rowTitle}>{item.title}</Text>
        <Text style={styles.rowBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        <Button title="Read all" variant="ghost" onPress={markAll} style={styles.readAll} />
      </View>

      <FlatList
        horizontal
        data={FILTER_TABS}
        keyExtractor={(tab) => tab.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.tab, filter === tab.key && styles.tabActive]}
            onPress={() => setFilter(tab.key)}
          >
            <Text style={[styles.tabText, filter === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Button title="Retry" onPress={() => load(1)} style={styles.retryBtn} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {filter === 'all' ? 'No notifications yet' : 'No notifications in this category'}
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  back: { ...typography.body, color: colors.primary },
  title: { ...typography.h2, color: colors.textPrimary, flex: 1 },
  readAll: { height: 36, paddingHorizontal: spacing.sm },
  tabs: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  unread: { backgroundColor: colors.surface },
  icon: { fontSize: 24 },
  content: { flex: 1 },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  rowBody: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  time: { ...typography.caption, color: colors.textSecondary, marginTop: 4, fontSize: 11 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 60 },
  centered: { alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.lg },
  errorText: { ...typography.body, color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  retryBtn: { minWidth: 120 },
});
