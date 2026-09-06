import Icon from '@react-native-vector-icons/material-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../../theme';

type Props = { fs: (value: number) => number };

export const CreatePostHeader = ({ fs }: Props) => (
  <View style={styles.header}>
    <View style={styles.icon}><Icon name="edit-note" size={fs(26)} color={colors.primary} /></View>
    <View style={styles.copy}>
      <Text style={styles.eyebrow}>CREATE</Text>
      <Text style={styles.title}>New post</Text>
      <Text style={styles.subtitle}>Share a moment with your audience.</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  icon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,47,110,0.14)', marginRight: spacing.sm },
  copy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
});
