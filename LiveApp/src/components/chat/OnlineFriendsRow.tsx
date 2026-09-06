import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { chatColors as colors } from './chatTheme';

export type OnlineFriend = {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  isOnline: boolean;
};

type Props = {
  fs: (value: number) => number;
  sp: (value: number) => number;
  friends: OnlineFriend[];
  onFriendPress: (username: string) => void;
};

export const OnlineFriendsRow = ({ fs, sp, friends, onFriendPress }: Props) => {
  const styles = createStyles(fs, sp);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {friends.map(friend => (
        <TouchableOpacity key={friend.id} style={styles.item} onPress={() => onFriendPress(friend.username)}>
          <View style={styles.avatarWrap}>
            {friend.avatar ? <Image source={{ uri: friend.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.placeholder]} />}
            {friend.isOnline && <View style={styles.onlineDot} />}
          </View>
          <Text style={styles.label} numberOfLines={1}>{friend.displayName}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const createStyles = (fs: Props['fs'], sp: Props['sp']) => StyleSheet.create({
  row: { paddingHorizontal: sp(16), gap: sp(16), paddingBottom: sp(16) },
  item: { alignItems: 'center', width: sp(64) },
  avatarWrap: { width: sp(60), height: sp(60), borderRadius: sp(30), borderWidth: 2, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: sp(6) },
  avatar: { width: sp(54), height: sp(54), borderRadius: sp(27) },
  placeholder: { backgroundColor: colors.surfaceAlt },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: sp(14), height: sp(14), borderRadius: sp(7), backgroundColor: colors.online, borderWidth: 2, borderColor: colors.background },
  label: { color: colors.textPrimary, fontSize: fs(12), textAlign: 'center' },
});
