import { ActivityIndicator, FlatList, StyleSheet, Text } from 'react-native';
import { chatColors as colors } from './chatTheme';
import { ConversationItem, ConversationRow } from './ConversationRow';
import { OnlineFriend, OnlineFriendsRow } from './OnlineFriendsRow';

type Props = {
  fs: (value: number) => number;
  sp: (value: number) => number;
  loading: boolean;
  refreshing: boolean;
  conversations: ConversationItem[];
  onlineFriends: OnlineFriend[];
  search: string;
  filter: 'all' | 'unread';
  onRefresh: () => void;
  onFriendPress: (username: string) => void;
  onConversationPress: (conversationId: string) => void;
};

export const ChatConversationList = ({ fs, sp, loading, refreshing, conversations, onlineFriends, search, filter, onRefresh, onFriendPress, onConversationPress }: Props) => {
  const styles = createStyles(fs, sp);
  if (loading) return <ActivityIndicator color={colors.primary} style={styles.loader} />;

  return (
    <FlatList
      data={conversations}
      keyExtractor={item => item.conversationId}
      ListHeaderComponent={<OnlineFriendsRow fs={fs} sp={sp} friends={onlineFriends} onFriendPress={onFriendPress} />}
      refreshing={refreshing}
      onRefresh={onRefresh}
      renderItem={({ item }) => <ConversationRow fs={fs} sp={sp} item={item} onPress={onConversationPress} />}
      ListEmptyComponent={<Text style={styles.empty}>{search || filter === 'unread' ? 'No conversations match this filter.' : 'No conversations yet. Visit a creator profile and tap Message.'}</Text>}
      contentContainerStyle={styles.list}
    />
  );
};

const createStyles = (fs: Props['fs'], sp: Props['sp']) => StyleSheet.create({
  loader: { marginTop: 40 },
  list: { paddingBottom: sp(100) },
  empty: { color: colors.textSecondary, fontSize: fs(16), textAlign: 'center', marginTop: sp(40) },
});
