import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors as baseColors, typography } from '../../theme';
import { chatApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { ChatStackParamList } from '../../navigation/types';
import { socketManager } from '../../socket/socketClient';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatList'>;

// Screen-specific palette to match the dark Zemin design.
const colors = {
  ...baseColors,
  background: '#0d0b10',
  surface: '#18151c',
  surfaceAlt: '#211d27',
  primary: '#ff2f6e',
  accentPurple: '#7c3aed',
  online: '#2ecc71',
  gold: '#f5b400',
  text: '#ffffff',
  textSecondary: '#9b95a3',
  border: '#2a2530',
};

interface OnlineFriend {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
}

interface ConversationItem {
  conversationId: string;
  participantId: string;
  username: string;
  displayName: string;
  verified: boolean;
  avatar?: string;
  isOnline: boolean;
  lastMessageText: string;
  lastMessageIsMedia: boolean;
  timestampLabel: string;
  unreadCount: number;
  pinned: boolean;
}

const formatTimestamp = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

export const ChatListScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const { fs, sp, contentMaxWidth } = useResponsive();
  const styles = useMemo(() => createStyles(fs, sp), [fs, sp]);

  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const updateConversationUnread = useCallback((conversationId: string, delta: number, replaceValue?: number) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.conversationId === conversationId
          ? {
              ...conversation,
              unreadCount: replaceValue !== undefined ? Math.max(0, replaceValue) : Math.max(0, conversation.unreadCount + delta),
            }
          : conversation
      )
    );
  }, []);

  const upsertConversationMessage = useCallback((msg: any) => {
    setConversations((prev) => {
      const timestampLabel = formatTimestamp(msg.sentAt);
      const conversationIndex = prev.findIndex(
        (item) => item.conversationId === msg.conversationId || item.participantId === String(msg.senderId)
      );
      const existing = conversationIndex >= 0 ? prev[conversationIndex] : undefined;

      const updatedConversation: ConversationItem = {
        conversationId: msg.conversationId,
        participantId: String(msg.senderId || existing?.participantId || ''),
        username: msg.sender?.username ?? existing?.username ?? 'unknown',
        displayName: msg.sender?.displayName ?? existing?.displayName ?? msg.sender?.username ?? 'Unknown',
        verified: existing?.verified ?? !!msg.sender?.verified,
        avatar: msg.sender?.avatarUrl ?? msg.sender?.avatar ?? existing?.avatar,
        isOnline: existing?.isOnline ?? false,
        lastMessageText: msg.text ?? existing?.lastMessageText ?? 'New message',
        lastMessageIsMedia: msg.type !== 'text',
        timestampLabel,
        unreadCount: Math.max(0, (existing?.unreadCount ?? 0) + 1),
        pinned: existing?.pinned ?? false,
      };

      if (conversationIndex === -1) {
        return [updatedConversation, ...prev];
      }

      const next = [...prev];
      next[conversationIndex] = updatedConversation;
      if (conversationIndex !== 0) {
        next.splice(conversationIndex, 1);
        next.unshift(updatedConversation);
      }
      return next;
    });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!refreshing) {
      setLoading(true);
    }
    try {
      const convRes = await chatApi.getConversations();
      const rawConvos = convRes.data || [];

      const uniqueConversations = new Map<string, ConversationItem>();
      rawConvos.forEach((c: any) => {
        const participantId = String(c.participant?.id || c.participant?._id || '');
        if (!participantId || uniqueConversations.has(participantId)) return;
        uniqueConversations.set(participantId, {
          conversationId: String(c.conversationId),
          participantId,
          username: c.participant?.username ?? 'unknown',
          displayName: c.participant?.displayName ?? c.participant?.username ?? 'Unknown',
          verified: !!(c.participant?.isVerified ?? c.participant?.verified),
          avatar: c.participant?.avatar ?? c.participant?.avatarUrl,
          isOnline: !!c.participant?.isOnline,
          lastMessageText: c.lastMessage?.text ?? 'No messages yet',
          lastMessageIsMedia: c.lastMessage?.type !== undefined && c.lastMessage?.type !== 'text',
          timestampLabel: formatTimestamp(c.lastMessage?.sentAt),
          unreadCount: c.unreadCount ?? 0,
          pinned: !!c.pinned,
        });
      });
      setConversations(Array.from(uniqueConversations.values()));

      setOnlineFriends([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    socketManager.connect();

    const cleanup = socketManager.onChatMessage((msg: any) => {
      if (!msg?.conversationId) return;
      if (msg?.senderId === user?.id || msg?.userId === user?.id || msg?.isMine) return;

      upsertConversationMessage(msg);
    });

    return () => {
      cleanup?.();
    };
  }, [user?.id, upsertConversationMessage]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadConversations();
  }, [loadConversations]);

  const handleConversationPress = (conversationId: string) => {
    updateConversationUnread(conversationId, 0, 0);
    navigation.navigate('ChatRoom', {
      conversationId,
      recipientId: conversations.find((item) => item.conversationId === conversationId)?.participantId || '',
      recipientName: conversations.find((item) => item.conversationId === conversationId)?.displayName || 'Chat',
      recipientAvatar: conversations.find((item) => item.conversationId === conversationId)?.avatar,
      recipientOnline: conversations.find((item) => item.conversationId === conversationId)?.isOnline,
    });
  };

  const handleNewChatPress = () => {
    const parentNavigator = navigation.getParent();

    if (parentNavigator) {
      (parentNavigator as any).navigate('Discover', { screen: 'Search' });
      return;
    }

    navigation.navigate('ChatList' as any);
  };

  const visibleConversations = conversations.filter((conversation) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${conversation.displayName} ${conversation.username}`.toLowerCase().includes(query);
    const matchesFilter = filter === 'all' || conversation.unreadCount > 0;
    return matchesSearch && matchesFilter;
  });

  const renderListHeader = () => (
    <View>
      {/* Online friends row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.onlineRow}
      >
        {/* <TouchableOpacity style={styles.friendItem} onPress={handleNewChatPress}>
          <View style={styles.newChatCircle}>
            <Text style={styles.newChatIcon}>+</Text>
            <View style={styles.newChatBadge}>
              <Text style={styles.newChatBadgeText}>+</Text>
            </View>
          </View>
          <Text style={styles.friendLabel}>New Chat</Text>
        </TouchableOpacity> */}

        {onlineFriends.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={styles.friendItem}
            onPress={() => navigation.navigate('CreatorProfile' as any, { username: f.username })}
          >
            <View style={styles.friendAvatarWrap}>
              {f.avatar ? (
                <Image source={{ uri: f.avatar }} style={styles.friendAvatar} />
              ) : (
                <View style={[styles.friendAvatar, styles.friendAvatarPlaceholder]} />
              )}
              {f.isOnline && <View style={styles.onlineDot} />}
            </View>
            <Text style={styles.friendLabel} numberOfLines={1}>
              {f.displayName}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>YOUR INBOX</Text>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <TouchableOpacity onPress={handleNewChatPress} style={styles.composeButton} hitSlop={8}>
          <Icon name="edit" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations"
          placeholderTextColor={colors.textSecondary}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'unread'] as const).map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilter(key)}
            style={[styles.filterChip, filter === key && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>
              {key === 'all' ? 'All messages' : 'Unread'}
            </Text>
            {key === 'unread' && conversations.some((conversation) => conversation.unreadCount > 0) && (
              <View style={styles.filterDot} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={visibleConversations}
          keyExtractor={(item) => item.conversationId}
          ListHeaderComponent={renderListHeader}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleConversationPress(item.conversationId)} activeOpacity={0.75}>
              <View style={styles.avatarWrap}>
                {item.avatar ? (
                  <Image source={{ uri: item.avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]} />
                )}
                {item.isOnline && <View style={styles.rowOnlineDot} />}
              </View>

              <View style={styles.rowContent}>
                <View style={styles.rowTopLine}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{item.displayName}</Text>
                    {item.verified && <Icon name="verified" size={14} color={colors.primary} />}
                  </View>
                  <Text style={styles.timestamp}>{item.timestampLabel}</Text>
                </View>
                <Text
                  style={[styles.preview, item.lastMessageIsMedia && styles.previewMedia]}
                  numberOfLines={1}
                >
                  {item.lastMessageIsMedia ? `${item.lastMessageText} 🖼️` : item.lastMessageText}
                </Text>
              </View>

              <View style={styles.rowRight}>
                {item.unreadCount > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unreadCount > 4 ? '4+' : item.unreadCount}</Text>
                  </View>
                ) : item.pinned ? (
                  <Text style={styles.pinIcon}>📌</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search || filter === 'unread' ? 'No conversations match this filter.' : 'No conversations yet. Visit a creator profile and tap Message.'}
            </Text>
          }
          contentContainerStyle={styles.list}
        />
      )}

      </View>
    </View>
  );
};

const createStyles = (fs: (n: number) => number, sp: (n: number) => number) =>
  StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center' },
  contentWrap: { flex: 1, width: '100%' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: sp(18),
    paddingHorizontal: sp(16),
    paddingBottom: sp(8),
  },
  eyebrow: { color: colors.primary, fontSize: fs(10), fontWeight: '800', letterSpacing: 1.3, marginBottom: sp(3) },
  headerTitle: { fontSize: fs(26), fontWeight: '800', color: colors.text },
  composeButton: {
    width: sp(42),
    height: sp(42),
    borderRadius: sp(14),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  searchBox: {
    marginHorizontal: sp(16),
    marginTop: sp(10),
    height: sp(46),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(13),
    borderRadius: sp(14),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: sp(8),
  },
  searchInput: { flex: 1, color: colors.text, fontSize: fs(14), paddingVertical: 0 },
  filterRow: { flexDirection: 'row', gap: sp(8), paddingHorizontal: sp(16), paddingVertical: sp(14) },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(6),
    paddingHorizontal: sp(13),
    paddingVertical: sp(8),
    borderRadius: sp(20),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { color: colors.textSecondary, fontSize: fs(12), fontWeight: '700' },
  filterTextActive: { color: colors.background },
  filterDot: { width: sp(6), height: sp(6), borderRadius: sp(3), backgroundColor: colors.primary },

  onlineRow: { paddingHorizontal: sp(16), gap: sp(16), paddingBottom: sp(16) },
  friendItem: { alignItems: 'center', width: sp(64) },
  newChatCircle: {
    width: sp(60),
    height: sp(60),
    borderRadius: sp(30),
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(6),
  },
  newChatIcon: { color: colors.textSecondary, fontSize: fs(22) },
  newChatBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: sp(20),
    height: sp(20),
    borderRadius: sp(10),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBadgeText: { color: '#fff', fontSize: fs(12), fontWeight: '700', marginTop: -1 },
  friendAvatarWrap: {
    width: sp(60),
    height: sp(60),
    borderRadius: sp(30),
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp(6),
  },
  friendAvatar: { width: sp(54), height: sp(54), borderRadius: sp(27) },
  friendAvatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: sp(14),
    height: sp(14),
    borderRadius: sp(7),
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendLabel: { color: colors.text, fontSize: fs(12), textAlign: 'center' },

  list: { paddingBottom: sp(100) },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: sp(16),
    paddingVertical: sp(13),
    gap: sp(12),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  avatarWrap: { width: sp(56), height: sp(56) },
  avatar: { width: sp(56), height: sp(56), borderRadius: sp(28) },
  avatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  rowOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: sp(14),
    height: sp(14),
    borderRadius: sp(7),
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  rowContent: { flex: 1 },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: sp(4) },
  name: { color: colors.text, fontSize: fs(15), fontWeight: '700' },
  verifiedIcon: { fontSize: fs(11) },
  preview: { color: colors.textSecondary, fontSize: fs(13), marginTop: sp(3) },
  previewMedia: { color: colors.primary },
  rowRight: { alignItems: 'flex-end', gap: sp(8) },
  timestamp: { color: colors.textSecondary, fontSize: fs(12) },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: sp(10),
    minWidth: sp(20),
    height: sp(20),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp(6),
  },
  badgeText: { color: '#fff', fontSize: fs(11), fontWeight: '700' },
  pinIcon: { fontSize: fs(14) },

  empty: { ...typography.body, fontSize: fs(16), color: colors.textSecondary, textAlign: 'center', marginTop: sp(40) },
});