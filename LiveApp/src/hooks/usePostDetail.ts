import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { feedApi, unwrapApiResponse } from '../api';

export const usePostDetail = (postId: string) => {
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    try {
      const [postResponse, commentsResponse] = await Promise.all([feedApi.getPost(postId), feedApi.getComments(postId)]);
      setPost(postResponse.data);
      setComments(commentsResponse.data || []);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { void load(); }, [load]);

  const submitComment = async () => {
    if (!commentText.trim() || post?.isLocked) return;
    setSending(true);
    try {
      await feedApi.addComment(postId, commentText.trim());
      setCommentText('');
      await load();
    } finally {
      setSending(false);
    }
  };

  const toggleLike = async () => {
    if (!post || post.isLocked) return;
    if (post.userHasLiked) await feedApi.unlikePost(postId);
    else await feedApi.likePost(postId);
    await load();
  };

  const unlockPost = async () => {
    setUnlocking(true);
    try {
      const result = unwrapApiResponse<any>(await feedApi.purchasePpv(postId));
      if (result?.purchased) {
        Alert.alert('Unlocked!', 'You can now view this post.');
        await load();
      } else Alert.alert('Error', 'Could not unlock post');
    } catch (error: any) {
      Alert.alert('Error', error?.error?.message || 'Could not unlock post');
    } finally {
      setUnlocking(false);
    }
  };

  return { post, comments, commentText, setCommentText, loading, sending, unlocking, submitComment, toggleLike, unlockPost };
};
