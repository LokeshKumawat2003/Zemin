import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { colors as baseColors, spacing } from '../../theme';

const colors = {
    ...baseColors,
    background: '#0d0b10',
    surface: '#18151c',
    surfaceAlt: '#211d27',
    primary: '#ff2f6e',
    accentPurple: '#7c3aed',
    gold: '#f5b400',
    text: '#ffffff',
    textSecondary: '#9b95a3',
    border: '#2a2530',
};

type Props = {
    visible: boolean;
    room: any;
    joinGiftEmoji: string;
    joinGiftCost: number;
    joiningGift: boolean;
    onClose: () => void;
    onJoin: () => void;
    fs: (value: number) => number;
};

export const LiveHomeJoinModal = ({
    visible,
    room,
    joinGiftEmoji,
    joinGiftCost,
    joiningGift,
    onClose,
    onJoin,
    fs,
}: Props) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
                <Text style={styles.modalEyebrow}>Send entry gift</Text>
                <Text style={styles.modalTitle}>{room?.title}</Text>
                <Text style={styles.modalHost}>to {room?.host?.displayName || room?.host?.username}</Text>

                <View style={styles.modalGiftBubble}>
                    <Text style={styles.modalGiftEmoji}>{joinGiftEmoji}</Text>
                    <Text style={styles.modalGiftName}>{room?.entryGift?.name || 'Entry Gift'}</Text>
                    <View style={styles.modalCoinRow}>
                        <Icon name="monetization-on" size={fs(17)} color={colors.gold} />
                        <Text style={styles.modalGiftCost}>{joinGiftCost} coins</Text>
                    </View>
                </View>

                <Text style={styles.modalHint}>
                    Tap to send this gift to the creator. Coins are deducted from your balance once per room.
                </Text>

                <TouchableOpacity
                    style={[styles.modalPayBtn, joiningGift && styles.modalPayBtnDisabled]}
                    onPress={onJoin}
                    disabled={joiningGift}
                >
                    {joiningGift ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.buttonContent}>
                            <Text style={styles.modalPayBtnText}>Send gift & join</Text>
                            <Icon name="arrow-forward" size={fs(18)} color="#fff" />
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                    <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.72)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
    },
    modalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: colors.surface,
        borderRadius: 24,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalEyebrow: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
    },
    modalTitle: {
        color: colors.text,
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        marginTop: 6,
    },
    modalHost: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 4,
        marginBottom: spacing.md,
    },
    modalGiftBubble: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,47,110,0.1)',
        borderRadius: 20,
        paddingVertical: spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(255,47,110,0.25)',
        marginBottom: spacing.md,
    },
    modalGiftEmoji: { fontSize: 56 },
    modalGiftName: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
    modalGiftCost: { color: colors.gold, fontSize: 14, fontWeight: '700', marginTop: 4 },
    modalCoinRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    modalHint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    modalPayBtn: {
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    modalPayBtnDisabled: { opacity: 0.7 },
    modalPayBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    modalCancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
    modalCancelText: { color: colors.textSecondary, fontWeight: '600' },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
});
