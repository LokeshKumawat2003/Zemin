import Icon from '@react-native-vector-icons/material-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { chatColors as colors } from './chatTheme';

const AVATAR_URI = 'https://i.pravatar.cc/100?img=12';

type Props = {
  recipientName: string;
  recipientAvatar?: string;
  isRecipientOnline: boolean;
  showActions: boolean;
  onBack: () => void;
  onToggleActions: () => void;
  onReport: () => void;
  onBlock: () => void;
};

export const ChatRoomHeader = ({
  recipientName,
  recipientAvatar,
  isRecipientOnline,
  showActions,
  onBack,
  onToggleActions,
  onReport,
  onBlock,
}: Props) => (
  <>
    <View style={styles.header}>
      <Pressable style={styles.headerIconButton} onPress={onBack} hitSlop={8}>
        <Icon name="arrow-back" size={18} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.headerProfile}>
        <View style={styles.avatarWrap}>
          <Image source={{ uri: recipientAvatar || AVATAR_URI }} style={styles.headerAvatar} />
          {isRecipientOnline && <View style={styles.onlineBadge} />}
        </View>
        <View style={styles.userInfo}>
          <Text numberOfLines={1} style={styles.userName}>{recipientName?.trim() || 'Chat'}</Text>
          <Text numberOfLines={1} style={styles.onlineText}>
            {isRecipientOnline ? 'Active now' : 'Last seen recently'}
          </Text>
        </View>
      </View>

      <View style={styles.headerActions}>
        <Pressable style={styles.actionIconButton} hitSlop={8}>
          <Icon name="call" size={16} color={colors.textPrimary} />
        </Pressable>
        <Pressable style={styles.actionIconButton} onPress={onToggleActions} hitSlop={8}>
          <Icon name="more-vert" size={18} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>

    {showActions && (
      <>
        <Pressable style={styles.actionMenuBackdrop} onPress={onToggleActions} accessibilityLabel="Close chat actions" />
        <View style={styles.chatActionMenu}>
          <Pressable style={styles.chatActionItem} onPress={onReport}>
            <Icon name="flag" size={18} color={colors.textPrimary} />
            <Text style={styles.chatActionText}>Report</Text>
          </Pressable>
          <Pressable style={styles.chatActionItem} onPress={onBlock}>
            <Icon name="block" size={18} color={colors.error} />
            <Text style={[styles.chatActionText, styles.dangerText]}>Block</Text>
          </Pressable>
        </View>
      </>
    )}
  </>
);

const styles = StyleSheet.create({
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, backgroundColor: colors.background },
  headerIconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  headerProfile: { flex: 1, minWidth: 0, height: 48, marginLeft: 6, marginRight: 4, paddingHorizontal: 6, borderRadius: 24, backgroundColor: colors.surfaceAlt, flexDirection: 'row', alignItems: 'center' },
  headerActions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2, height: 42, borderRadius: 21, backgroundColor: colors.surfaceAlt },
  actionIconButton: { width: 40, height: 42, alignItems: 'center', justifyContent: 'center' },
  actionMenuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 2 },
  chatActionMenu: { position: 'absolute', top: 58, right: 8, zIndex: 3, width: 148, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
  chatActionItem: { height: 42, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  chatActionText: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  dangerText: { color: colors.error },
  avatarWrap: { marginLeft: 0 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18 },
  onlineBadge: { position: 'absolute', right: -1, bottom: -1, width: 11, height: 11, borderRadius: 6, backgroundColor: colors.online, borderWidth: 2, borderColor: colors.surface },
  userInfo: { flex: 1, marginLeft: 8 },
  userName: { color: colors.textPrimary, fontSize: 14, fontWeight: '700', lineHeight: 17 },
  onlineText: { color: colors.textSecondary, fontSize: 10, fontWeight: '500', lineHeight: 13, marginTop: 0 },
});
