import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from '@react-native-vector-icons/material-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { feedApi, uploadApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';
import { useResponsive } from '../../hooks/useResponsive';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { GiftEntryPicker } from '../../components/live/GiftEntryPicker';
import type { GiftItem } from '../../components/live/LiveGiftEffects';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreatePost'>;

export const CreatePostScreen = ({ navigation }: Props) => {
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'subscribers' | 'ppv'>('public');
  const [unlockGift, setUnlockGift] = useState<GiftItem | null>(null);
  const [loading, setLoading] = useState(false);
  const { fs, sp } = useResponsive();

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });
    const uri = result.assets?.[0]?.uri;
    if (uri) setMediaUri(uri);
  };

  const publish = async () => {
    if (!caption.trim() && !mediaUri) {
      Alert.alert('Add something first', 'Write a caption or choose an image.');
      return;
    }
    if (visibility === 'ppv' && !unlockGift) {
      Alert.alert('Choose an unlock gift', 'Viewers will send this gift to unlock your post.');
      return;
    }
    setLoading(true);
    try {
      let uploadedUrl: string | undefined;
      if (mediaUri) {
        const formData = new FormData();
        formData.append('file', { uri: mediaUri, type: 'image/jpeg', name: 'post-image.jpg' } as any);
        formData.append('folder', 'posts');
        const upload = await uploadApi.uploadMedia(formData);
        uploadedUrl = upload.data?.url;
        if (!uploadedUrl) throw new Error('Image upload failed');
      }
      const hasMedia = Boolean(uploadedUrl);
      await feedApi.createPost({
        type: hasMedia ? 'photo' : 'text',
        caption: caption.trim(),
        visibility,
        isPPV: visibility === 'ppv',
        unlockGiftId: visibility === 'ppv' ? unlockGift?.giftId : undefined,
        media: hasMedia ? [{ url: uploadedUrl, type: 'image' }] : [],
      });
      Alert.alert('Published!', 'Your post is live', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.error?.message || 'Could not publish');
    } finally {
      setLoading(false);
    }
  };

  return (
      <ScreenContainer centered={false} style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: sp(36) }]}>
            <View style={styles.header}>
              <View style={styles.headerIcon}><Icon name="edit-note" size={fs(26)} color={colors.primary} /></View>
              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>CREATE</Text>
                <Text style={styles.title}>New post</Text>
                <Text style={styles.subtitle}>Share a moment with your audience.</Text>
              </View>
            </View>

            <View style={styles.composerCard}>
              <Text style={styles.sectionTitle}>Your post</Text>
              <Input
                label="Caption"
                value={caption}
                onChangeText={setCaption}
                placeholder="What's on your mind? #hashtags"
                multiline
                style={styles.captionInput}
              />

              <TouchableOpacity style={[styles.mediaPicker, mediaUri && styles.mediaPickerFilled]} onPress={pickImage} activeOpacity={0.82}>
                {mediaUri ? (
                  <>
                    <Image source={{ uri: mediaUri }} style={styles.previewImage} />
                    <View style={styles.previewShade} />
                    <View style={styles.previewActions}>
                      <View style={styles.previewAction}><Icon name="photo-camera" size={fs(17)} color="#fff" /><Text style={styles.previewActionText}>Change</Text></View>
                      <TouchableOpacity style={styles.removeAction} onPress={() => setMediaUri(null)}><Icon name="delete-outline" size={fs(19)} color="#fff" /></TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.mediaIcon}><Icon name="add-photo-alternate" size={fs(28)} color={colors.primary} /></View>
                    <Text style={styles.mediaTitle}>Add a photo</Text>
                    <Text style={styles.mediaHint}>Choose an image from your device</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.settingsCard}>
              <Text style={styles.sectionTitle}>Who can see this?</Text>
              <View style={styles.visibilityRow}>
                {(['public', 'subscribers', 'ppv'] as const).map((value) => {
                  const active = visibility === value;
                  const iconName = value === 'public' ? 'public' : value === 'subscribers' ? 'group' : 'lock';
                  const label = value === 'public' ? 'Public' : value === 'subscribers' ? 'Subscribers' : 'PPV';
                  return (
                    <TouchableOpacity key={value} style={[styles.visibilityButton, active && styles.visibilityButtonActive]} onPress={() => setVisibility(value)} activeOpacity={0.8}>
                      <Icon name={iconName} size={fs(19)} color={active ? '#fff' : colors.textSecondary} />
                      <Text style={[styles.visibilityText, active && styles.visibilityTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {visibility === 'ppv' && (
                <GiftEntryPicker
                  selectedGiftId={unlockGift?.giftId}
                  onSelect={setUnlockGift}
                  label="Choose unlock gift"
                  hint="Viewers send this gift to unlock your post."
                  selectedLabel="Unlock gift"
                />
              )}
            </View>

            <Button title="Publish post" onPress={publish} loading={loading} style={styles.publish} />
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
