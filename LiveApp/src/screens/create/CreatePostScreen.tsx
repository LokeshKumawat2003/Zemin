import React from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useCreatePost } from '../../hooks/useCreatePost';
import { CreatePostHeader } from '../../components/create/CreatePostHeader';
import { PostMediaPicker } from '../../components/create/PostMediaPicker';
import { PostVisibilitySettings } from '../../components/create/PostVisibilitySettings';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreatePost'>;

export const CreatePostScreen = ({ navigation }: Props) => {
  const { fs, sp } = useResponsive();
  const post = useCreatePost({ onPublished: () => navigation.goBack() });

  return (
    <ScreenContainer centered={false} style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: sp(36) }]}>
          <CreatePostHeader fs={fs} />

          <View style={styles.composerCard}>
            <Text style={styles.sectionTitle}>Your post</Text>
            <Input
              label="Caption"
              value={post.caption}
              onChangeText={post.setCaption}
              placeholder="What's on your mind? #hashtags"
              multiline
              style={styles.captionInput}
            />

            <PostMediaPicker fs={fs} mediaUri={post.mediaUri} onPick={post.pickImage} onRemove={() => post.setMediaUri(null)} />
          </View>

          <PostVisibilitySettings fs={fs} visibility={post.visibility} unlockGift={post.unlockGift} onVisibilityChange={post.setVisibility} onGiftChange={post.setUnlockGift} />

          <Button title="Publish post" onPress={post.publish} loading={post.loading} style={styles.publish} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  content: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  headerIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,47,110,0.14)', marginRight: spacing.sm },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  title: { ...typography.h2, color: colors.textPrimary, marginTop: 2 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 3 },
  composerCard: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md },
  settingsCard: { backgroundColor: colors.surface, borderRadius: 22, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  sectionTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '800', marginBottom: spacing.md },
  captionInput: { minHeight: 116, textAlignVertical: 'top' },
  mediaPicker: { height: 170, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, backgroundColor: 'rgba(255,47,110,0.06)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: spacing.sm },
  mediaPickerFilled: { borderStyle: 'solid', backgroundColor: colors.surface },
  mediaIcon: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,47,110,0.14)', marginBottom: spacing.sm },
  mediaTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '800' },
  mediaHint: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },
  previewActions: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewAction: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  previewActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  removeAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,47,110,0.9)' },
  visibilityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  visibilityButton: { flex: 1, minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', gap: 4 },
  visibilityButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  visibilityText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  visibilityTextActive: { color: '#fff' },
  publish: { marginTop: spacing.sm, marginBottom: spacing.sm, borderRadius: 15 },
});
