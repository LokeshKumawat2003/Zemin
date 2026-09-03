import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  Animated,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { typography } from '../../theme';
import { feedApi, notificationApi, liveApi, unwrapApiResponse, walletApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useAppSelector } from '../../redux/hooks';
import { useSidebar } from '../../contexts/SidebarContext';
import { useResponsive } from '../../hooks/useResponsive';
import { HomeTopBar, HOME_TOP_BAR_HEIGHT } from '../../components/home/HomeTopBar';
import { HomeCategoryTabs } from '../../components/home/HomeCategoryTabs';
import { HomeBannerCarousel } from '../../components/home/HomeBannerCarousel';
import { SectionHeader } from '../../components/home/SectionHeader';
import { StreamerCard } from '../../components/home/StreamerCard';
import {
  homeColors as colors,
  CategoryTab,
  StreamerCardData,
  BannerSlide,
} from '../../components/home/homeTheme';

type Props = NativeStackScreenProps<HomeStackParamList, 'HomeFeed'>;

export const HomeFeedScreen = ({ navigation }: Props) => {
  const user = useAppSelector((s) => s.auth.user);
  const { toggle: toggleSidebar } = useSidebar();
  const { fs, sp, horizontalPadding, gridColumns, contentMaxWidth, isTablet } = useResponsive();

  const scrollY = useRef(new Animated.Value(0)).current;
  const [tab, setTab] = useState<CategoryTab>('foryou');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [gems, setGems] = useState(0);
  const [coins, setCoins] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [banners] = useState<BannerSlide[]>([
    {
      id: 'go-live',
      title: 'Go Live\nBe a Star',
      subtitle: 'Share your vibe, connect with fans and earn!',
      ctaLabel: 'Go Live Now',
    },
  ]);

  const [liveStreamers, setLiveStreamers] = useState<StreamerCardData[]>([]);

  const topBarHeight = sp(HOME_TOP_BAR_HEIGHT);

  const loadFeed = useCallback(async () => {
    try {
      const [walletRes, feedRes, notifRes, liveRes, vipRes] = await Promise.all([
        walletApi.getBalance().catch(() => ({
          data: { coinBalance: user?.coinBalance ?? 0, walletBalance: user?.walletBalance ?? 0 },
        })),
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

      const streamers =
        tab === 'vip'
          ? vipStreamersFromApi
          : liveStreamersFromApi.length > 0
            ? liveStreamersFromApi
            : feedStreamers;

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
      if (nextState === 'active') refreshUnread();
    });
    return () => subscription.remove();
  }, [refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      refreshUnread();
    }, [refreshUnread])
  );

  const diffClampY = Animated.diffClamp(scrollY, 0, topBarHeight);
  const topBarTranslate = diffClampY.interpolate({
    inputRange: [0, topBarHeight],
    outputRange: [0, -topBarHeight],
    extrapolate: 'clamp',
  });
  const topBarOpacity = diffClampY.interpolate({
    inputRange: [0, topBarHeight],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleTabPress = (key: CategoryTab) => {
    if (key === 'vip') {
      navigation.navigate('VipScreen');
    } else {
      setTab(key);
    }
  };

  const handleStreamerPress = (item: StreamerCardData) => {
    const isLiveCard = item.source === 'live' || item.isLive;
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
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        contentWrap: {
          flex: 1,
          width: '100%',
          maxWidth: contentMaxWidth,
          alignSelf: 'center',
        },
        topBarFixed: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          backgroundColor: colors.background,
          overflow: 'hidden',
          alignItems: 'center',
        },
        topBarInner: { width: '100%', maxWidth: contentMaxWidth },
        list: { paddingHorizontal: horizontalPadding, paddingBottom: sp(40) },
        gridRow: { gap: sp(8), justifyContent: isTablet ? 'flex-start' : 'space-between' },
        empty: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: 'center',
          marginTop: sp(60),
          fontSize: fs(16),
        },
        fab: {
          position: 'absolute',
          bottom: sp(24),
          right: sp(24),
          width: sp(56),
          height: sp(56),
          borderRadius: sp(28),
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 4,
        },
        fabText: { color: '#fff', fontSize: fs(28), fontWeight: '700', marginTop: -2 },
      }),
    [fs, sp, horizontalPadding, contentMaxWidth, isTablet]
  );

  const renderHeader = () => (
    <View>
      <HomeCategoryTabs activeTab={tab} onTabPress={handleTabPress} />
      <HomeBannerCarousel
        banners={banners}
        onCtaPress={() => navigation.getParent()?.navigate('GoLive' as never)}
      />
      <SectionHeader title="Live Now" />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        <Animated.View
          style={[
            styles.topBarFixed,
            { transform: [{ translateY: topBarTranslate }], opacity: topBarOpacity },
          ]}
        >
          <View style={styles.topBarInner}>
            <HomeTopBar
              gems={gems}
              coins={coins}
              unreadNotifications={unreadNotifications}
              onMenuPress={toggleSidebar}
              onWalletPress={() => navigation.navigate('Wallet')}
              onNotificationsPress={() => navigation.navigate('Notifications')}
            />
          </View>
        </Animated.View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: sp(40) }} />
        ) : (
          <Animated.FlatList
            data={liveStreamers}
            keyExtractor={(item) => item.id}
            numColumns={gridColumns}
            key={`grid-${gridColumns}`}
            columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={[styles.list, { paddingTop: topBarHeight }]}
            scrollEventThrottle={16}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            renderItem={({ item }) => (
              <StreamerCard item={item} onPress={() => handleStreamerPress(item)} />
            )}
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
    </View>
  );
};
