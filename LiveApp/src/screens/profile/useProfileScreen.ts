import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useResponsive } from '../../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';
import {
  creatorApi,
  subscriptionApi,
  unwrapApiResponse,
  userApi,
  walletApi,
} from '../../api';
import { ProfileStackParamList } from '../../navigation/types';
import { useSidebar } from '../../contexts/SidebarContext';

export type ContentTab = 'posts' | 'highlights';

export const CONTENT_TABS: { key: ContentTab; label: string }[] = [
  { key: 'posts', label: 'Posts' },
  { key: 'highlights', label: 'Highlights' },
];

interface ProfilePost {
  id: string;
  thumbnail?: string;
  viewCount: number;
  type?: string;
}

interface ProfileStats {
  postsCount: number;
  followersCount: number;
  followingCount: number;
}

const GRID_COLS = 3;
const GRID_GAP = 6;

export const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export const useProfileScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const { toggle: toggleSidebar } = useSidebar();
  const { width, fs, sp, horizontalPadding, contentMaxWidth } = useResponsive();

  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [stats, setStats] = useState<ProfileStats>({
    postsCount: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [coinBalance, setCoinBalance] = useState(user?.coinBalance ?? 0);
  const [walletBalance, setWalletBalance] = useState(user?.walletBalance ?? 0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);

  const gridCols = width >= 768 ? 4 : GRID_COLS;
  const avatarSize = width < 360 ? sp(82) : sp(96);

  const tileSize = useMemo(() => {
    const usableWidth = Math.min(width, contentMaxWidth);
    const horizontalPad = horizontalPadding * 2;
    return (usableWidth - horizontalPad - sp(GRID_GAP) * (gridCols - 1)) / gridCols;
  }, [width, contentMaxWidth, horizontalPadding, sp, gridCols]);

  const coverHeight = useMemo(
    () => Math.min(sp(260), Math.max(sp(180), width * 0.48)),
    [width, sp],
  );

  const loadProfile = useCallback(async () => {
    if (!user?.username) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const [profileRes, postsRes, balanceRes, plansRes] = await Promise.all([
        creatorApi.getProfile(user.username).catch(() => null),
        userApi.getPosts().catch(() => ({ data: [] })),
        walletApi.getBalance().catch(() => null),
        user?.isCreator
          ? subscriptionApi.getTiers(user.username).catch(() => null)
          : Promise.resolve(null),
      ]);

      if (profileRes?.data?.stats) {
        setStats({
          postsCount: profileRes.data.stats.postsCount ?? 0,
          followersCount: profileRes.data.stats.followersCount ?? 0,
          followingCount: profileRes.data.stats.followingCount ?? 0,
        });
      }

      const rawPosts = postsRes?.data || [];
      setPosts(
        rawPosts.map((p: any) => ({
          id: p._id || p.id,
          thumbnail: p.media?.[0]?.thumbnail || p.media?.[0]?.url,
          viewCount: p.stats?.viewsCount ?? 0,
          type: p.type,
        })),
      );

      if (balanceRes?.data) {
        setCoinBalance(balanceRes.data.coinBalance ?? 0);
        setWalletBalance(balanceRes.data.walletBalance ?? 0);
      }

      const plans = plansRes ? unwrapApiResponse<any[]>(plansRes) : [];
      setSubscriptionPlans(Array.isArray(plans) ? plans : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.isCreator, user?.username]);

  useFocusEffect(
    useCallback(() => {
      dispatch(bootstrapAuth());
      loadProfile();
    }, [dispatch, loadProfile]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    dispatch(bootstrapAuth());
    loadProfile();
  }, [dispatch, loadProfile]);

  const applyCreator = useCallback(async () => {
    try {
      await creatorApi.apply({
        displayName: user?.displayName || user?.username,
        bio: user?.bio || 'Creator on Zemin',
        categories: ['lifestyle'],
      });
      Alert.alert('Success', 'You are now a creator!');
      dispatch(bootstrapAuth());
      loadProfile();
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Application failed');
    }
  }, [dispatch, loadProfile, user?.bio, user?.displayName, user?.username]);

  const openPost = useCallback(
    (postId: string) => {
      navigation.getParent()?.navigate('Home', {
        screen: 'PostDetail',
        params: { postId },
      });
    },
    [navigation],
  );

  const displayedPosts =
    activeTab === 'posts' ? posts : posts.filter(p => p.viewCount > 0);

  return {
    user,
    activeTab,
    setActiveTab,
    posts,
    stats,
    coinBalance,
    walletBalance,
    loading,
    refreshing,
    subscriptionPlans,
    gridCols,
    avatarSize,
    tileSize,
    coverHeight,
    fs,
    sp,
    horizontalPadding,
    toggleSidebar,
    formatCount,
    onRefresh,
    applyCreator,
    openPost,
    displayedPosts,
    CONTENT_TABS,
  };
};
