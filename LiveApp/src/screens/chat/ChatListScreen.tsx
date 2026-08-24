import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors as baseColors, typography, spacing } from '../../theme';
import { chatApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { ChatStackParamList } from '../../navigation/types';
import { socketManager } from '../../socket/socketClient';

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

  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const conversationIndex = prev.findIndex((item) => item.conversationId === msg.conversationId);
      const existing = conversationIndex >= 0 ? prev[conversationIndex] : undefined;

      const updatedConversation: ConversationItem = {
        conversationId: msg.conversationId,
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

      setConversations(
        rawConvos.map((c: any) => ({
          conversationId: c.conversationId,
          username: c.participant?.username ?? 'unknown',
          displayName: c.participant?.displayName ?? c.participant?.username ?? 'Unknown',
          verified: !!c.participant?.verified,
          avatar: c.participant?.avatarUrl,
          isOnline: !!c.participant?.isOnline,
          lastMessageText: c.lastMessage?.text ?? 'No messages yet',
          lastMessageIsMedia: !!c.lastMessage?.isMedia,
          timestampLabel: formatTimestamp(c.lastMessage?.sentAt),
          unreadCount: c.unreadCount ?? 0,
          pinned: !!c.pinned,
        }))
      );

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
      recipientName: conversations.find((item) => item.conversationId === conversationId)?.displayName || 'Chat',
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

  const renderListHeader = () => (
    <View>
      {/* Online friends row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.onlineRow}
      >
        <TouchableOpacity style={styles.friendItem} onPress={handleNewChatPress}>
          <View style={styles.newChatCircle}>
            <Text style={styles.newChatIcon}>+</Text>
            <View style={styles.newChatBadge}>
              <Text style={styles.newChatBadgeText}>+</Text>
            </View>
          </View>
          <Text style={styles.friendLabel}>New Chat</Text>
        </TouchableOpacity>

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
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.conversationId}
          ListHeaderComponent={renderListHeader}
          refreshing={refreshing}
          onRefresh={onRefresh}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} onPress={() => handleConversationPress(item.conversationId)}>
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
                    {item.verified && <Text style={styles.verifiedIcon}>✔️</Text>}
                  </View>
                </View>
                <Text
                  style={[styles.preview, item.lastMessageIsMedia && styles.previewMedia]}
                  numberOfLines={1}
                >
                  {item.lastMessageIsMedia ? `${item.lastMessageText} 🖼️` : item.lastMessageText}
                </Text>
              </View>

              <View style={styles.rowRight}>
                <Text style={styles.timestamp}>{item.timestampLabel}</Text>
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
              No conversations yet. Visit a creator profile and tap Message!
            </Text>
          }
          contentContainerStyle={styles.list}
        />
      )}

    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },

  // Search

  // Online friends row
  onlineRow: { paddingHorizontal: spacing.md, gap: 16, paddingBottom: spacing.md },
  friendItem: { alignItems: 'center', width: 64 },
  newChatCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  newChatIcon: { color: colors.textSecondary, fontSize: 22 },
  newChatBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: -1 },
  friendAvatarWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  friendAvatar: { width: 54, height: 54, borderRadius: 27 },
  friendAvatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  friendLabel: { color: colors.text, fontSize: 12, textAlign: 'center' },

  // Conversation rows
  list: { paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarWrap: { width: 56, height: 56 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  rowOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.background,
  },
  rowContent: { flex: 1 },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  verifiedIcon: { fontSize: 11 },
  preview: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  previewMedia: { color: colors.primary },
  rowRight: { alignItems: 'flex-end', gap: 8 },
  timestamp: { color: colors.textSecondary, fontSize: 12 },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  pinIcon: { fontSize: 14 },

  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },

  // Bottom nav
});