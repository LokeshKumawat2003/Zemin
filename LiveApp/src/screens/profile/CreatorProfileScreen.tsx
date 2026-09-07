import React from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '../../theme';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { DiscoverStackParamList } from '../../navigation/DiscoverStack';
import { ProfileStackParamList } from '../../navigation/types';
import { useCreatorProfileScreen } from './useCreatorProfileScreen';
import { styles } from './CreatorProfileScreen.styles';

type Props = NativeStackScreenProps<
  HomeStackParamList & DiscoverStackParamList & ProfileStackParamList,
  'CreatorProfile'
>;

export const CreatorProfileScreen = (props: Props) => {
  const {
    currentUser,
    profile,
    loading,
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
  } = useCreatorProfileScreen(props);

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

  const fs = 14;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.banner}>
        {profile.avatar ? <Image source={{ uri: profile.avatar }} style={styles.bannerImage} blurRadius={6} /> : null}
        <View style={styles.bannerOverlay} />
      </View>

      <TouchableOpacity
        style={styles.avatar}
        onPress={profile.isLive ? openLiveRoom : undefined}
        activeOpacity={profile.isLive ? 0.8 : 1}
      >
        {profile.avatar ? (
          <Image source={{ uri: profile.avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{profile.username[0]?.toUpperCase()}</Text>
        )}
        {profile.isLive ? (
          <View style={styles.liveAvatarBadge}>
            <Text style={styles.liveAvatarBadgeText}>LIVE</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <View style={styles.identityPanel}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{profile.displayName}</Text>
          {profile.isVerified ? <Icon name="verified" size={fs + 4} color={colors.primary} /> : null}
          {profile.isLive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.livePillText}>LIVE NOW</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.username}>@{profile.username}</Text>
        {profile.bio ? (
          <Text style={styles.bio}>{profile.bio}</Text>
        ) : (
          <Text style={styles.bioMuted}>Creator on Zemin</Text>
        )}
      </View>

      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() => props.navigation.navigate('FollowList', { username: profile.username, initialTab: 'followers' })}
          style={styles.statWrap}
        >
          <Text style={styles.statValue}>{profile.stats.followersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => props.navigation.navigate('FollowList', { username: profile.username, initialTab: 'following' })}
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

      {isOwnProfile && (profile.isCreator || currentUser?.isCreator || currentUser?.role === 'creator') && (
        <TouchableOpacity
          onPress={() => props.navigation.navigate('CreateSubscriptionTier')}
          style={styles.createPlanBtn}
          activeOpacity={0.82}
        >
          <Icon name="add-circle-outline" size={fs + 4} color={colors.primary} />
          <Text style={styles.createPlanText}>Create subscription plan</Text>
        </TouchableOpacity>
      )}

      {!isOwnProfile && (
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={toggleFollow}
            style={[styles.actionBtn, profile.isFollowing ? styles.actionBtnOutline : styles.actionBtnPrimary]}
            activeOpacity={0.82}
          >
            <Icon
              name={profile.isFollowing ? 'check' : 'person-add'}
              size={fs + 3}
              color={profile.isFollowing ? colors.primary : '#fff'}
            />
            <Text style={[styles.actionBtnText, profile.isFollowing && styles.actionBtnTextOutline]}>
              {profile.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>

          {profile.isLive ? (
            <TouchableOpacity onPress={openLiveRoom} style={[styles.actionBtn, styles.actionBtnLive]} activeOpacity={0.82}>
              <Icon name="live-tv" size={fs + 3} color="#fff" />
              <Text style={styles.actionBtnText}>Join Live</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startChat} style={[styles.actionBtn, styles.actionBtnSecondary]} activeOpacity={0.82}>
              <Icon name="chat-bubble-outline" size={fs + 3} color={colors.textPrimary} />
              <Text style={styles.actionBtnTextDark}>Message</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {!isOwnProfile && (
        <TouchableOpacity
          onPress={() =>
            props.navigation.navigate('SubscriptionTiers', {
              username: profile.username,
              creatorId: profile.id,
            })
          }
          style={styles.subscribeBtn}
          activeOpacity={0.82}
        >
          <Icon name="star" size={fs + 4} color="#fff" />
          <Text style={styles.subscribeText}>Subscribe</Text>
          <Icon name="arrow-forward" size={fs + 3} color="#fff" />
        </TouchableOpacity>
      )}

      <View style={styles.tabsRow}>
        <TouchableOpacity onPress={() => setActiveTab('posts')} style={styles.tabBtn}>
          <Icon name="grid-on" size={fs + 3} color={activeTab === 'posts' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tab, activeTab === 'posts' && styles.tabActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('highlights')} style={styles.tabBtn}>
          <Icon name="auto-awesome" size={fs + 3} color={activeTab === 'highlights' ? colors.primary : colors.textSecondary} />
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
                styles.gridItemSpacing,
                (index + 1) % 3 === 0 ? styles.gridItemRightZero : styles.gridItemRightSpacing,
                {
                  width: tileSize,
                  height: tileSize * 1.25,
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
