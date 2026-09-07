import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    live: '#ff2f6e',
};

type Props = {
    item: any;
    onPress: () => void;
};

export const LiveHomeRoomCard = ({ item, onPress }: Props) => (
    <TouchableOpacity key={String(item.id)} style={styles.roomCard} onPress={onPress}>
        <Image
            source={{ uri: item.thumbnail || item.host?.avatar || 'https://via.placeholder.com/240' }}
            style={styles.roomImage}
        />
        <View style={styles.roomOverlay}>
            <View style={styles.roomTopRow}>
                <View style={styles.livePillSmall}>
                    <View style={styles.liveDotSmall} />
                    <Text style={styles.livePillText}>LIVE</Text>
                </View>
                <View style={styles.roomStats}>
                    <Text style={styles.viewerText}>{item.viewerCount || 0} views</Text>
                    <Text style={styles.viewerText}>{item.followerCount || 0} followers</Text>
                </View>
            </View>
            <View style={styles.roomInfo}>
                <Text numberOfLines={1} style={styles.roomTitle}>{item.title}</Text>
                <Text style={styles.roomHost}>@{item.host?.username || 'creator'}</Text>
            </View>
        </View>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    roomCard: {
        width: 220,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    roomImage: {
        width: '100%',
        height: 160,
        resizeMode: 'cover',
    },
    roomOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: spacing.sm,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    roomTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    roomStats: {
        flexDirection: 'row',
        gap: 6,
    },
    livePillSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.live,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    livePillText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
        marginLeft: 4,
    },
    viewerText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
        backgroundColor: 'rgba(0,0,0,0.45)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },
    roomInfo: {
        gap: 2,
    },
    roomTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    roomHost: {
        color: '#f7f7f7',
        fontSize: 12,
        fontWeight: '600',
    },
    liveDotSmall: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#fff',
    },
});
