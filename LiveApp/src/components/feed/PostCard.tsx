import React, { useMemo } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

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

export const PostCard = ({ post, onLike, onPress, onCreatorPress }: Props) => {
  const { fs, sp, width } = useResponsive();
  const mediaHeight = Math.min(sp(320), width * 0.55);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          marginBottom: sp(16),
          borderRadius: sp(16),
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colors.border,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          padding: sp(16),
          gap: sp(8),
        },
        avatar: {
          width: sp(44),
          height: sp(44),
          borderRadius: sp(22),
          backgroundColor: colors.secondary,
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarImg: { width: sp(44), height: sp(44), borderRadius: sp(22) },
        avatarText: { color: '#fff', fontWeight: '700', fontSize: fs(18) },
        name: {
          ...typography.body,
          fontSize: fs(16),
          color: colors.textPrimary,
          fontWeight: '600',
        },
        username: {
          ...typography.caption,
          fontSize: fs(12),
          color: colors.textSecondary,
        },
        media: {
          width: '100%',
          height: mediaHeight,
          backgroundColor: colors.surfaceElevated,
        },
        textPost: { padding: sp(24), minHeight: sp(100), justifyContent: 'center' },
        caption: {
          ...typography.bodySmall,
          fontSize: fs(14),
          color: colors.textPrimary,
          paddingHorizontal: sp(16),
          paddingBottom: sp(8),
        },
        actions: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: sp(16),
          padding: sp(16),
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        actionText: {
          ...typography.bodySmall,
          fontSize: fs(14),
          color: colors.textSecondary,
        },
      }),
    [fs, sp, mediaHeight]
  );

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <TouchableOpacity style={styles.header} onPress={onCreatorPress} activeOpacity={0.7}>
        <View style={styles.avatar}>
          {post.creator.avatar ? (
            <Image source={{ uri: post.creator.avatar }} style={styles.avatarImg} />
          ) : (
            <Text style={styles.avatarText}>{post.creator.username[0]?.toUpperCase()}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {post.creator.displayName}
            {post.creator.isVerified ? ' ✓' : ''}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{post.creator.username}
          </Text>
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
        <Text style={styles.caption} numberOfLines={2}>
          {post.caption}
        </Text>
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
};
