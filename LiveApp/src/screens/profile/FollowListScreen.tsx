import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { creatorApi } from '../../api';
import { ProfileStackParamList } from '../../navigation/types';
import { colors, spacing, typography } from '../../theme';

type Props = NativeStackScreenProps<ProfileStackParamList, 'FollowList'>;

type FollowTab = 'followers' | 'following';

interface FollowUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  isVerified: boolean;
  isCreator: boolean;
  isFollowing: boolean;
}

export const FollowListScreen = ({ route, navigation }: Props) => {
  const { username, initialTab = 'followers' } = route.params;
  const [activeTab, setActiveTab] = useState<FollowTab>(initialTab);
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadList = useCallback(
    async (tab: FollowTab) => {
      try {
        setLoading(true);
        const res =
          tab === 'followers'
            ? await creatorApi.getFollowers(username)
            : await creatorApi.getFollowing(username);

        const items = res?.data?.items || [];
        setUsers(items);
      } catch (e: any) {
        Alert.alert('Error', e?.error?.message || 'Could not load list');
      } finally {
        setLoading(false);
      }
    },
    [username]
  );

  useEffect(() => {
    loadList(activeTab);
  }, [activeTab, loadList]);

  const handleOpenProfile = (person: FollowUser) => {
    navigation.navigate('CreatorProfile', { username: person.username });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity> */}
        <Text style={styles.title}>People</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>Following</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No one found yet.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.userRow} onPress={() => handleOpenProfile(item)} activeOpacity={0.85}>
              {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarText}>{(item.displayName || item.username).charAt(0).toUpperCase()}</Text>
                </View>
              )}

              <View style={styles.userInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.displayName || item.username}
                  </Text>
                  {item.isVerified ? <Text style={styles.verified}>✓</Text> : null}
                </View>
                <Text style={styles.username}>@{item.username}</Text>
                {!!item.bio ? <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text> : null}
              </View>

              {item.isCreator ? (
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>Creator</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: { padding: spacing.sm },
  backIcon: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  title: { ...typography.h3, color: colors.textPrimary },
  headerSpacer: { width: 40 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { ...typography.bodySmall, color: colors.textSecondary },
  tabTextActive: { color: '#fff', fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: spacing.sm },
  avatarPlaceholder: { backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  userInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  name: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  verified: { color: colors.success, fontSize: 14 },
  username: { color: colors.textSecondary, fontSize: 13, marginTop: 2 },
  bio: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  creatorBadge: {
    borderRadius: 999,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginLeft: spacing.sm,
  },
  creatorBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty: { ...typography.bodySmall, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xl },
});
