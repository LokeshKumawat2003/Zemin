import React, { useMemo, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Image,
  useWindowDimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { getGiftEmoji } from '../../components/live/LiveGiftEffects';
import { colors, typography, spacing } from '../../theme';
import { creatorApi, feedApi, walletApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { ProfileStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<
  HomeStackParamList & DiscoverStackParamList & ProfileStackParamList,
  'CreatorProfile'
>;

type ContentTab = 'posts' | 'highlights';

export const CreatorProfileScreen = ({ route, navigation }: Props) => {
  const currentUser = useAppSelector((s) => s.auth.user);
  const { username } = route.params;
  const { width } = useWindowDimensions();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [gifts, setGifts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ContentTab>('posts');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const tileSize = useMemo(() => {
    const horizontalPad = spacing.lg * 2;
    return (width - horizontalPad - 6 * 2) / 3;
  }, [width]);

  useEffect(() => {
    (async () => {
      try {
        const [profRes, giftRes, postsRes] = await Promise.all([
          creatorApi.getProfile(username),
          walletApi.getGiftCatalog(),
          creatorApi.getPosts(username).catch(() => ({ data: [] })),
        ]);
        setProfile(profRes.data);
        setGifts(giftRes.data?.gifts?.slice(0, 9) || []);
        const rawPosts = postsRes?.data || [];
        setPosts(
          rawPosts.map((post: any) => ({
            id: post._id || post.id,
            thumbnail: post.media?.[0]?.thumbnail || post.media?.[0]?.url,
            viewCount: post.stats?.viewsCount ?? 0,
            type: post.type,
            caption: post.caption,
            isPPV: post.isPPV || post.visibility === 'ppv',
            ppvPrice: post.ppvPrice ?? 0,
            isLocked: post.isLocked ?? post.isPPV ?? post.visibility === 'ppv',
            media: post.media || [],
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  const toggleFollow = async () => {
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
  };

  const openPost = async (post: any) => {
    if (post.isLocked) {
      try {
        setUnlockingId(post.id);
        const res = await feedApi.purchasePpv(post.id);
        const purchased = (res as any)?.data?.purchased ?? (res as any)?.purchased ?? false;
        if (purchased) {
          setPosts((prev) => prev.map((item) => (item.id === post.id ? { ...item, isLocked: false } : item)));
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
  };

  const sendGift = async (giftId: string, name: string) => {
    if (!profile) return;
    try {
      await walletApi.sendGift({
        giftId,
        recipientId: profile.id,
        quantity: 1,
        context: { type: 'profile' },
      });
      Alert.alert('Gift sent!', `You sent ${name} to @${profile.username}`);
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not send gift');
    }
  };

  const startChat = async () => {
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
  };

  const openLiveRoom = () => {
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
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Creator not found</Text>
      </View>
    );
  }

  const isOwnProfile = currentUser?.username === profile.username;
  const displayedPosts = activeTab === 'posts' ? posts : posts.filter((post) => post.viewCount > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.banner} />
      <TouchableOpacity style={styles.avatar} onPress={profile.isLive ? openLiveRoom : undefined} activeOpacity={profile.isLive ? 0.8 : 1}>
        <Text style={styles.avatarText}>{profile.username[0]?.toUpperCase()}</Text>
        {profile.isLive ? <View style={styles.liveAvatarBadge}><Text style={styles.liveAvatarBadgeText}>LIVE</Text></View> : null}
      </TouchableOpacity>

      <Text style={styles.name}>
        {profile.displayName}
        {profile.isVerified ? ' ✓' : ''}
      </Text>
      <Text style={styles.username}>@{profile.username}</Text>
      {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('FollowList', { username: profile.username, initialTab: 'followers' })}
          style={styles.statWrap}
        >
          <Text style={styles.statText}>{profile.stats.followersCount} followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('FollowList', { username: profile.username, initialTab: 'following' })}
          style={styles.statWrap}
        >
          <Text style={styles.statText}>{profile.stats.followingCount ?? 0} following</Text>
        </TouchableOpacity>
        <View style={styles.statWrap}>
        <Text style={styles.statText}>{profile.stats.postsCount} posts</Text>
      </View>
      </View>

      {!isOwnProfile && (
        <View style={styles.actions}>
          <Button
            title={profile.isFollowing ? 'Following' : 'Follow'}
            variant={profile.isFollowing ? 'outline' : 'primary'}
            onPress={toggleFollow}
            style={styles.actionBtn}
          />
          {profile.isLive ? (
            <Button title="Join Live" variant="secondary" onPress={openLiveRoom} style={styles.actionBtn} />
          ) : (
            <Button title="Message" variant="secondary" onPress={startChat} style={styles.actionBtn} />
          )}
        </View>
      )}

      {!isOwnProfile && (
        <Button
          title="Subscribe"
          onPress={() =>
            navigation.navigate('SubscriptionTiers', {
              username: profile.username,
              creatorId: profile.id,
            })
          }
          style={styles.subscribeBtn}
        />
      )}

      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setActiveTab('posts')} style={styles.tabBtn}>
          <Text style={[styles.tab, activeTab === 'posts' && styles.tabActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('highlights')} style={styles.tabBtn}>
          <Text style={[styles.tab, activeTab === 'highlights' && styles.tabActive]}>Highlights</Text>
        </TouchableOpacity>
      </View>

      {displayedPosts.length > 0 ? (
        <View style={styles.grid}>
          {displayedPosts.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.gridItem,
                {
                  width: tileSize,
                  height: tileSize * 1.25,
                  marginRight: (index + 1) % 3 === 0 ? 0 : 6,
                  marginBottom: 6,
                },
              ]}
              onPress={() => openPost(item)}
              activeOpacity={0.85}
            >
              {item.thumbnail ? (
                <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
              ) : (
                <View style={[styles.gridImage, styles.gridPlaceholder]}>
                  <Text style={styles.gridPlaceholderIcon}>{item.type === 'video' ? '🎬' : '📷'}</Text>
                </View>
              )}
              {item.isLocked ? (
                <View style={styles.lockOverlay}>
                  <Text style={styles.lockIcon}>🔒</Text>
                  <Text style={styles.lockText}>{unlockingId === item.id ? 'Unlocking...' : `${item.ppvPrice} coins`}</Text>
                </View>
              ) : null}
              <View style={styles.gridOverlay}>
                <Text style={styles.gridViewText}>▶ {item.viewCount}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No posts yet</Text>
        </View>
      )}

      <Text style={styles.section}>Send a Gift</Text>
      <View style={styles.giftRow}>
        {gifts.map((g) => (
          <TouchableOpacity key={g.giftId} style={styles.giftItem} onPress={() => sendGift(g.giftId, g.name)}>
            <Text style={styles.giftEmoji}>{getGiftEmoji(g.giftId, g.name, g.emoji)}</Text>
            <Text style={styles.giftName}>{g.name}</Text>
            <Text style={styles.giftCost}>{g.coinCost}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  banner: { height: 120, backgroundColor: colors.secondary },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,
    marginLeft: spacing.lg,
    borderWidth: 4,
    borderColor: colors.background,
    position: 'relative',
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#fff' },
  liveAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: -2,
    backgroundColor: colors.live,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  liveAvatarBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  name: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md, marginLeft: spacing.lg },
  username: { ...typography.body, color: colors.textSecondary, marginLeft: spacing.lg },
  bio: { ...typography.bodySmall, color: colors.textSecondary, margin: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.md },
  statWrap: { alignItems: 'center' },
  statText: { ...typography.bodySmall, color: colors.textPrimary },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  actionBtn: { flex: 1 },
  subscribeBtn: { marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.lg,
  },
  tabBtn: { paddingBottom: spacing.sm },
  tab: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabActive: {
    color: colors.primary,
    fontWeight: '800',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingBottom: spacing.sm - 2,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  gridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPlaceholderIcon: { fontSize: 24, opacity: 0.5 },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  lockOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  lockIcon: { fontSize: 24, marginBottom: 4 },
  lockText: { color: '#fff', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  gridViewText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: spacing.lg },
  emptyIcon: { fontSize: 32, opacity: 0.6, marginBottom: 6 },
  emptyTitle: { color: colors.textSecondary, fontSize: 13 },
  section: { ...typography.h3, color: colors.textPrimary, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  giftRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, gap: spacing.sm },
  giftItem: {
    width: '22%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  giftEmoji: { fontSize: 24 },
  giftName: { ...typography.caption, color: colors.textPrimary, marginTop: 4 },
  giftCost: { ...typography.caption, color: colors.accent },
  empty: { ...typography.body, color: colors.textSecondary },
});
