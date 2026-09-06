import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors as baseColors, typography } from '../../theme';
import { useAppSelector } from '../../redux/hooks';
import { ChatStackParamList } from '../../navigation/types';
import { useResponsive } from '../../hooks/useResponsive';
import { useChatList } from '../../hooks/useChatList';
import { ChatListHeader } from '../../components/chat/ChatListHeader';
import { ChatConversationList } from '../../components/chat/ChatConversationList';

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

export const ChatListScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const { fs, sp, contentMaxWidth } = useResponsive();
  const styles = useMemo(() => createStyles(fs, sp), [fs, sp]);
  const {
    onlineFriends,
    conversations,
    visibleConversations,
    loading,
    refreshing,
    search,
    filter,
    setSearch,
    setFilter,
    onRefresh,
    updateConversationUnread,
  } = useChatList({ userId: user?.id });

  const handleConversationPress = (conversationId: string) => {
    updateConversationUnread(conversationId, 0, 0);
    const conversation = conversations.find(item => item.conversationId === conversationId);
    navigation.navigate('ChatRoom', {
      conversationId,
      recipientId: conversation?.participantId || '',
      recipientName: conversation?.displayName || 'Chat',
      recipientAvatar: conversation?.avatar,
      recipientOnline: conversation?.isOnline,
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

  return (
    <View style={styles.container}>
      <View style={[styles.contentWrap, { maxWidth: contentMaxWidth }]}>
      <ChatListHeader
        fs={fs}
        sp={sp}
        search={search}
        filter={filter}
        hasUnread={conversations.some(conversation => conversation.unreadCount > 0)}
        onSearchChange={setSearch}
        onFilterChange={setFilter}
        onClearSearch={() => setSearch('')}
        onCompose={handleNewChatPress}
      />

      <ChatConversationList
        fs={fs}
        sp={sp}
        loading={loading}
        refreshing={refreshing}
        conversations={visibleConversations}
        onlineFriends={onlineFriends}
        search={search}
        filter={filter}
        onRefresh={onRefresh}
        onFriendPress={username => navigation.navigate('CreatorProfile' as any, { username })}
        onConversationPress={handleConversationPress}
      />

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