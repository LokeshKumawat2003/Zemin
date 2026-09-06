import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { usePostDetail } from '../../hooks/usePostDetail';

type Props = NativeStackScreenProps<HomeStackParamList, 'PostDetail'>;

export const PostDetailScreen = ({ route, navigation }: Props) => {
  const { postId } = route.params;
  const { post, comments, commentText, setCommentText, loading, sending, unlocking, submitComment, toggleLike, unlockPost } = usePostDetail(postId);

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />;
  }

  if (!post) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Post not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.creator}>
          {post.creator.displayName} @{post.creator.username}
        </Text>
        <Button
          title="Report"
          variant="outline"
          onPress={() => navigation.navigate('Report', { targetType: 'post', targetId: postId })}
          style={styles.reportBtn}
        />
      </View>

      {post.isLocked ? (
        <View style={styles.lockedBox}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>Gift to unlock</Text>
          <Text style={styles.lockedDesc}>
            Send {post.unlockGift?.emoji || '🎁'} {post.unlockGift?.name || 'the unlock gift'} to view this post.
          </Text>
          <Button
            title={`Send ${post.unlockGift?.emoji || '🎁'} ${post.unlockGift?.name || 'gift'}${post.unlockGift?.coinCost ? ` · ${post.unlockGift.coinCost} coins` : ''}`}
            onPress={unlockPost}
            loading={unlocking}
          />
        </View>
      ) : (
        <>
          {post.media?.[0]?.url && (
            <Image source={{ uri: post.media[0].url }} style={styles.media} resizeMode="cover" />
          )}
          {post.caption && <Text style={styles.caption}>{post.caption}</Text>}
        </>
      )}

      <View style={styles.actions}>
        <Button
          title={post.userHasLiked ? `❤️ ${post.stats.likesCount}` : `🤍 ${post.stats.likesCount}`}
          variant="outline"
          onPress={toggleLike}
          style={styles.likeBtn}
        />
        <Text style={styles.commentCount}>💬 {post.stats.commentsCount} comments</Text>
      </View>

      {!post.isLocked && (
        <>
          <Text style={styles.section}>Comments</Text>
          {comments.map((c) => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentUser}>@{c.user.username}</Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          ))}

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textDisabled}
            />
            <Button title="Post" onPress={submitComment} loading={sending} style={styles.sendBtn} />
          </View>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  creator: { ...typography.body, color: colors.textPrimary, fontWeight: '600', flex: 1 },
  reportBtn: { height: 36, paddingHorizontal: spacing.sm },
  media: { width: '100%', height: 360, backgroundColor: colors.surfaceElevated },
  caption: { ...typography.body, color: colors.textPrimary, padding: spacing.md },
  lockedBox: {
    margin: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  lockedIcon: { fontSize: 48, marginBottom: spacing.md },
  lockedTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  lockedDesc: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  actions: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, gap: spacing.md },
  likeBtn: { flex: 0, paddingHorizontal: spacing.md, height: 40 },
  commentCount: { ...typography.bodySmall, color: colors.textSecondary },
  section: { ...typography.h3, color: colors.textPrimary, padding: spacing.md, marginTop: spacing.sm },
  comment: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  commentUser: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  commentText: { ...typography.body, color: colors.textPrimary, marginTop: 2 },
  inputRow: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sendBtn: { height: 44, paddingHorizontal: spacing.md },
  empty: { ...typography.body, color: colors.textSecondary },
});
