import Icon from '@react-native-vector-icons/material-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { chatColors as colors } from './chatTheme';

export type ConversationItem = {
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
};

type Props = {
  fs: (value: number) => number;
  sp: (value: number) => number;
  item: ConversationItem;
  onPress: (conversationId: string) => void;
};

export const ConversationRow = ({ fs, sp, item, onPress }: Props) => {
  const styles = createStyles(fs, sp);
  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(item.conversationId)} activeOpacity={0.75}>
      <View style={styles.avatarWrap}>
        {item.avatar ? <Image source={{ uri: item.avatar }} style={styles.avatar} /> : <View style={[styles.avatar, styles.placeholder]} />}
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.displayName}</Text>
            {item.verified && <Icon name="verified" size={14} color={colors.primary} />}
          </View>
          <Text style={styles.timestamp}>{item.timestampLabel}</Text>
        </View>
        <Text style={[styles.preview, item.lastMessageIsMedia && styles.previewMedia]} numberOfLines={1}>
          {item.lastMessageText}
          {item.lastMessageIsMedia && <Icon name="image" size={14} color={colors.primary} />}
        </Text>
      </View>
      <View style={styles.right}>
        {item.unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount > 4 ? '4+' : item.unreadCount}</Text></View> : item.pinned ? <Icon name="push-pin" size={14} color={colors.textSecondary} /> : null}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = (fs: Props['fs'], sp: Props['sp']) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sp(16), paddingVertical: sp(13), gap: sp(12), borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.background },
  avatarWrap: { width: sp(56), height: sp(56) },
  avatar: { width: sp(56), height: sp(56), borderRadius: sp(28) },
  placeholder: { backgroundColor: colors.surfaceAlt },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: sp(14), height: sp(14), borderRadius: sp(7), backgroundColor: colors.online, borderWidth: 2, borderColor: colors.background },
  content: { flex: 1 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: sp(4) },
  name: { color: colors.textPrimary, fontSize: fs(15), fontWeight: '700' },
  preview: { color: colors.textSecondary, fontSize: fs(13), marginTop: sp(3) },
  previewMedia: { color: colors.primary },
  right: { alignItems: 'flex-end', gap: sp(8) },
  timestamp: { color: colors.textSecondary, fontSize: fs(12) },
  badge: { backgroundColor: colors.primary, borderRadius: sp(10), minWidth: sp(20), height: sp(20), alignItems: 'center', justifyContent: 'center', paddingHorizontal: sp(6) },
  badgeText: { color: '#fff', fontSize: fs(11), fontWeight: '700' },
});
