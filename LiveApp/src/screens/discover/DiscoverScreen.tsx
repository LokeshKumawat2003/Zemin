import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography } from '../../theme';
import { liveApi, creatorApi } from '../../api';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'DiscoverMain'>;

export const DiscoverScreen = ({ navigation }: Props) => {
  const { fs, sp } = useResponsive();
  const [liveRooms, setLiveRooms] = useState<any[]>([]);
  const [creator, setCreator] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        content: { paddingVertical: sp(16) },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        topRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: sp(24),
        },
        title: { ...typography.h1, fontSize: fs(28), lineHeight: fs(34), color: colors.textPrimary },
        searchBtn: {
          ...typography.body,
          fontSize: fs(16),
          color: colors.primary,
          fontWeight: '600',
        },
        section: {
          ...typography.h3,
          fontSize: fs(18),
          color: colors.textPrimary,
          marginBottom: sp(8),
          marginTop: sp(16),
        },
        creatorCard: {
          backgroundColor: colors.surface,
          borderRadius: sp(16),
          padding: sp(16),
          borderWidth: 1,
          borderColor: colors.border,
        },
        creatorName: {
          ...typography.h3,
          fontSize: fs(18),
          color: colors.textPrimary,
        },
        creatorBio: {
          ...typography.bodySmall,
          fontSize: fs(14),
          color: colors.textSecondary,
          marginVertical: sp(8),
        },
        stats: { ...typography.caption, fontSize: fs(12), color: colors.accent },
        liveCard: {
          backgroundColor: colors.surface,
          borderRadius: sp(12),
          padding: sp(16),
          marginBottom: sp(8),
          borderWidth: 1,
          borderColor: colors.border,
        },
        liveBadge: {
          alignSelf: 'flex-start',
          backgroundColor: colors.live,
          paddingHorizontal: sp(8),
          paddingVertical: sp(2),
          borderRadius: sp(4),
          marginBottom: sp(8),
        },
        liveText: { color: '#fff', fontSize: fs(10), fontWeight: '800' },
        liveTitle: {
          ...typography.body,
          fontSize: fs(16),
          color: colors.textPrimary,
          fontWeight: '600',
        },
        liveHost: {
          ...typography.caption,
          fontSize: fs(12),
          color: colors.textSecondary,
          marginTop: sp(4),
        },
        empty: {
          ...typography.body,
          fontSize: fs(16),
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: sp(20),
        },
      }),
    [fs, sp]
  );

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
      <ScreenContainer style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container}>
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
                roomId: item.id,
                title: item.title,
                hostName: item.host?.displayName,
                hostId: item.host?.id,
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
    </ScreenContainer>
  );
};
