import Icon from '@react-native-vector-icons/material-icons';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, spacing } from '../../theme';

type Props = {
  fs: (value: number) => number;
  value: string;
  onChangeText: (value: string) => void;
};

export const SearchInput = ({ fs, value, onChangeText }: Props) => (
  <View style={styles.row}>
    <View style={styles.bar}>
      <Icon name="search" size={fs(21)} color={colors.textSecondary} />
      <TextInput
        style={styles.input}
        placeholder="Search people or tags"
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        autoFocus
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 8, marginBottom: spacing.md },
  bar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 28, paddingHorizontal: 16, height: 48, gap: 10 },
  input: { flex: 1, color: colors.textPrimary, fontSize: 14 },
});
