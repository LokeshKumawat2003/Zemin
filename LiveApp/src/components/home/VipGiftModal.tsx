import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { getGiftEmoji } from '../live/LiveGiftEffects';

type VipRoom = {
    title?: string;
    displayName?: string;
    entryGift?: { giftId: string; name?: string; emoji?: string; coinCost?: number } | null;
    entryFeeCoins?: number;
};

type Props = { room: VipRoom | null; joining: boolean; onClose: () => void; onPay: () => void };

export const VipGiftModal = ({ room, joining, onClose, onPay }: Props) => {
    const emoji = room?.entryGift ? getGiftEmoji(room.entryGift.giftId, room.entryGift.name || 'Entry Gift', room.entryGift.emoji) : '🎁';
    const cost = room?.entryGift?.coinCost ?? room?.entryFeeCoins ?? 0;
    return <Modal visible={!!room} transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.card}>
        <Text style={styles.eyebrow}>Send entry gift</Text><Text style={styles.title}>{room?.title}</Text><Text style={styles.host}>to {room?.displayName}</Text>
        <View style={styles.gift}><Text style={styles.emoji}>{emoji}</Text><Text style={styles.name}>{room?.entryGift?.name || 'Entry Gift'}</Text><Text style={styles.cost}>🪙 {cost} coins</Text></View>
        <Text style={styles.hint}>This gift is sent to the creator. Coins are deducted from your balance. You only pay once per room.</Text>
        <TouchableOpacity style={[styles.pay, joining && styles.disabled]} onPress={onPay} disabled={joining}>{joining ? <ActivityIndicator color="#fff" /> : <Text style={styles.payText}>{emoji} Send gift & join</Text>}</TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={onClose}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
    </View></View></Modal>;
};

const styles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
    card: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 24, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
    eyebrow: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
    title: { color: colors.textPrimary, fontSize: 20, fontWeight: '800', textAlign: 'center', marginTop: 6 },
    host: { color: colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: spacing.md },
    gift: { alignItems: 'center', backgroundColor: 'rgba(255,47,110,0.1)', borderRadius: 20, paddingVertical: spacing.lg, borderWidth: 1, borderColor: 'rgba(255,47,110,0.25)', marginBottom: spacing.md },
    emoji: { fontSize: 56 }, name: { color: colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 8 }, cost: { color: '#f5b400', fontSize: 14, fontWeight: '700', marginTop: 4 },
    hint: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: spacing.md }, pay: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 14, alignItems: 'center' }, disabled: { opacity: 0.7 }, payText: { color: '#fff', fontWeight: '800', fontSize: 15 }, cancel: { alignItems: 'center', paddingVertical: spacing.md }, cancelText: { color: colors.textSecondary, fontWeight: '600' },
});
