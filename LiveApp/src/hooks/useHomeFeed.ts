import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  feedApi,
  liveApi,
  notificationApi,
  unwrapApiResponse,
  walletApi,
} from '../api';
import type {
  CategoryTab,
  StreamerCardData,
} from '../components/home/homeTheme';

type User = {
  id?: string;
  coinBalance?: number;
  walletBalance?: number;
} | null;

type Props = { tab: CategoryTab; user: User };

export const useHomeFeed = ({ tab, user }: Props) => {
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gems, setGems] = useState(0);
  const [coins, setCoins] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [liveStreamers, setLiveStreamers] = useState<StreamerCardData[]>([]);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const sourceRef = useRef<'live' | 'feed'>('live');

  const refreshUnread = useCallback(async () => {
    try {
      const response = await notificationApi.unreadCount();
      setUnreadNotifications(response.data?.count || 0);
    } catch {
      // Ignore notification refresh failures.
    }
  }, []);

  const loadFeed = useCallback(
    async (page = 1, append = false) => {
      if (append) {
        if (!hasMoreRef.current || loadingMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        pageRef.current = 1;
        hasMoreRef.current = true;
        sourceRef.current = 'live';
        setLoading(true);
      }

      try {
        const [feedResponse, liveResponse] = await Promise.all([
          tab === 'following'
            ? feedApi.getFollowing(page, 10)
            : feedApi.getForYou(page, 10),
          liveApi
            .getActive(page)
            .catch(() => ({ data: [], meta: { totalPages: 0 } })),
        ]);
        const rawPosts = feedResponse.data || [];
        const rawRooms = liveResponse.data || [];
        if (!append) sourceRef.current = rawRooms.length > 0 ? 'live' : 'feed';

        const feedItems: StreamerCardData[] = rawPosts.map((post: any) => ({
          id: post.id,
          userId: post.creator?.id,
          username: post.creator?.username ?? 'unknown',
          displayName:
            post.creator?.displayName ?? post.creator?.username ?? 'Unknown',
          verified: !!post.creator?.verified,
          tagline: post.caption ?? post.creator?.bio ?? '',
          viewers: post.viewerCount ?? 0,
          coinPrice: post.coinPrice ?? post.creator?.coinPrice ?? 0,
          thumbnail: post.thumbnailUrl ?? post.creator?.avatarUrl,
          isLive: post.isLive ?? true,
          source: 'feed',
        }));
        const liveItems: StreamerCardData[] = rawRooms.map((room: any) => ({
          id: String(room.id || room.roomId || 'live'),
          userId: room.host?.id,
          username: room.host?.username ?? 'unknown',
          displayName:
            room.host?.displayName ?? room.host?.username ?? 'Unknown',
          verified: !!room.host?.verified,
          tagline: room.title ?? room.host?.bio ?? '',
          viewers: room.viewerCount ?? 0,
          coinPrice: room.entryFeeCoins ?? room.coinPrice ?? 0,
          thumbnail:
            room.thumbnail || room.host?.avatar || room.host?.avatarUrl,
          isLive: true,
          source: 'live',
        }));
        const streamers = sourceRef.current === 'live' ? liveItems : feedItems;
        setLiveStreamers(previous => {
          if (!append) return streamers;
          return [...previous, ...streamers].filter(
            (item, index, items) =>
              items.findIndex(candidate => candidate.id === item.id) === index,
          );
        });
        const metadata =
          sourceRef.current === 'live'
            ? (liveResponse as any).meta
            : (feedResponse as any).meta;
        hasMoreRef.current = page < (metadata?.totalPages ?? 1);
        pageRef.current = page;
        void Promise.all([
          walletApi
            .getBalance()
            .catch(() => ({
              data: {
                coinBalance: user?.coinBalance ?? 0,
                walletBalance: user?.walletBalance ?? 0,
              },
            })),
          notificationApi.unreadCount().catch(() => ({ data: { count: 0 } })),
        ]).then(([walletResponse, notificationResponse]) => {
          const walletData = unwrapApiResponse<any>(walletResponse);
          setUnreadNotifications(notificationResponse.data?.count || 0);
          setGems(walletData?.walletBalance ?? user?.walletBalance ?? 0);
          setCoins(walletData?.coinBalance ?? user?.coinBalance ?? 0);
        });
      } catch {
        setLiveStreamers([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
        loadingMoreRef.current = false;
      }
    },
    [tab, user],
  );

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const loadMore = useCallback(() => {
    void loadFeed(pageRef.current + 1, true);
  }, [loadFeed]);
  const refresh = useCallback(() => {
    setRefreshing(true);
    void loadFeed(1);
  }, [loadFeed]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refreshUnread();
    });
    return () => subscription.remove();
  }, [refreshUnread]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnread();
    }, [refreshUnread]),
  );

  return {
    loading,
    loadingMore,
    refreshing,
    gems,
    coins,
    unreadNotifications,
    liveStreamers,
    loadMore,
    refresh,
    refreshUnread,
  };
};
