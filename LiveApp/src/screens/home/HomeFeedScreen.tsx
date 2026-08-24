import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { colors as baseColors, typography, spacing } from '../../theme';
import { feedApi, notificationApi, liveApi, unwrapApiResponse, walletApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useAppSelector } from '../../redux/hooks';
import { useSidebar } from '../../contexts/SidebarContext';
import { getAvatarInitials } from './homeFeedUtils';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

// Screen-specific palette to match the dark Zemin design.
// Falls back to the shared theme where it makes sense, but overrides
// background/accent colors so this screen renders on a dark surface.
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

type CategoryTab = 'foryou' | 'vip' | 'live' | 'following' | 'new';

interface StreamerCardData {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  verified: boolean;
  tagline: string;
  viewers: number;
  coinPrice: number;
  thumbnail?: string;
  isLive: boolean;
  source?: 'live' | 'feed';
}

interface SuggestedCreator {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  rating: number;
  isLive: boolean;
}

interface BannerSlide {
  id: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  image?: string;
}

const CATEGORY_TABS: { key: CategoryTab; label: string }[] = [
  { key: 'foryou', label: 'For You' },
  { key: 'vip', label: '👑 VIP' },
  // { key: 'live', label: 'Live Now' },
  // { key: 'following', label: 'Following' },

];

const formatViewers = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : `${n}`);

export const HomeFeedScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const { toggle: toggleSidebar } = useSidebar();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [tab, setTab] = useState<CategoryTab>('foryou');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [gems, setGems] = useState(0);
  const [coins, setCoins] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [banners, setBanners] = useState<BannerSlide[]>([
    {
      id: 'go-live',
      title: 'Go Live\nBe a Star ✨',
      subtitle: 'Share your vibe, connect with fans and earn!',
      ctaLabel: 'Go Live Now',
    }
  ]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  const [liveStreamers, setLiveStreamers] = useState<StreamerCardData[]>([]);

  const loadFeed = useCallback(async () => {
    try {
      const [walletRes, feedRes, notifRes, liveRes, vipRes] = await Promise.all([
        walletApi.getBalance().catch(() => ({ data: { coinBalance: user?.coinBalance ?? 0, walletBalance: user?.walletBalance ?? 0 } })),
        tab === 'following' ? feedApi.getFollowing() : feedApi.getForYou(),
        notificationApi.unreadCount().catch(() => ({ data: { count: 0 } })),
        liveApi.getActive().catch(() => ({ data: [] })),
        tab === 'vip' ? liveApi.getVipRooms().catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
      ]);

      const walletData = unwrapApiResponse<any>(walletRes);

      const rawPosts = feedRes.data || [];
      const rawVipRooms = vipRes.data || [];

      const feedStreamers: StreamerCardData[] = rawPosts.map((p: any) => ({
        id: p.id,
        userId: p.creator?.id,
        username: p.creator?.username ?? 'unknown',
        displayName: p.creator?.displayName ?? p.creator?.username ?? 'Unknown',
        verified: !!p.creator?.verified,
        tagline: p.caption ?? p.creator?.bio ?? '',
        viewers: p.viewerCount ?? 0,
        coinPrice: p.coinPrice ?? p.creator?.coinPrice ?? 0,
        thumbnail: p.thumbnailUrl ?? p.creator?.avatarUrl,
        isLive: p.isLive ?? true,
        source: 'feed',
      }));

      const vipStreamersFromApi: StreamerCardData[] = rawVipRooms.map((room: any) => ({
        id: String(room.id || room.roomId || 'vip'),
        userId: room.host?.id,
        username: room.host?.username ?? 'unknown',
        displayName: room.host?.displayName ?? room.host?.username ?? 'Unknown',
        verified: !!room.host?.verified,
        tagline: room.title ?? room.host?.bio ?? '',
        viewers: room.viewerCount ?? 0,
        coinPrice: room.entryFeeCoins ?? room.coinPrice ?? 0,
        thumbnail: room.thumbnail || room.host?.avatar || room.host?.avatarUrl,
        isLive: true,
        source: 'live',
      }));

      const liveStreamersFromApi: StreamerCardData[] = (liveRes.data || []).map((room: any) => ({
        id: String(room.id || room.roomId || 'live'),
        userId: room.host?.id,
        username: room.host?.username ?? 'unknown',
        displayName: room.host?.displayName ?? room.host?.username ?? 'Unknown',
        verified: !!room.host?.verified,
        tagline: room.title ?? room.host?.bio ?? '',
        viewers: room.viewerCount ?? 0,
        coinPrice: room.entryFeeCoins ?? room.coinPrice ?? 0,
        thumbnail: room.thumbnail || room.host?.avatar || room.host?.avatarUrl,
        isLive: true,
        source: 'live',
      }));

      const streamers = tab === 'vip' ? vipStreamersFromApi : (liveStreamersFromApi.length > 0 ? liveStreamersFromApi : feedStreamers);

      setLiveStreamers(streamers);
      setUnreadNotifications(notifRes.data?.count || 0);
      setGems(walletData?.walletBalance ?? user?.walletBalance ?? 0);
      setCoins(walletData?.coinBalance ?? user?.coinBalance ?? 0);
    } catch {
      setLiveStreamers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, user]);

  useEffect(() => {
    setLoading(true);
    loadFeed();
  }, [loadFeed]);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await notificationApi.unreadCount();
      setUnreadNotifications(res.data?.count || 0);
    } catch {
      // ignore fetch errors
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshUnread();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      refreshUnread();
    }, [refreshUnread])
  );

  const diffClampY = Animated.diffClamp(scrollY, 0, 92);
  const topBarTranslate = diffClampY.interpolate({
    inputRange: [0, 92],
    outputRange: [0, -92],
    extrapolate: 'clamp',
  });

  const topBarOpacity = diffClampY.interpolate({
    inputRange: [0, 92],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const renderHeader = () => (
    <View>
      {/* Category tabs */}
      <View style={styles.tabs}>
        {CATEGORY_TABS.map((t) => (
          <Text
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => {
              if (t.key === 'vip') {
                navigation.navigate('VipScreen');
              } else {
                setTab(t.key);
              }
            }}
          >
            {t.label}
          </Text>
        ))}
      </View>

      {/* Banner carousel */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
          setActiveBannerIndex(idx);
        }}
        style={styles.bannerScroll}
        contentContainerStyle={styles.bannerScrollContent}
      >
        {banners.map((b) => (
          <View key={b.id} style={styles.banner}>
            {b.image ? (
              <Image source={{ uri: b.image }} style={styles.bannerImage} />
            ) : (
              <View style={styles.bannerImagePlaceholder} />
            )}
            <View style={styles.bannerLiveTag}>
              <Text style={styles.bannerLiveTagText}>🔴 LIVE</Text>
            </View>
            <View style={styles.bannerTextBlock}>
              <Text style={styles.bannerTitle}>{b.title}</Text>
              <Text style={styles.bannerSubtitle}>{b.subtitle}</Text>
              <TouchableOpacity
                style={styles.bannerCta}
                onPress={() => navigation.getParent()?.navigate('GoLive' as never)}
              >
                <Text style={styles.bannerCtaText}>{b.ctaLabel}  🔴</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.dotsRow}>
        {banners.map((b, i) => (
          <View key={b.id} style={[styles.dot, i === activeBannerIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Live Now section header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Live Now</Text>
        <TouchableOpacity>
          {/* <Text style={styles.sectionLink}>live now  ›</Text> */}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.topBarFixed, { transform: [{ translateY: topBarTranslate }], opacity: topBarOpacity }]}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={toggleSidebar}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>

          <Text style={styles.logo}>Zemin</Text>

          <View style={styles.topBarRight}>
        
            <View style={styles.pill}>
              <Text style={styles.pillIcon}>💎</Text>
              <Text style={styles.pillText}>{gems}</Text>
            </View>

            <View style={[styles.pill, styles.coinPill]}>
              <Text style={styles.pillIcon}>🪙</Text>
              <Text style={styles.pillText}>{coins.toLocaleString()}</Text>
              <TouchableOpacity
                style={styles.addCoinsBtn}
                onPress={() => navigation.navigate('Wallet')}
              >
                <Text style={styles.addCoinsBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Text style={styles.notifIcon}>🔔</Text>
              {unreadNotifications > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <Animated.FlatList
          data={liveStreamers}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={[styles.list, { paddingTop: 92 }]}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          renderItem={({ item }) => {
            const isLiveCard = item.source === 'live' || item.isLive;
            const avatarInitial = getAvatarInitials(item.displayName || item.username);

            return (
              <TouchableOpacity
                style={styles.streamerCard}
                onPress={() => {
                  if (isLiveCard) {
                    navigation.navigate('LiveViewer' as any, {
                      roomId: String(item.id),
                      title: item.tagline || item.displayName,
                      hostName: item.displayName,
                      hostId: String(item.userId),
                    });
                  } else {
                    navigation.navigate('PostDetail', { postId: item.id });
                  }
                }}
              >
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} style={styles.streamerImage} />
                ) : (
                  <View style={[styles.streamerImage, styles.streamerImagePlaceholder]}>
                    <View style={styles.avatarFallbackCircle}>
                      <Text style={styles.avatarFallbackText}>{avatarInitial}</Text>
                    </View>
                  </View>
                )}

                {item.isLive && (
                  <View style={styles.streamerLiveTag}>
                    <Text style={styles.streamerLiveTagText}>🔴 LIVE</Text>
                  </View>
                )}
                <View style={styles.viewerTag}>
                  <Text style={styles.viewerTagText}>👁 {formatViewers(item.viewers)}</Text>
                </View>

                <View style={styles.streamerInfo}>
                  <View style={styles.streamerNameRow}>
                    <Text style={styles.streamerName} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    {item.verified && <Text style={styles.verifiedIcon}>✔️</Text>}
                  </View>
                  <View style={styles.streamerBottomRow}>
                    <Text style={styles.streamerTagline} numberOfLines={1}>
                      {item.tagline}
                    </Text>
                    <Text style={styles.streamerPrice}>🪙 {item.coinPrice}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadFeed();
              }}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No one is live right now. Check back soon!</Text>
          }
        />
      )}

      {user?.isCreator && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const CARD_GAP = spacing.sm ?? 8;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Top bar
  topBarFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 6,
  },
  menuIcon: { color: colors.text, fontSize: 22 },
  logo: { fontSize: 24, fontWeight: '800', color: colors.primary, fontStyle: 'italic' },
  topBarRight: { flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm },
  vipBtn: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  vipBtnText: { color: colors.gold, fontSize: 12, fontWeight: '800' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginLeft: 6,
  },
  coinPill: { paddingRight: 4, marginLeft: 6 },
  pillIcon: { fontSize: 13 },
  pillText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  addCoinsBtn: {
    backgroundColor: colors.accentPurple,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  addCoinsBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: -1 },
  notifBtn: { position: 'relative', padding: 6, marginLeft: 6 },
  notifIcon: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // Category tabs
  tabs: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tab: { ...typography.body, color: colors.textSecondary, paddingBottom: spacing.sm, fontSize: 14 },
  tabActive: {
    color: colors.primary,
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  // Banner
  bannerScroll: {
    width: '100%',
    borderRadius: 16,
    marginBottom: spacing.md,
  },
  bannerScrollContent: {
    alignItems: 'center',
  },
  banner: {
    width: Dimensions.get('window').width - spacing.md * 2,
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: colors.accentPurple,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  bannerImage: { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  bannerImagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accentPurple,
  },
  bannerLiveTag: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bannerLiveTagText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bannerTextBlock: { maxWidth: '65%' },
  bannerTitle: { color: '#fff', fontSize: 28, fontWeight: '800', lineHeight: 32 },
  bannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 8, marginBottom: 14 },
  bannerCta: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  bannerCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10, marginBottom: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 16 },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  quickAction: { alignItems: 'center', width: 56 },
  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  sectionLink: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  // Grid of streamer cards
  list: { paddingHorizontal: spacing.md, paddingBottom: 40 },
  gridRow: { gap: CARD_GAP },
  streamerCard: {
    flex: 1,
    marginBottom: CARD_GAP,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  streamerImage: { width: '100%', aspectRatio: 0.78, resizeMode: 'cover' },
  streamerImagePlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  streamerLiveTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  streamerLiveTagText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  viewerTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewerTagText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  streamerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  streamerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  streamerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  verifiedIcon: { fontSize: 10 },
  streamerBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streamerTagline: { color: 'rgba(255,255,255,0.85)', fontSize: 11, flex: 1 },
  streamerPrice: { color: colors.gold, fontSize: 11, fontWeight: '700', marginLeft: 6 },

  empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 60 },

  // Suggested creators
  suggestedList: { paddingHorizontal: spacing.md, gap: 16, paddingBottom: spacing.lg },
  suggestedItem: { alignItems: 'center', width: 72, marginRight: 10 },
  suggestedAvatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  suggestedAvatar: { width: 68, height: 68, borderRadius: 34 },
  suggestedAvatarPlaceholder: { backgroundColor: colors.surfaceAlt },
  suggestedLiveTag: {
    position: 'absolute',
    bottom: -2,
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  suggestedLiveTagText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  suggestedName: { color: colors.text, fontSize: 12, fontWeight: '600' },
  suggestedRating: { color: colors.gold, fontSize: 11 },
  moreCircle: { borderColor: colors.border, backgroundColor: colors.surface },
  moreIcon: { fontSize: 22 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '700', marginTop: -2 },
});