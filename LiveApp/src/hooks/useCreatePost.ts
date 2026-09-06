import { useState } from 'react';
import { Alert } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { feedApi, uploadApi } from '../api';
import type { GiftItem } from '../components/live/LiveGiftEffects';

type Props = { onPublished: () => void };

export const useCreatePost = ({ onPublished }: Props) => {
  const [caption, setCaption] = useState('');
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<'public' | 'ppv'>('public');
  const [unlockGift, setUnlockGift] = useState<GiftItem | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.9 });
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
      Alert.alert('Published!', 'Your post is live', [{ text: 'OK', onPress: onPublished }]);
    } catch (error: any) {
      Alert.alert('Error', error?.error?.message || 'Could not publish');
    } finally {
      setLoading(false);
    }
  };

  return { caption, setCaption, mediaUri, setMediaUri, visibility, setVisibility, unlockGift, setUnlockGift, loading, pickImage, publish };
};
