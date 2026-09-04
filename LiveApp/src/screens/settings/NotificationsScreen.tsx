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
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, spacing } from '../../theme';
import { notificationApi, unwrapApiResponse } from '../../api';
import { Button } from '../../components/common/Button';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useResponsive } from '../../hooks/useResponsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const TYPE_ICONS: Record<string, { name: React.ComponentProps<typeof Icon>['name']; color: string }> = {
  follow: { name: 'person-add', color: '#ff2f6e' },
  like: { name: 'favorite', color: '#ff4f7b' },
  comment: { name: 'chat-bubble', color: '#b879ff' },
  gift: { name: 'card-giftcard', color: '#f5b400' },
  subscription: { name: 'star', color: '#f5b400' },
  live: { name: 'videocam', color: '#ff2f6e' },
  message: { name: 'mail', color: '#6db7ff' },
  system: { name: 'notifications', color: '#9b95a3' },
  report: { name: 'flag', color: '#ff8c66' },
  payment: { name: 'payments', color: '#57d68d' },
  payout: { name: 'account-balance', color: '#57d68d' },
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
  const [markingAll, setMarkingAll] = useState(false);
  const { fs, sp } = useResponsive();
  const insets = useSafeAreaInsets();

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
    if (markingAll) return;
    setMarkingAll(true);
    try {
      await notificationApi.markAllRead();
      setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch {
      Alert.alert('Error', 'Could not mark all as read');
    } finally {
      setMarkingAll(false);
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

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const icon = TYPE_ICONS[item.type] || TYPE_ICONS.system;

    return (
    <TouchableOpacity
      style={[styles.row, !item.isRead && styles.unread]}
      onPress={() => handlePress(item)}
      activeOpacity={0.78}
    >
      <View style={[styles.iconBox, { backgroundColor: `${icon.color}1c` }]}>
        <Icon name={icon.name} size={fs(21)} color={icon.color} />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
          {!item.isRead && <View style={styles.unreadBadge}><Text style={styles.unreadBadgeText}>NEW</Text></View>}
        </View>
        <Text style={styles.rowBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
      </View>
      <Icon name="chevron-right" size={fs(20)} color={colors.textSecondary} />
    </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + sp(12) }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={8}>
          <Icon name="arrow-back" size={fs(22)} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Updates</Text>
          <Text style={styles.title}>Notifications</Text>
        </View>
        <Button title="Read all" variant="ghost" onPress={markAll} loading={markingAll} style={styles.readAll} />
      </View>

      <FlatList
        horizontal
        style={styles.filterList}
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
        <ActivityIndicator color={colors.primary} style={{ marginTop: sp(40) }} />
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
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={<View style={styles.emptyState}>
            <View style={styles.emptyIcon}><Icon name="notifications-none" size={fs(34)} color={colors.textSecondary} /></View>
            <Text style={styles.emptyTitle}>{filter === 'all' ? 'No notifications yet' : 'Nothing in this category'}</Text>
            <Text style={styles.emptySubtitle}>You’re all caught up for now.</Text>
          </View>}
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
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: 2 },
  readAll: { height: 38, minWidth: 76, paddingHorizontal: spacing.sm },
  tabs: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  filterList: { flexGrow: 0, height: 56 },
  tab: {
    paddingHorizontal: spacing.md,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...typography.caption, color: colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  unread: { borderColor: 'rgba(255,47,110,0.42)', backgroundColor: 'rgba(255,47,110,0.08)' },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700', flex: 1 },
  unreadBadge: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  unreadBadgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
  rowBody: { ...typography.caption, color: colors.textSecondary, marginTop: 4, lineHeight: 18 },
  time: { ...typography.caption, color: colors.textSecondary, marginTop: 5, fontSize: 11 },
  listContent: { paddingBottom: spacing.lg },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  emptyState: { alignItems: 'center' },
  emptyIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '700' },
  emptySubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 5 },
  centered: { alignItems: 'center', marginTop: 60, paddingHorizontal: spacing.lg },
  errorText: { ...typography.body, color: colors.error, textAlign: 'center', marginBottom: spacing.md },
  retryBtn: { minWidth: 120 },
});
