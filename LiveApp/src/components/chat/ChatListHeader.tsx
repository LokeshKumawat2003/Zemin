import Icon from '@react-native-vector-icons/material-icons';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { chatColors as colors } from './chatTheme';

type Props = {
  fs: (value: number) => number;
  sp: (value: number) => number;
  search: string;
  filter: 'all' | 'unread';
  hasUnread: boolean;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: 'all' | 'unread') => void;
  onClearSearch: () => void;
  onCompose: () => void;
};

export const ChatListHeader = ({ fs, sp, search, filter, hasUnread, onSearchChange, onFilterChange, onClearSearch, onCompose }: Props) => {
  const styles = createStyles(fs, sp);
  return (
    <>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.eyebrow}>YOUR INBOX</Text>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>
        <TouchableOpacity onPress={onCompose} style={styles.composeButton} hitSlop={8}>
          <Icon name="edit" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <Icon name="search" size={20} color={colors.textSecondary} />
        <TextInput value={search} onChangeText={onSearchChange} placeholder="Search conversations" placeholderTextColor={colors.textSecondary} style={styles.searchInput} returnKeyType="search" />
        {search.length > 0 && (
          <TouchableOpacity onPress={onClearSearch} hitSlop={8}>
            <Icon name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(['all', 'unread'] as const).map(key => (
          <TouchableOpacity key={key} onPress={() => onFilterChange(key)} style={[styles.filterChip, filter === key && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{key === 'all' ? 'All messages' : 'Unread'}</Text>
            {key === 'unread' && hasUnread && <View style={styles.filterDot} />}
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

const createStyles = (fs: Props['fs'], sp: Props['sp']) => StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: sp(18), paddingHorizontal: sp(16), paddingBottom: sp(8) },
  eyebrow: { color: colors.primary, fontSize: fs(10), fontWeight: '800', letterSpacing: 1.3, marginBottom: sp(3) },
  headerTitle: { fontSize: fs(26), fontWeight: '800', color: colors.textPrimary },
  composeButton: { width: sp(42), height: sp(42), borderRadius: sp(14), backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  searchBox: { marginHorizontal: sp(16), marginTop: sp(10), height: sp(46), flexDirection: 'row', alignItems: 'center', paddingHorizontal: sp(13), borderRadius: sp(14), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: sp(8) },
  searchInput: { flex: 1, color: colors.textPrimary, fontSize: fs(14), paddingVertical: 0 },
  filterRow: { flexDirection: 'row', gap: sp(8), paddingHorizontal: sp(16), paddingVertical: sp(14) },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: sp(6), paddingHorizontal: sp(13), paddingVertical: sp(8), borderRadius: sp(20), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  filterText: { color: colors.textSecondary, fontSize: fs(12), fontWeight: '700' },
  filterTextActive: { color: colors.background },
  filterDot: { width: sp(6), height: sp(6), borderRadius: sp(3), backgroundColor: colors.primary },
});
