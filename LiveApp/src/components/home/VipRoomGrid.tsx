import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import { LiveStreamerCard, LiveStreamerCardData, liveStreamerCardStyles } from '../live/LiveStreamerCard';

type VipRoom = LiveStreamerCardData;
type Props = { rooms: VipRoom[]; loading: boolean; refreshing: boolean; onRefresh: () => void; onRoomPress: (room: VipRoom) => void };
const cardWidth = 170;

export const VipRoomGrid = ({ rooms, loading, refreshing, onRefresh, onRoomPress }: Props) => {
    if (loading) return <View style={styles.loader}><ActivityIndicator color={colors.primary} /></View>;
    return <FlatList data={rooms} keyExtractor={item => String(item.id)} numColumns={2} columnWrapperStyle={liveStreamerCardStyles.gridRow} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyTitle}>No VIP rooms yet</Text><Text style={styles.emptySubtitle}>Creators can schedule private VIP sessions from Go Live</Text></View>} renderItem={({ item }) => <View style={{ width: cardWidth }}><LiveStreamerCard item={item} variant="vip" onPress={() => onRoomPress(item)} onGiftPress={() => onRoomPress(item)} /></View>} />;
};

const styles = StyleSheet.create({ loader: { flex: 1, alignItems: 'center', justifyContent: 'center' }, list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl }, empty: { backgroundColor: colors.surface, borderRadius: 18, padding: spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: colors.border, marginTop: spacing.md }, emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' }, emptySubtitle: { color: colors.textSecondary, fontSize: 14, marginTop: spacing.xs, textAlign: 'center' } });
