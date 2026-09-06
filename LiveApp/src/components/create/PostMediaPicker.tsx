import Icon from '@react-native-vector-icons/material-icons';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../../theme';

type Props = { fs: (value: number) => number; mediaUri: string | null; onPick: () => void; onRemove: () => void };

export const PostMediaPicker = ({ fs, mediaUri, onPick, onRemove }: Props) => (
  <TouchableOpacity style={[styles.picker, mediaUri && styles.pickerFilled]} onPress={onPick} activeOpacity={0.82}>
    {mediaUri ? (
      <>
        <Image source={{ uri: mediaUri }} style={styles.preview} />
        <View style={styles.shade} />
        <View style={styles.actions}>
          <View style={styles.change}><Icon name="photo-camera" size={fs(17)} color="#fff" /><Text style={styles.actionText}>Change</Text></View>
          <TouchableOpacity style={styles.remove} onPress={onRemove}><Icon name="delete-outline" size={fs(19)} color="#fff" /></TouchableOpacity>
        </View>
      </>
    ) : (
      <>
        <View style={styles.mediaIcon}><Icon name="add-photo-alternate" size={fs(28)} color={colors.primary} /></View>
        <Text style={styles.title}>Add a photo</Text>
        <Text style={styles.hint}>Choose an image from your device</Text>
      </>
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  picker: { height: 170, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: 'rgba(255,47,110,0.06)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: spacing.sm },
  pickerFilled: { borderStyle: 'solid', backgroundColor: colors.surface },
  preview: { width: '100%', height: '100%', resizeMode: 'cover' },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  actions: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  change: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  remove: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,47,110,0.9)' },
  mediaIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,47,110,0.14)', marginBottom: spacing.sm },
  title: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  hint: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
});
