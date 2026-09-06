import Icon from '@react-native-vector-icons/material-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { GiftEntryPicker } from '../live/GiftEntryPicker';
import type { GiftItem } from '../live/LiveGiftEffects';

type Props = { fs: (value: number) => number; visibility: 'public' | 'ppv'; unlockGift: GiftItem | null; onVisibilityChange: (value: 'public' | 'ppv') => void; onGiftChange: (gift: GiftItem | null) => void };

export const PostVisibilitySettings = ({ fs, visibility, unlockGift, onVisibilityChange, onGiftChange }: Props) => (
  <View style={styles.card}>
    <Text style={styles.title}>Who can see this?</Text>
    <View style={styles.row}>
      {(['public', 'ppv'] as const).map(value => {
        const active = visibility === value;
        return (
          <TouchableOpacity key={value} style={[styles.button, active && styles.buttonActive]} onPress={() => onVisibilityChange(value)} activeOpacity={0.8}>
            <Icon name={value === 'public' ? 'public' : 'lock'} size={fs(19)} color={active ? '#fff' : colors.textSecondary} />
            <Text style={[styles.text, active && styles.textActive]}>{value === 'public' ? 'Public' : 'PPV'}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {visibility === 'ppv' && <GiftEntryPicker selectedGiftId={unlockGift?.giftId} onSelect={onGiftChange} label="Choose unlock gift" hint="Viewers send this gift to unlock your post." selectedLabel="Unlock gift" />}
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  button: { flex: 1, minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', gap: 4 },
  buttonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  text: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  textActive: { color: '#fff' },
});
