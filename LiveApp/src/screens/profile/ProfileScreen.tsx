import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { bootstrapAuth } from '../../redux/slices/authSlice';
import { creatorApi, subscriptionApi, unwrapApiResponse, userApi, walletApi } from '../../api';
import { ProfileStackParamList } from '../../navigation/types';
import { useSidebar } from '../../contexts/SidebarContext';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

const colors = {
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

type ContentTab = 'posts' | 'highlights';

const CONTENT_TABS: { key: ContentTab; label: string }[] = [
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

const formatCount = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
};

export const ProfileScreen = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const { toggle: toggleSidebar } = useSidebar();
  const insets = useSafeAreaInsets();
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
    [width, sp]
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
        user?.isCreator ? subscriptionApi.getTiers(user.username).catch(() => null) : Promise.resolve(null),
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
        }))
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
    }, [dispatch, loadProfile])
  );

  const onRefresh = () => {
    setRefreshing(true);
    dispatch(bootstrapAuth());
    loadProfile();
  };

  const applyCreator = async () => {
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
  };

  const openPost = (postId: string) => {
    navigation.getParent()?.navigate('Home', {
      screen: 'PostDetail',
      params: { postId },
    });
  };

  const displayedPosts = activeTab === 'posts' ? posts : posts.filter((p) => p.viewCount > 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 160 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Cover */}
        <View style={[styles.coverWrap, { height: coverHeight }]}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.coverImage} blurRadius={8} />
          ) : (
            <View style={[styles.coverImage, styles.coverGradient]} />
          )}
          <View style={styles.coverOverlay} />

          <TouchableOpacity
            style={[styles.menuBtn, { top: insets.top + 8 }]}
            onPress={toggleSidebar}
            activeOpacity={0.8}
          >
            <Icon name="menu" size={fs(26)} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editProfileBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={fs(15)} color="#fff" />
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Profile header */}
        <View style={styles.headerBlock}>
          <View style={styles.avatarRow}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={[styles.avatar, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]} />
            ) : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}>
                <Text style={styles.avatarText}>
                  {(user?.displayName || user?.username || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatCount(stats.postsCount)}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={styles.stat}
                onPress={() => navigation.navigate('FollowList', { username: user!.username, initialTab: 'followers' })}
              >
                <Text style={styles.statValue}>{formatCount(stats.followersCount)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={styles.stat}
                onPress={() => navigation.navigate('FollowList', { username: user!.username, initialTab: 'following' })}
              >
                <Text style={styles.statValue}>{formatCount(stats.followingCount)}</Text>
                <Text style={styles.statLabel}>Following</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.identityBlock}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {user?.displayName || user?.username || 'User'}
              </Text>
              {user?.isVerified && <Icon name="verified" size={fs(16)} color={colors.primary} />}
              {user?.isCreator && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
            </View>
            <Text style={styles.username}>@{user?.username}</Text>
            {!!user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Wallet')}
            >
              <Icon name="account-balance-wallet" size={fs(17)} color={colors.primary} />
              <Text style={styles.quickActionText}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('GiftCatalog')}
            >
              <Icon name="card-giftcard" size={fs(17)} color={colors.primary} />
              <Text style={styles.quickActionText}>Gifts</Text>
            </TouchableOpacity>
            {/* <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => navigation.navigate('Settings')}
            >
              <Icon name="settings" size={fs(17)} color={colors.primary} />
              <Text style={styles.quickActionText}>Settings</Text>
            </TouchableOpacity> */}
            {/* {user?.isCreator && (
              <TouchableOpacity
                style={[styles.quickActionBtn, styles.quickActionPrimary]}
                onPress={() => navigation.navigate('CreateSubscriptionTier')}
              >
                <Icon name="add-circle-outline" size={fs(17)} color={colors.primary} />
                <Text style={[styles.quickActionText, styles.quickActionTextPrimary]}>Create Plan</Text>
              </TouchableOpacity>
            )} */}
            {user?.isCreator && (
              <TouchableOpacity
                style={[styles.quickActionBtn, styles.quickActionPrimary]}
                onPress={() =>
                  navigation.navigate('CreatorProfile', { username: user!.username })
                }
              >
                <Icon name="visibility" size={fs(17)} color={colors.primary} />
                <Text style={[styles.quickActionText, styles.quickActionTextPrimary]}>Public</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
  <View style={styles.balanceRow}>
          <TouchableOpacity
            style={styles.balanceCard}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.85}
          >
            <Icon name="monetization-on" size={fs(25)} color={colors.gold} style={styles.balanceIcon} />
            <Text style={styles.balanceLabel}>Coins</Text>
            <Text style={styles.balanceValue}>{coinBalance.toLocaleString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.balanceCard, styles.balanceCardAlt]}
            onPress={() => navigation.navigate('Wallet')}
            activeOpacity={0.85}
          >
            <Icon name="diamond" size={fs(25)} color="#9edcff" style={styles.balanceIcon} />
            <Text style={styles.balanceLabel}>Wallet</Text>
            <Text style={styles.balanceValue}>{walletBalance.toLocaleString()}</Text>
          </TouchableOpacity>
        </View>
        {user?.isCreator ? (
          <View style={styles.plansSection}>
            <View style={styles.plansHeader}>
              <View>
                <Text style={styles.plansTitle}>Subscription plans</Text>
                <Text style={styles.plansSubtitle}>One-time payment, one month of access</Text>
              </View>
              <TouchableOpacity
                style={styles.addPlanBtn}
                onPress={() => navigation.navigate('CreateSubscriptionTier')}
              >
                <Icon name="add" size={fs(18)} color={colors.primary} />
                <Text style={styles.addPlanText}>Add</Text>
              </TouchableOpacity>
            </View>
            {subscriptionPlans.length === 0 ? (
              <Text style={styles.noPlans}>No plans yet. Create your first plan.</Text>
            ) : (
              <ScrollView
                style={styles.plansScroll}
                nestedScrollEnabled
                showsVerticalScrollIndicator={subscriptionPlans.length > 3}
              >
                {subscriptionPlans.map((plan) => (
                  <View key={plan.id} style={styles.planCard}>
                    <View style={styles.planCopy}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planPrice}>${Number(plan.price).toFixed(2)} / month</Text>
                      {plan.description ? <Text style={styles.planDescription}>{plan.description}</Text> : null}
                      {plan.accessAllLive ? <Text style={styles.planBenefit}>All live access</Text> : null}
                      {plan.unlockAllPosts ? <Text style={styles.planBenefit}>All posts unlocked</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={styles.editPlanBtn}
                      onPress={() => navigation.navigate('CreateSubscriptionTier', { tier: plan })}
                    >
                      <Icon name="edit" size={fs(17)} color={colors.primary} />
                      <Text style={styles.editPlanText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* Balance cards */}
      

        {/* Become creator CTA */}
        {!user?.isCreator && (
          <TouchableOpacity style={styles.creatorCta} onPress={applyCreator} activeOpacity={0.9}>
            <View style={styles.creatorCtaIconWrap}>
              <Icon name="star" size={fs(24)} color={colors.gold} />
            </View>
            <View style={styles.creatorCtaText}>
              <Text style={styles.creatorCtaTitle}>Become a Creator</Text>
              <Text style={styles.creatorCtaSub}>Go live, earn gifts, grow your fans</Text>
            </View>
            <Icon name="chevron-right" size={fs(24)} color={colors.gold} />
          </TouchableOpacity>
        )}

        {/* Content tabs */}
        <View style={styles.tabsRow}>
          {CONTENT_TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tab, activeTab === t.key && styles.tabActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Post grid */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : displayedPosts.length > 0 ? (
            <View
              style={[
                styles.grid,
                {
                  width: tileSize * gridCols + sp(GRID_GAP) * (gridCols - 1) + horizontalPadding * 2,
                  paddingHorizontal: horizontalPadding,
                },
              ]}
            >
            {displayedPosts.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.gridItem,
                  {
                    width: tileSize,
                    height: tileSize * 1.25,
                    marginRight: (index + 1) % gridCols === 0 ? 0 : sp(GRID_GAP),
                    marginBottom: sp(GRID_GAP),
                  },
                ]}
                onPress={() => openPost(item.id)}
                activeOpacity={0.85}
              >
                {item.thumbnail ? (
                  <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
                ) : (
                  <View style={[styles.gridImage, styles.gridPlaceholder]}>
                    <Text style={styles.gridPlaceholderIcon}>
                      <Icon name={item.type === 'video' ? 'videocam' : 'image'} size={fs(30)} color={colors.textSecondary} />
                    </Text>
                  </View>
                )}
                <View style={styles.gridOverlay}>
                  <View style={styles.gridViewRow}>
                    <Icon name="play-arrow" size={fs(14)} color="#fff" />
                    <Text style={styles.gridViewText}>{formatCount(item.viewCount)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Icon name="photo-library" size={fs(42)} color={colors.textSecondary} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySub}>
              {user?.isCreator
                ? 'Share your first post to grow your audience'
                : 'Your posts will appear here'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background ,paddingBottom: spacing.xl},

  coverWrap: { width: '100%', position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverGradient: { backgroundColor: colors.accentPurple },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 11, 16, 0.45)',
  },
  menuBtn: {
    position: 'absolute',
    left: spacing.md,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  menuIcon: { color: '#fff', fontSize: 20, fontWeight: '700' },
  editProfileBtn: {
    position: 'absolute',
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  editProfileIcon: { color: '#fff', fontSize: 12 },
  editProfileText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  headerBlock: {
    marginTop: -52,
    paddingHorizontal: spacing.md,
    // paddingBottom: spacing.md,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
  },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 36, fontWeight: '800', color: colors.text },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 28, backgroundColor: colors.border },
  statValue: { color: colors.text, fontSize: 17, fontWeight: '800' },
  statLabel: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },

  identityBlock: { marginTop: spacing.md },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  name: { color: colors.text, fontSize: 22, fontWeight: '800', flexShrink: 1 },
  verifiedIcon: { fontSize: 15 },
  creatorBadge: {
    backgroundColor: 'rgba(255,47,110,0.18)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,47,110,0.35)',
  },
  creatorBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '700' },
  username: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  bio: { color: colors.text, fontSize: 13, lineHeight: 20, marginTop: spacing.sm },

  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.md,
  },
  quickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickActionPrimary: {
    backgroundColor: 'rgba(255,47,110,0.15)',
    borderColor: 'rgba(255,47,110,0.35)',
  },
  quickActionIcon: { fontSize: 14 },
  quickActionText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  quickActionTextPrimary: { color: colors.primary },
  plansSection: { marginHorizontal: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  plansHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  plansTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  plansSubtitle: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
  addPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 },
  addPlanText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  noPlans: { color: colors.textSecondary, fontSize: 13, paddingVertical: spacing.sm },
  plansScroll: { maxHeight: 300 },
  planCard: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.sm },
  planCopy: { flex: 1, paddingRight: spacing.sm },
  planName: { color: colors.text, fontSize: 15, fontWeight: '800' },
  planPrice: { color: colors.gold, fontSize: 13, fontWeight: '700', marginTop: 2 },
  planDescription: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  planBenefit: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 4 },
  editPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, padding: 8 },
  editPlanText: { color: colors.primary, fontSize: 12, fontWeight: '800' },

  balanceRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  balanceCardAlt: {
    borderColor: 'rgba(124, 58, 237, 0.35)',
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  balanceIcon: { marginBottom: 6 },
  balanceLabel: { color: colors.textSecondary, fontSize: 12 },
  balanceValue: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: 2 },

  creatorCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 180, 0, 0.35)',
    gap: 12,
  },
  creatorCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 180, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorCtaIcon: { fontSize: 22 },
  creatorCtaText: { flex: 1 },
  creatorCtaTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  creatorCtaSub: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  creatorCtaArrow: { color: colors.gold, fontSize: 22, fontWeight: '300' },

  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.lg,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingBottom: spacing.sm },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  tab: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  tabActive: {
    color: colors.primary,
    fontWeight: '800',
  },

  loader: { marginVertical: 40 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  gridItem: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  gridImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  gridPlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridPlaceholderIcon: { fontSize: 28, opacity: 0.5 },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  gridViewText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  gridViewRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12, opacity: 0.6 },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 6 },
});
