import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../../theme';

type Props = { featured?: { title?: string; displayName?: string; status?: string; scheduledAt?: string }; onBack: () => void; formatTime: (value?: string) => string };

export const VipScreenHeader = ({ featured, onBack, formatTime }: Props) => (
  <>
    <View style={styles.headerCard}>
      <View style={styles.copy}><Text style={styles.eyebrow}>VIP access</Text><Text style={styles.title}>Private rooms</Text><Text style={styles.subtitle}>Tap the gift on a card to pay and enter.</Text></View>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}><Text style={styles.backBtnText}>←</Text></TouchableOpacity>
    </View>
    {featured ? <View style={styles.featuredCard}>
      <Text style={styles.featuredLabel}>{featured.status === 'live' ? 'Featured live VIP' : 'Upcoming VIP'}</Text>
      <Text style={styles.featuredTitle}>{featured.title}</Text>
      <Text style={styles.featuredMeta}>{featured.displayName} • {featured.status === 'live' ? 'Live now' : formatTime(featured.scheduledAt)}</Text>
    </View> : null}
  </>
);

const styles = StyleSheet.create({
  headerCard: { backgroundColor: colors.surface, borderRadius: 24, padding: spacing.md, borderWidth: 1, borderColor: colors.border, margin: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  copy: { flex: 1 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }, title: { color: colors.textPrimary, fontSize: 24, fontWeight: '800', marginTop: 2 }, subtitle: { color: colors.textSecondary, marginTop: 4, fontSize: 13 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,47,110,0.12)', alignItems: 'center', justifyContent: 'center' }, backBtnText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  featuredCard: { marginHorizontal: spacing.md, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: 18, padding: spacing.md, borderWidth: 1, borderColor: colors.border }, featuredLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }, featuredTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: '800', marginTop: 4 }, featuredMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
});
