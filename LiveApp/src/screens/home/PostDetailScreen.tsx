import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { feedApi, unwrapApiResponse } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'PostDetail'>;

export const PostDetailScreen = ({ route, navigation }: Props) => {
  const { postId } = route.params;
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const load = async () => {
    try {
      const [postRes, commentsRes] = await Promise.all([
        feedApi.getPost(postId),
        feedApi.getComments(postId),
      ]);
      setPost(postRes.data);
      setComments(commentsRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [postId]);

  const submitComment = async () => {
    if (!commentText.trim() || post?.isLocked) return;
    setSending(true);
    try {
      await feedApi.addComment(postId, commentText.trim());
      setCommentText('');
      load();
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async () => {
    if (!post || post.isLocked) return;
    if (post.userHasLiked) await feedApi.unlikePost(postId);
    else await feedApi.likePost(postId);
    load();
  };

  const unlockPost = async () => {
    setUnlocking(true);
    try {
      const res = unwrapApiResponse<any>(await feedApi.purchasePpv(postId));
      if (res?.purchased) {
        Alert.alert('Unlocked!', 'You can now view this post.');
        await load();
      } else {
        Alert.alert('Error', 'Could not unlock post');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not unlock post');
    } finally {
      setUnlocking(false);
    }
  };

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
          <Text style={styles.lockedTitle}>Pay-Per-View Content</Text>
          <Text style={styles.lockedDesc}>Unlock for {post.ppvPrice} coins</Text>
          <Button title={`Unlock — ${post.ppvPrice} coins`} onPress={unlockPost} loading={unlocking} />
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
