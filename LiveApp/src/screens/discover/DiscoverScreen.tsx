import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme';
import { liveApi, creatorApi } from '../../api';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverMain'>;

export const DiscoverScreen = ({ navigation }: Props) => {
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [liveRes, creatorRes] = await Promise.all([
          liveApi.getActive(),
          creatorApi.getProfile('democreator'),
        ]);
        setLiveRooms(liveRes.data || []);
        setCreator(creatorRes.data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <>
          <View style={styles.topRow}>
            <Text style={styles.title}>Discover</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.searchBtn}>🔍 Search</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.section}>Trending Creator</Text>
          {creator && (
            <TouchableOpacity
              style={styles.creatorCard}
              onPress={() => navigation.navigate('CreatorProfile', { username: creator.username })}
            >
              <Text style={styles.creatorName}>{creator.displayName} ✓</Text>
              <Text style={styles.creatorBio}>{creator.bio}</Text>
              <Text style={styles.stats}>
                {creator.stats.followersCount} followers · {creator.stats.postsCount} posts
              </Text>
            </TouchableOpacity>
          )}
          <Text style={styles.section}>Live Now</Text>
        </>
      }
      data={liveRooms}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.liveCard}
          onPress={() =>
            navigation.navigate('LiveViewer', {
              roomId: String(item.id),
              title: item.title,
              hostName: item.host?.username || 'creator',
              hostId: String(item.host?.id || ''),
            })
          }
        >
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.liveTitle}>{item.title}</Text>
          <Text style={styles.liveHost}>
            @{item.host?.username} · {item.viewerCount} watching
          </Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No live streams right now</Text>}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.textPrimary },
  searchBtn: { ...typography.body, color: colors.primary, fontWeight: '600' },
  section: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  creatorCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  creatorName: { ...typography.h3, color: colors.textPrimary },
  creatorBio: { ...typography.bodySmall, color: colors.textSecondary, marginVertical: spacing.sm },
  stats: { ...typography.caption, color: colors.accent },
  liveCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.live,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  liveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  liveTitle: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  liveHost: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 20 },
});
