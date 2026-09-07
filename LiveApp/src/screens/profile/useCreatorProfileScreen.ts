import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, useWindowDimensions } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { creatorApi, feedApi, unwrapApiResponse } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { ProfileStackParamList } from '../../navigation/types';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<
  HomeStackParamList & DiscoverStackParamList & ProfileStackParamList,
  'CreatorProfile'
>;

export type ContentTab = 'posts' | 'highlights';

export const useCreatorProfileScreen = ({ route, navigation }: Props) => {
  const currentUser = useAppSelector(s => s.auth.user);
  const { username } = route.params;
  const { width } = useWindowDimensions();
  const { sp, horizontalPadding } = useResponsive();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const tileSize = useMemo(() => {
    const horizontalPad = horizontalPadding * 2;
    return (width - horizontalPad - sp(6) * 2) / 3;
  }, [width, horizontalPadding, sp]);

  useEffect(() => {
    (async () => {
      try {
        const [profRes, postsRes] = await Promise.all([
          creatorApi.getProfile(username),
          creatorApi.getPosts(username).catch(() => ({ data: [] })),
        ]);

        const profileData = profRes?.data?.data || profRes?.data;
        setProfile(profileData);

        const postsPayload = postsRes?.data?.data || postsRes?.data;
        const rawPosts = Array.isArray(postsPayload) ? postsPayload : postsPayload?.data || [];

        setPosts(
          rawPosts.map((post: any) => ({
            id: post._id || post.id,
            thumbnail: post.media?.[0]?.thumbnail || post.media?.[0]?.url,
            viewCount: post.stats?.viewsCount ?? 0,
            type: post.type,
            caption: post.caption,
            isPPV: post.isPPV || post.visibility === 'ppv',
            ppvPrice: post.ppvPrice ?? 0,
            isLocked: Boolean(post.isLocked),
            unlockGift: post.unlockGift,
            media: post.media || [],
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const toggleFollow = useCallback(async () => {
    if (!profile) return;

    try {
      if (profile.isFollowing) {
        await creatorApi.unfollow(profile.id);
      } else {
        await creatorApi.follow(profile.id);
      }
      setProfile({ ...profile, isFollowing: !profile.isFollowing });
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Action failed');
    }
  }, [profile]);

  const openPost = useCallback(
    async (post: any) => {
      if (post.isLocked) {
        try {
          setUnlockingId(post.id);
          const result = unwrapApiResponse<any>(await feedApi.purchasePpv(post.id));

          if (result?.purchased) {
            setPosts(prev =>
              prev.map(item =>
                item.id === post.id ? { ...item, isLocked: false } : item,
              ),
            );
            Alert.alert('Unlocked!', 'You can now view this post.');
            navigation.getParent()?.navigate('Home', {
              screen: 'PostDetail',
              params: { postId: post.id },
            });
          } else {
            Alert.alert('Error', 'Could not unlock this post');
          }
        } catch (e: any) {
          Alert.alert('Error', e?.error?.message || 'Could not unlock this post');
        } finally {
          setUnlockingId(null);
        }
        return;
      }

      navigation.getParent()?.navigate('Home', {
        screen: 'PostDetail',
        params: { postId: post.id },
      });
    },
    [navigation],
  );

  const startChat = useCallback(async () => {
    if (!profile) return;

    try {
      const { chatApi } = await import('../../api');
      const res = await chatApi.startConversation(profile.id);
      navigation.getParent()?.navigate('Chat', {
        screen: 'ChatRoom',
        params: {
          conversationId: res.data.conversationId,
          recipientName: profile.displayName,
        },
      });
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not start chat');
    }
  }, [navigation, profile]);

  const openLiveRoom = useCallback(() => {
    const roomId = profile?.liveRoomId || profile?.currentLiveRoomId;
    if (!profile?.isLive || !roomId) return;

    const params = {
      roomId,
      title: profile.liveTitle || `${profile.displayName} is live`,
      hostName: profile.displayName,
      hostId: profile.id,
    };

    try {
      navigation.navigate('LiveViewer', params as any);
    } catch {
      navigation.getParent()?.navigate('LiveViewer', params as any);
    }
  }, [navigation, profile]);

  const isOwnProfile = currentUser?.username === profile?.username;
  const displayedPosts = activeTab === 'posts' ? posts : posts.filter(post => post.viewCount > 0);

  return {
    currentUser,
    profile,
    loading,
    posts,
    activeTab,
    setActiveTab,
    unlockingId,
    tileSize,
    isOwnProfile,
    displayedPosts,
    toggleFollow,
    openPost,
    startChat,
    openLiveRoom,
  };
};
