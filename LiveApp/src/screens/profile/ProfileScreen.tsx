import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileStackParamList } from '../../navigation/types';
import { useProfileScreen, CONTENT_TABS, formatCount } from './useProfileScreen';
import { styles } from './ProfileScreen.styles';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ProfileMain'>;

export const ProfileScreen = (props: Props) => {
  const insets = useSafeAreaInsets();
  const {
    user,
    activeTab,
    setActiveTab,
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
    onRefresh,
    applyCreator,
    openPost,
    displayedPosts,
    stats,
  } = useProfileScreen(props);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff2f6e"
          />
        }
      >
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
            onPress={() => props.navigation.navigate('Settings')}
            activeOpacity={0.8}
          >
            <Icon name="edit" size={fs(15)} color="#fff" />
            <Text style={styles.editProfileText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerBlock}>
          <View style={styles.avatarRow}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  styles.avatarPlaceholder,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              >
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
                onPress={() =>
                  props.navigation.navigate('FollowList', {
                    username: user!.username,
                    initialTab: 'followers',
                  })
                }
              >
                <Text style={styles.statValue}>{formatCount(stats.followersCount)}</Text>
                <Text style={styles.statLabel}>Followers</Text>
              </TouchableOpacity>
              <View style={styles.statDivider} />
              <TouchableOpacity
                style={styles.stat}
                onPress={() =>
                  props.navigation.navigate('FollowList', {
                    username: user!.username,
                    initialTab: 'following',
                  })
                }
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
              {user?.isVerified && <Icon name="verified" size={fs(16)} color="#ff2f6e" />}
              {user?.isCreator && (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              )}
            </View>
            <Text style={styles.username}>@{user?.username}</Text>
            {!!user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => props.navigation.navigate('Wallet')}
            >
              <Icon name="account-balance-wallet" size={fs(17)} color="#ff2f6e" />
              <Text style={styles.quickActionText}>Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionBtn}
              onPress={() => props.navigation.navigate('GiftCatalog')}
            >
              <Icon name="card-giftcard" size={fs(17)} color="#ff2f6e" />
              <Text style={styles.quickActionText}>Gifts</Text>
            </TouchableOpacity>
            {user?.isCreator && (
              <TouchableOpacity
                style={[styles.quickActionBtn, styles.quickActionPrimary]}
                onPress={() => props.navigation.navigate('CreatorProfile', { username: user.username })}
              >
                <Icon name="visibility" size={fs(17)} color="#ff2f6e" />
                <Text style={[styles.quickActionText, styles.quickActionTextPrimary]}>Public</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.balanceRow}>
          <TouchableOpacity
            style={styles.balanceCard}
            onPress={() => props.navigation.navigate('Wallet')}
            activeOpacity={0.85}
          >
            <Icon name="monetization-on" size={fs(25)} color="#f5b400" style={styles.balanceIcon} />
            <Text style={styles.balanceLabel}>Coins</Text>
            <Text style={styles.balanceValue}>{coinBalance.toLocaleString()}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.balanceCard, styles.balanceCardAlt]}
            onPress={() => props.navigation.navigate('Wallet')}
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
                onPress={() => props.navigation.navigate('CreateSubscriptionTier')}
              >
                <Icon name="add" size={fs(18)} color="#ff2f6e" />
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
                {subscriptionPlans.map(plan => (
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
                      onPress={() => props.navigation.navigate('CreateSubscriptionTier', { tier: plan })}
                    >
                      <Icon name="edit" size={fs(17)} color="#ff2f6e" />
                      <Text style={styles.editPlanText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        ) : null}

        {!user?.isCreator && (
          <TouchableOpacity style={styles.creatorCta} onPress={applyCreator} activeOpacity={0.9}>
            <View style={styles.creatorCtaIconWrap}>
              <Icon name="star" size={fs(24)} color="#f5b400" />
            </View>
            <View style={styles.creatorCtaText}>
              <Text style={styles.creatorCtaTitle}>Become a Creator</Text>
              <Text style={styles.creatorCtaSub}>Go live, earn gifts, grow your fans</Text>
            </View>
            <Icon name="chevron-right" size={fs(24)} color="#f5b400" />
          </TouchableOpacity>
        )}

        <View style={styles.tabsRow}>
          {CONTENT_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tab, activeTab === t.key && styles.tabActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#ff2f6e" style={styles.loader} />
        ) : displayedPosts.length > 0 ? (
          <View
            style={[
              styles.grid,
              {
                width:
                  tileSize * gridCols +
                  sp(6) * (gridCols - 1) +
                  horizontalPadding * 2,
              },
            ]}
          >
            {displayedPosts.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.gridItem,
                  index % gridCols === gridCols - 1 ? styles.gridItemRightZero : styles.gridItemRightGap,
                  {
                    width: tileSize,
                    height: tileSize * 1.25,
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
                      <Icon
                        name={item.type === 'video' ? 'videocam' : 'image'}
                        size={fs(30)}
                        color="#9b95a3"
                      />
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
            <Icon name="photo-library" size={fs(42)} color="#9b95a3" style={styles.emptyIcon} />
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
