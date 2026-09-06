import React, { useMemo, useRef, useState } from 'react';
import {
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
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useAppSelector } from '../../redux/hooks';
import { useSidebar } from '../../contexts/SidebarContext';
import { useResponsive } from '../../hooks/useResponsive';
import { useHomeFeed } from '../../hooks/useHomeFeed';
import { HomeTopBar, HOME_TOP_BAR_HEIGHT } from '../../components/home/HomeTopBar';
import { HomeFeedHeader } from '../../components/home/HomeFeedHeader';
import { StreamerCard } from '../../components/home/StreamerCard';
import { createHomeFeedStyles } from '../../components/home/homeFeedStyles';
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

  const [banners] = useState<BannerSlide[]>([
    {
      id: 'go-live',
      title: 'Go Live\nBe a Star',
      subtitle: 'Share your vibe, connect with fans and earn!',
      ctaLabel: 'Go Live Now',
    },
  ]);

  const { loading, loadingMore, refreshing, gems, coins, unreadNotifications, liveStreamers, loadMore, refresh } = useHomeFeed({ tab, user });

  const topBarHeight = sp(HOME_TOP_BAR_HEIGHT);


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

  const styles = useMemo(() => createHomeFeedStyles({ fs, sp, horizontalPadding, contentMaxWidth, isTablet }), [fs, sp, horizontalPadding, contentMaxWidth, isTablet]);

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
            ListHeaderComponent={<HomeFeedHeader activeTab={tab} banners={banners} onTabPress={handleTabPress} onCtaPress={() => navigation.getParent()?.navigate('GoLive' as never)} />}
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
                onRefresh={refresh}
                tintColor={colors.primary}
              />
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? <ActivityIndicator color={colors.primary} style={{ marginVertical: sp(20) }} /> : null
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
