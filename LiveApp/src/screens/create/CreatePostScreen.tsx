import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { colors, typography, spacing } from '../../theme';
import { feedApi } from '../../api';
import { HomeStackParamList } from '../../navigation/HomeStack';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreatePost'>;

export const CreatePostScreen = ({ navigation }: Props) => {
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'subscribers' | 'ppv'>('public');
  const [ppvPrice, setPpvPrice] = useState('200');
  const [loading, setLoading] = useState(false);

  const publish = async () => {
    if (!caption.trim() && !mediaUrl.trim()) {
      Alert.alert('Error', 'Add a caption or media URL');
      return;
    }
    setLoading(true);
    try {
      const hasMedia = mediaUrl.trim().length > 0;
      await feedApi.createPost({
        type: hasMedia ? 'photo' : 'text',
        caption: caption.trim(),
        visibility,
        isPPV: visibility === 'ppv',
        ppvPrice: visibility === 'ppv' ? Number(ppvPrice) || 200 : undefined,
        media: hasMedia
          ? [{ url: mediaUrl.trim(), type: 'image' }]
          : [],
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Post</Text>
      <Input
        label="Caption"
        value={caption}
        onChangeText={setCaption}
        placeholder="What's on your mind? #hashtags"
        multiline
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />

      <Input
        label="Image URL (optional)"
        value={mediaUrl}
        onChangeText={setMediaUrl}
        placeholder="https://..."
        autoCapitalize="none"
      />

      <Text style={styles.label}>Visibility</Text>
      <View style={styles.row}>
        {(['public', 'subscribers', 'ppv'] as const).map((v) => (
          <Button
            key={v}
            title={v === 'public' ? 'Public' : v === 'subscribers' ? 'Subs' : 'PPV'}
            variant={visibility === v ? 'primary' : 'outline'}
            onPress={() => setVisibility(v)}
            style={styles.visBtn}
          />
        ))}
      </View>

      {visibility === 'ppv' && (
        <Input
          label="PPV Price (coins)"
          value={ppvPrice}
          onChangeText={setPpvPrice}
          keyboardType="number-pad"
        />
      )}

      <Button title="Publish" onPress={publish} loading={loading} style={styles.publish} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg },
  label: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  visBtn: { flex: 1 },
  publish: { marginTop: spacing.md },
});
