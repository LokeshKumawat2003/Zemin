import React, { useCallback, useEffect, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors as baseColors, typography, spacing } from '../../theme';
import { creatorApi, liveApi, searchApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Search' | 'DiscoverMain'>;

// Screen-specific palette to match the dark Zemin design.
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

interface RecentSearch {
  id: string;
  label: string;
}

const recentSearchStorage = createMMKV({ id: 'search-recent-history' });
const RECENT_SEARCH_LIMIT = 5;

interface PopularTag {
  id: string;
  tag: string;
  count: string;
  image?: string;
}

interface SuggestedPerson {
  id: string;
  username: string;
  displayName: string;
  verified: boolean;
  isLive: boolean;
  viewers: number;
  tagline: string;
  avatar?: string;
  isFollowing?: boolean;
}

const formatViewers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

const getSavedRecentSearches = (): RecentSearch[] => {
  const raw = recentSearchStorage.getString('recent-searches');
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, RECENT_SEARCH_LIMIT) : [];
  } catch {
    return [];
  }
};

const saveRecentSearches = (items: RecentSearch[]) => {
  recentSearchStorage.set('recent-searches', JSON.stringify(items.slice(0, RECENT_SEARCH_LIMIT)));
};

const getDefaultRecentSearches = (): RecentSearch[] => [];

const getDefaultPopularTags = (): PopularTag[] => [
  { id: '1', tag: 'live', count: 'Now streaming' },
  { id: '2', tag: 'gaming', count: 'Trending' },
  { id: '3', tag: 'music', count: 'Hot right now' },
  { id: '4', tag: 'fashion', count: 'Fresh creators' },
];

export const SearchScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(getSavedRecentSearches());
  const [popularTags, setPopularTags] = useState<PopularTag[]>([]);
  const [suggestedPeople, setSuggestedPeople] = useState<SuggestedPerson[]>([]);
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({});
  const [loadingDiscovery, setLoadingDiscovery] = useState(true);

  const loadDiscovery = useCallback(async () => {
    setLoadingDiscovery(true);
    try {
      setRecentSearches(getSavedRecentSearches());
      setPopularTags(getDefaultPopularTags());

      const [liveRes, creatorRes] = await Promise.all([
        liveApi.getActive().catch(() => ({ data: [] })),
        creatorApi.getProfile(user?.username || '').catch(() => ({ data: null })),
      ]);

      const liveRooms = Array.isArray(liveRes?.data) ? liveRes.data : [];
      const suggested = liveRooms
        .slice(0, 4)
        .map((room: any, index: number) => ({
          id: room.userId?._id || room.hostId || room.id || `live-${index}`,
          username: room.userId?.username || room.host?.username || room.username || '',
          displayName: room.userId?.displayName || room.host?.displayName || room.title || 'Live Creator',
          verified: Boolean(room.userId?.isVerified || room.host?.isVerified),
          isLive: true,
          viewers: room.viewerCount || room.stats?.currentViewers || 0,
          tagline: room.title || 'Live now',
          avatar: room.userId?.avatar || room.host?.avatar || room.thumbnail || undefined,
          isFollowing: false,
        }))
        .filter((item: SuggestedPerson) => item.username);

      const fallback = suggested.length >= 4 ? suggested : [
        {
          id: 'fallback-live',
          username: 'live-now',
          displayName: 'Live creators',
          verified: false,
          isLive: true,
          viewers: 1200,
          tagline: 'Join the most active rooms',
          avatar: undefined,
          isFollowing: false,
        },
      ];

      setSuggestedPeople(suggested.length > 0 ? suggested : fallback);
    } catch {
      setSuggestedPeople([]);
    } finally {
      setLoadingDiscovery(false);
    }
  }, [user?.username]);

  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  const addRecentSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const next = [
        { id: `${Date.now()}-${trimmed}`, label: trimmed },
        ...prev.filter((item) => item.label.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, RECENT_SEARCH_LIMIT);
      saveRecentSearches(next);
      return next;
    });
  }, []);

  const search = async (q: string) => {
    const trimmed = q.trim();
    setQuery(trimmed);
    if (trimmed.length < 2) {
      setResults(null);
      return;
    }

    addRecentSearch(trimmed);
    setLoading(true);
    try {
      const res = await searchApi.search(q);
      const payload = res?.data || { creators: [], posts: [], live: [] };
      setResults({
        creators: Array.isArray(payload.creators) ? payload.creators : [],
        posts: Array.isArray(payload.posts) ? payload.posts : [],
        live: Array.isArray(payload.live) ? payload.live : [],
      });
    } catch {
      setResults({ creators: [], posts: [], live: [] });
    } finally {
      setLoading(false);
    }
  };

  const clearAllRecent = async () => {
    setRecentSearches([]);
    saveRecentSearches([]);
  };

  const toggleCreatorFollow = async (creatorId: string, currentlyFollowing: boolean) => {
    setFollowedCreators((prev) => ({
      ...prev,
      [creatorId]: !currentlyFollowing,
    }));

    try {
      if (currentlyFollowing) {
        await creatorApi.unfollow(creatorId);
      } else {
        await creatorApi.follow(creatorId);
      }
    } catch {
      setFollowedCreators((prev) => ({
        ...prev,
        [creatorId]: currentlyFollowing,
      }));
    }
  };

  const toggleFollow = async (person: SuggestedPerson) => {
    setSuggestedPeople((prev) =>
      prev.map((p) => (p.id === person.id ? { ...p, isFollowing: !p.isFollowing } : p))
    );
    try {
      if (person.isFollowing) {
        await creatorApi.unfollow(person.id);
      } else {
        await creatorApi.follow(person.id);
      }
    } catch {
      // revert on failure
      setSuggestedPeople((prev) =>
        prev.map((p) => (p.id === person.id ? { ...p, isFollowing: person.isFollowing } : p))
      );
    }
  };

  const renderDiscoveryContent = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearAllRecent}>
              <Text style={styles.sectionLink}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow}>
            {recentSearches.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.chip}
                onPress={() => search(r.label)}
              >
                <Text style={styles.chipIcon}>🕐</Text>
                <Text style={styles.chipText}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Popular Tags */}
      {popularTags.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Tags</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsRow}>
            {popularTags.map((t) => (
              <TouchableOpacity key={t.id} style={styles.tagCard} onPress={() => search(t.tag)}>
                {t.image ? (
                  <Image source={{ uri: t.image }} style={styles.tagImage} />
                ) : (
                  <View style={[styles.tagImage, styles.tagImagePlaceholder]} />
                )}
                <View style={styles.tagOverlay}>
                  <Text style={styles.tagLabel}>#{t.tag}</Text>
                  <Text style={styles.tagCount}>{t.count}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Suggested People */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suggested People</Text>
          <TouchableOpacity>
            <Text style={styles.sectionLink}>See All</Text>
          </TouchableOpacity>
        </View>

        {loadingDiscovery ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : (
          suggestedPeople.map((person, i) => (
            <TouchableOpacity
              key={person.id}
              style={[styles.personRow, i === suggestedPeople.length - 1 && { borderBottomWidth: 0 }]}
              onPress={() => navigation.navigate('CreatorProfile', { username: person.username })}
            >
              <View style={styles.personAvatarWrap}>
                {person.avatar ? (
                  <Image source={{ uri: person.avatar }} style={styles.personAvatar} />
                ) : (
                  <View style={[styles.personAvatar, styles.personAvatarPlaceholder]} />
                )}
                {person.isLive && (
                  <View style={styles.personLiveTag}>
                    <Text style={styles.personLiveTagText}>LIVE</Text>
                  </View>
                )}
              </View>

              <View style={styles.personInfo}>
                <View style={styles.personNameRow}>
                  <Text style={styles.personName}>{person.displayName}</Text>
                  {person.verified && <Text style={styles.verifiedIcon}>✔️</Text>}
                </View>
                {person.isLive ? (
                  <View style={styles.personStatusRow}>
                    <View style={styles.personLiveBadge}>
                      <Text style={styles.personLiveBadgeText}>LIVE</Text>
                    </View>
                    <Text style={styles.personViewers}>👁 {formatViewers(person.viewers)}</Text>
                  </View>
                ) : null}
                {!!person.tagline && (
                  <Text style={styles.personTagline} numberOfLines={1}>
                    {person.tagline}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.followBtn, person.isFollowing && styles.followingBtn]}
                onPress={() => toggleFollow(person)}
              >
                <Text style={[styles.followBtnText, person.isFollowing && styles.followingBtnText]}>
                  {person.isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.moreBtn}>
                <Text style={styles.moreBtnText}>⋮</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  const handleResultPress = (item: any) => {
    if (item._type === 'creator') {
      navigation.navigate('CreatorProfile', { username: item.username });
      return;
    }

    if (item._type === 'live') {
      navigation.navigate('LiveViewer', {
        roomId: item.id,
        title: item.title || item.displayName || 'Live now',
        hostName: item.displayName || item.username || 'Live host',
        hostId: item.hostId || item.id,
      });
    }
  };

  const renderResults = () => (
    <FlatList
      data={[
        ...(results.creators || []).map((c: any) => ({ ...c, _type: 'creator' })),
        ...(results.posts || []).map((p: any) => ({ ...p, _type: 'post' })),
        ...(results.live || []).map((l: any) => ({ ...l, _type: 'live' })),
      ]}
      keyExtractor={(item, i) => `${item._type}-${item.id || i}`}
      contentContainerStyle={{ paddingHorizontal: spacing.md }}
      renderItem={({ item }) => {
        const isFollowing = followedCreators[item.id] ?? item.isFollowing ?? false;
        const isLive = item._type === 'live' || item.isLive;
        const avatarUri = item.avatar || item.avatarUrl || item.imageUrl;

        return (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => handleResultPress(item)}
          >
            <View style={styles.resultRow}>
              <View style={styles.resultAvatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.resultAvatar} />
                ) : (
                  <View style={styles.resultAvatarPlaceholder}>
                    <Text style={styles.resultAvatarInitial}>
                      {(item.displayName || item.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {isLive && (
                  <View style={styles.resultLiveTag}>
                    <Text style={styles.resultLiveTagText}>LIVE</Text>
                  </View>
                )}
              </View>

              <View style={styles.resultDetails}>
                <View style={styles.resultNameRow}>
                  <Text style={styles.resultTitle} numberOfLines={1}>
                    {item.displayName || item.username || item.title || item.caption?.slice(0, 50)}
                  </Text>
                  {item._type === 'creator' && item.verified && (
                    <Text style={styles.verifiedIcon}>✔️</Text>
                  )}
                </View>

                {item._type === 'creator' ? (
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    @{item.username} {isLive ? `• ${formatViewers(item.viewers || 0)} viewers` : ''}
                  </Text>
                ) : (
                  <Text style={styles.resultSnippet} numberOfLines={2}>
                    {item.caption || item.title || ''}
                  </Text>
                )}
              </View>

              <View style={styles.resultActions}>
                {item._type === 'creator' && (
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    onPress={() => toggleCreatorFollow(item.id, isFollowing)}
                  >
                    <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        );
      }}
      ListEmptyComponent={<Text style={styles.empty}>No results for "{query}"</Text>}
    />
  );

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search people or tags"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={search}
            autoFocus
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
      ) : results ? (
        renderResults()
      ) : (
        renderDiscoveryContent()
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.lg },

  // Header
  backIcon: { color: colors.text, fontSize: 22 },
  headerTitle: { flex: 1, color: colors.text, fontSize: 22, fontWeight: '800', marginLeft: spacing.sm },

  // Search bar
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: 8,
    marginBottom: spacing.md,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingHorizontal: 16,
    height: 48,
    gap: 10,
  },
  searchIcon: { fontSize: 14, color: colors.textSecondary },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  cancelText: { color: colors.primary, fontSize: 14, fontWeight: '600' },

  // Sections
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  sectionLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  // Recent searches chips
  chipsRow: { paddingLeft: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 10,
    gap: 6,
  },
  chipIcon: { fontSize: 12, color: colors.textSecondary },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  // Popular tags
  tagsRow: { paddingLeft: spacing.md },
  tagCard: {
    width: 130,
    height: 170,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: colors.surfaceAlt,
  },
  tagImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  tagImagePlaceholder: { backgroundColor: colors.surfaceAlt },
  tagOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  tagLabel: { color: '#fff', fontWeight: '700', fontSize: 15 },
  tagCount: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  // Suggested people
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10,
  },
  personAvatarWrap: { width: 56, height: 56 },
  personAvatar: { width: 56, height: 56, borderRadius: 28 },
  personAvatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  personLiveTag: {
    position: 'absolute',
    bottom: -4,
    left: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  personLiveTagText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  personInfo: { flex: 1, gap: 2 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  personName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  verifiedIcon: { fontSize: 11 },
  personStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  personLiveBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  personLiveBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  personViewers: { color: colors.textSecondary, fontSize: 12 },
  personTagline: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  followBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  followingBtn: { backgroundColor: colors.primary },
  followBtnText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  followingBtnText: { color: '#fff' },
  moreBtn: { paddingHorizontal: 6, paddingVertical: 8 },
  moreBtnText: { color: colors.textSecondary, fontSize: 18, fontWeight: '700' },

  // Search results (typed query state)
  resultCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: 18,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultAvatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  resultAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  resultAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  resultAvatarInitial: { color: colors.text, fontWeight: '700', fontSize: 18 },
  resultLiveTag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  resultLiveTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  resultDetails: { flex: 1, justifyContent: 'center', gap: 4 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultType: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  resultActions: { justifyContent: 'center' },
  resultSub: { color: colors.textSecondary, fontSize: 12 },
  resultSnippet: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  resultMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 10,
  },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
});