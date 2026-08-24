import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../../theme';

interface Props {
  post: {
    id: string;
    type: string;
    caption?: string;
    media?: { url: string; type: string }[];
    stats: { likesCount: number; commentsCount: number };
    creator: {
      username: string;
      displayName: string;
      avatar?: string;
      isVerified?: boolean;
    };
  };
  onLike?: () => void;
  onPress?: () => void;
  onCreatorPress?: () => void;
}

export const PostCard = ({ post, onLike, onPress, onCreatorPress }: Props) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
    <TouchableOpacity style={styles.header} onPress={onCreatorPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        {post.creator.avatar ? (
          <Image source={{ uri: post.creator.avatar }} style={styles.avatarImg} />
        ) : (
          <Text style={styles.avatarText}>{post.creator.username[0]?.toUpperCase()}</Text>
        )}
      </View>
      <View>
        <Text style={styles.name}>
          {post.creator.displayName}
          {post.creator.isVerified ? ' ✓' : ''}
        </Text>
        <Text style={styles.username}>@{post.creator.username}</Text>
      </View>
    </TouchableOpacity>

    {post.media?.[0]?.url ? (
      <Image source={{ uri: post.media[0].url }} style={styles.media} resizeMode="cover" />
    ) : post.caption ? (
      <View style={styles.textPost}>
        <Text style={styles.caption}>{post.caption}</Text>
      </View>
    ) : null}

    {post.media?.[0] && post.caption ? (
      <Text style={styles.caption} numberOfLines={2}>{post.caption}</Text>
    ) : null}

    <View style={styles.actions}>
      <TouchableOpacity onPress={onLike}>
        <Text style={styles.actionText}>❤️ {post.stats.likesCount}</Text>
      </TouchableOpacity>
      <Text style={styles.actionText}>💬 {post.stats.commentsCount}</Text>
      <Text style={styles.actionText}>🎁 Gift</Text>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  username: { ...typography.caption, color: colors.textSecondary },
  media: { width: '100%', height: 320, backgroundColor: colors.surfaceElevated },
  textPost: { padding: spacing.lg, minHeight: 100, justifyContent: 'center' },
  caption: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionText: { ...typography.bodySmall, color: colors.textSecondary },
});
