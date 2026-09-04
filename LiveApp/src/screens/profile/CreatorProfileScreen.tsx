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
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, typography, spacing } from '../../theme';
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

type ContentTab = 'posts' | 'highlights';

export const CreatorProfileScreen = ({ route, navigation }: Props) => {
  const currentUser = useAppSelector((s) => s.auth.user);
  const { username } = route.params;
  const { width } = useWindowDimensions();
  const { fs, sp, horizontalPadding } = useResponsive();
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
        const result = unwrapApiResponse<any>(await feedApi.purchasePpv(post.id));
        if (result?.purchased) {
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
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: sp(48) }]} showsVerticalScrollIndicator={false}>
      <View style={styles.banner}>
        {profile.avatar ? <Image source={{ uri: profile.avatar }} style={styles.bannerImage} blurRadius={6} /> : null}
        <View style={styles.bannerOverlay} />
      </View>
      <TouchableOpacity style={styles.avatar} onPress={profile.isLive ? openLiveRoom : undefined} activeOpacity={profile.isLive ? 0.8 : 1}>
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{profile.username[0]?.toUpperCase()}</Text>
        )}
        {profile.isLive ? <View style={styles.liveAvatarBadge}><Text style={styles.liveAvatarBadgeText}>LIVE</Text></View> : null}
      </TouchableOpacity>

      <View style={styles.identityPanel}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
          {profile.isVerified ? <Icon name="verified" size={fs(18)} color={colors.primary} /> : null}
          {profile.isLive ? <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.livePillText}>LIVE NOW</Text></View> : null}
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : <Text style={styles.bioMuted}>Creator on Zemin</Text>}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate('FollowList', { username: profile.username, initialTab: 'followers' })}
          style={styles.statWrap}
        >
          <Text style={styles.statValue}>{profile.stats.followersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('FollowList', { username: profile.username, initialTab: 'following' })}
          style={styles.statWrap}
        >
          <Text style={styles.statValue}>{profile.stats.followingCount ?? 0}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.statWrap}>
          <Text style={styles.statValue}>{profile.stats.postsCount}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
      </View>

      {!isOwnProfile && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={toggleFollow}
            style={[styles.actionBtn, profile.isFollowing ? styles.actionBtnOutline : styles.actionBtnPrimary]}
            activeOpacity={0.82}
          >
            <Icon name={profile.isFollowing ? 'check' : 'person-add'} size={fs(17)} color={profile.isFollowing ? colors.primary : '#fff'} />
            <Text style={[styles.actionBtnText, profile.isFollowing && styles.actionBtnTextOutline]}>
              {profile.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          {profile.isLive ? (
            <TouchableOpacity onPress={openLiveRoom} style={[styles.actionBtn, styles.actionBtnLive]} activeOpacity={0.82}>
              <Icon name="live-tv" size={fs(17)} color="#fff" />
              <Text style={styles.actionBtnText}>Join Live</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startChat} style={[styles.actionBtn, styles.actionBtnSecondary]} activeOpacity={0.82}>
              <Icon name="chat-bubble-outline" size={fs(17)} color={colors.textPrimary} />
              <Text style={styles.actionBtnTextDark}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isOwnProfile && (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('SubscriptionTiers', {
              username: profile.username,
              creatorId: profile.id,
            })
          }
          style={styles.subscribeBtn}
          activeOpacity={0.82}
        >
          <Icon name="star" size={fs(18)} color="#fff" />
          <Text style={styles.subscribeText}>Subscribe</Text>
          <Icon name="arrow-forward" size={fs(17)} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setActiveTab('posts')} style={styles.tabBtn}>
            <Icon name="grid-on" size={fs(17)} color={activeTab === 'posts' ? colors.primary : colors.textSecondary} />
            <Text style={[styles.tab, activeTab === 'posts' && styles.tabActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('highlights')} style={styles.tabBtn}>
            <Icon name="auto-awesome" size={fs(17)} color={activeTab === 'highlights' ? colors.primary : colors.textSecondary} />
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
                  <Icon name={item.type === 'video' ? 'videocam' : 'image'} size={30} color={colors.textSecondary} />
                </View>
              )}
              {item.isLocked ? (
                <View style={styles.lockOverlay}>
                  <Icon name="lock" size={24} color="#fff" />
                  <Text style={styles.lockText}>
                    {unlockingId === item.id
                      ? 'Unlocking...'
                      : `${item.unlockGift?.emoji || '🎁'} ${item.unlockGift?.name || 'Send gift'}${item.unlockGift?.coinCost ? ` · ${item.unlockGift.coinCost}` : ''}`}
                  </Text>
                </View>
              ) : null}
              <View style={styles.gridOverlay}>
                <View style={styles.gridViewRow}>
                  <Icon name="play-arrow" size={14} color="#fff" />
                  <Text style={styles.gridViewText}>{item.viewCount}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyWrap}>
          <Icon name="photo-library" size={42} color={colors.textSecondary} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
        </View>
      )}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },
  center: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  banner: { height: 150, backgroundColor: colors.secondary, overflow: 'hidden' },
  bannerImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,11,16,0.48)' },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -44,
    marginLeft: spacing.lg,
    borderWidth: 5,
    borderColor: colors.background,
    position: 'relative',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 44 },
  avatarText: { fontSize: 32, fontWeight: '900', color: '#fff' },
  liveAvatarBadge: {
    position: 'absolute',
    bottom: 5,
    right: -2,
    backgroundColor: colors.live,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  liveAvatarBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  identityPanel: { marginHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.h2, color: colors.textPrimary, flexShrink: 1 },
  username: { ...typography.body, color: colors.textSecondary, marginTop: 3 },
  bio: { ...typography.bodySmall, color: colors.textPrimary, lineHeight: 20, marginTop: spacing.sm },
  bioMuted: { ...typography.bodySmall, color: colors.textSecondary, marginTop: spacing.sm },
  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,47,110,0.16)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 4 },
  livePillText: { color: colors.primary, fontSize: 9, fontWeight: '800' },
  statsRow: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.sm, backgroundColor: colors.surface, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm },
  statWrap: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: colors.border },
  statWrapLast: { borderRightWidth: 0 },
  statValue: { color: colors.textPrimary, fontSize: 16, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  actions: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  actionBtn: { flex: 1, minHeight: 42, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: spacing.sm },
  actionBtnPrimary: { backgroundColor: colors.primary },
  actionBtnOutline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary },
  actionBtnLive: { backgroundColor: colors.primary },
  actionBtnSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  actionBtnTextOutline: { color: colors.primary },
  actionBtnTextDark: { color: colors.textPrimary, fontSize: 14, fontWeight: '800' },
  subscribeBtn: { marginHorizontal: spacing.lg, marginBottom: spacing.md, minHeight: 44, borderRadius: 13, backgroundColor: '#7c3aed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  subscribeText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm },
  tab: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  gridItem: {
    borderRadius: 14,
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
  gridViewRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  emptyWrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: spacing.lg },
  emptyIcon: { opacity: 0.6, marginBottom: 6 },
  emptyTitle: { color: colors.textSecondary, fontSize: 13 },
  empty: { ...typography.body, color: colors.textSecondary },
});
