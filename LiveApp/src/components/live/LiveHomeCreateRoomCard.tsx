import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { colors as baseColors, spacing, typography } from '../../theme';
import { GiftEntryPicker } from './GiftEntryPicker';
import { ScheduleDateTimePicker } from './ScheduleDateTimePicker';
import { GiftItem, getGiftEmoji } from './LiveGiftEffects';

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

type StreamMode = 'public' | 'vip';
type StartMode = 'instant' | 'scheduled';

type Props = {
    streamMode: StreamMode;
    startMode: StartMode;
    title: string;
    setTitle: (value: string) => void;
    selectedGift: GiftItem | null;
    setSelectedGift: (gift: GiftItem | null) => void;
    scheduledDate: Date;
    setScheduledDate: (value: Date) => void;
    starting: boolean;
    onStreamModeChange: (mode: StreamMode) => void;
    onStartModeChange: (mode: StartMode) => void;
    onGoLive: () => void;
    fs: (value: number) => number;
};

export const LiveHomeCreateRoomCard = ({
    streamMode,
    startMode,
    title,
    setTitle,
    selectedGift,
    setSelectedGift,
    scheduledDate,
    setScheduledDate,
    starting,
    onStreamModeChange,
    onStartModeChange,
    onGoLive,
    fs,
}: Props) => (
    <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroHeader}>
            <View style={styles.heroTextWrap}>
                <Text style={styles.heroLabel}>START A ROOM</Text>
                <Text style={styles.heroTitle}>Your next moment starts here.</Text>
                <Text style={styles.heroSubtitle}>Choose how you want to connect with your audience.</Text>
            </View>
            <View style={styles.heroBadgeIcon}>
                <Icon name="auto-awesome" size={fs(22)} color={colors.gold} />
            </View>
        </View>

        <View style={styles.modeRow}>
            <TouchableOpacity
                style={[styles.modeChip, streamMode === 'public' && styles.modeChipActive]}
                onPress={() => onStreamModeChange('public')}
            >
                <View style={styles.modeChipContent}>
                    <Icon name="public" size={fs(16)} color={streamMode === 'public' ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.modeChipText, streamMode === 'public' && styles.modeChipTextActive]}>Public Live</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.modeChip, streamMode === 'vip' && styles.modeChipActive]}
                onPress={() => onStreamModeChange('vip')}
            >
                <View style={styles.modeChipContent}>
                    <Icon name="lock" size={fs(16)} color={streamMode === 'vip' ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.modeChipText, streamMode === 'vip' && styles.modeChipTextActive]}>VIP Private</Text>
                </View>
            </TouchableOpacity>
        </View>

        <Text style={styles.formLabel}>Room details</Text>

        <View style={styles.inputCard}>
            <TextInput
                style={styles.titleInput}
                placeholder={streamMode === 'vip' ? 'VIP room title' : "What's your stream about?"}
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
            />

            {streamMode === 'vip' && (
                <>
                    <GiftEntryPicker selectedGiftId={selectedGift?.giftId} onSelect={(gift) => setSelectedGift(gift)} />

                    <View style={styles.modeRow}>
                        <TouchableOpacity
                            style={[styles.modeChip, startMode === 'instant' && styles.modeChipActive]}
                            onPress={() => onStartModeChange('instant')}
                        >
                            <View style={styles.modeChipContent}>
                                <Icon name="bolt" size={fs(15)} color={startMode === 'instant' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.modeChipText, startMode === 'instant' && styles.modeChipTextActive]}>Start instantly</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeChip, startMode === 'scheduled' && styles.modeChipActive]}
                            onPress={() => onStartModeChange('scheduled')}
                        >
                            <View style={styles.modeChipContent}>
                                <Icon name="event" size={fs(15)} color={startMode === 'scheduled' ? colors.primary : colors.textSecondary} />
                                <Text style={[styles.modeChipText, startMode === 'scheduled' && styles.modeChipTextActive]}>Schedule</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {startMode === 'scheduled' ? (
                        <ScheduleDateTimePicker value={scheduledDate} onChange={setScheduledDate} minimumDate={new Date()} />
                    ) : null}

                    {selectedGift ? (
                        <View style={styles.selectedGiftPreview}>
                            <Text style={styles.selectedGiftEmoji}> {getGiftEmoji(selectedGift.giftId, selectedGift.name, selectedGift.emoji)} </Text>
                            <View style={styles.selectedGiftInfo}>
                                <Text style={styles.selectedGiftTitle}>Entry gift: {selectedGift.name}</Text>
                                <View style={styles.coinMetaRow}>
                                    <Text style={styles.selectedGiftMeta}>Viewers send this gift •</Text>
                                    <Icon name="monetization-on" size={fs(15)} color={colors.gold} />
                                    <Text style={styles.selectedGiftMeta}>{selectedGift.coinCost}</Text>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    <Text style={styles.vipHint}>
                        Viewers tap the gift to pay and enter. One viewer per VIP room. You receive the gift coins.
                    </Text>
                </>
            )}

            <TouchableOpacity style={[styles.primaryButton, starting && styles.primaryButtonDisabled]} onPress={onGoLive} disabled={starting}>
                {starting ? (
                    <ActivityIndicator color="#fff" size="small" />
                ) : (
                    <View style={styles.buttonContent}>
                        <Icon name={streamMode === 'vip' ? 'lock' : 'play-arrow'} size={fs(18)} color="#fff" />
                        <Text style={styles.primaryButtonText}>
                            {streamMode === 'vip'
                                ? startMode === 'instant'
                                    ? 'Create & Start VIP'
                                    : 'Schedule VIP Room'
                                : 'Start Stream'}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        </View>
    </View>
);

const styles = StyleSheet.create({
    heroCard: {
        backgroundColor: '#1c1225',
        borderRadius: 28,
        padding: spacing.lg,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing.xl,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 5,
    },
    heroGlow: {
        position: 'absolute',
        top: -40,
        right: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: colors.primary + '22',
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    heroTextWrap: {
        flex: 1,
    },
    heroLabel: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1.2,
        marginBottom: 4,
    },
    heroTitle: {
        ...typography.h2,
        color: colors.text,
        flexShrink: 1,
        fontSize: 21,
        lineHeight: 28,
    },
    heroSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        marginTop: 6,
    },
    formLabel: {
        color: colors.text,
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.sm,
    },
    heroBadgeIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: colors.surfaceAlt,
    },
    modeRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    modeChip: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        paddingVertical: 13,
        alignItems: 'center',
    },
    modeChipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    modeChipActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(255,47,110,0.12)',
    },
    modeChipText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
    },
    modeChipTextActive: {
        color: colors.primary,
    },
    inputCard: {
        gap: spacing.sm,
    },
    titleInput: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        color: colors.text,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.lg,
        fontSize: 15,
        fontWeight: '500',
    },
    vipHint: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 18,
    },
    selectedGiftPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,47,110,0.1)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,47,110,0.25)',
        padding: spacing.md,
        minHeight: 76,
    },
    selectedGiftInfo: {
        flex: 1,
    },
    selectedGiftEmoji: {
        fontSize: 36,
    },
    selectedGiftTitle: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '700',
    },
    selectedGiftMeta: {
        color: colors.gold,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    coinMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    primaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: 16,
        paddingVertical: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 4,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
});
