import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Alert } from 'react-native';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { RESULTS } from 'react-native-permissions';
import { chatApi, uploadApi } from '../api';
import type { Message } from './useChatMessages';
import { mapApiMessage } from './useChatMessages';
import { usePermissions } from '../permissions';

type Props = {
  conversationId: string;
  currentUserId?: string;
  setMessages: Dispatch<SetStateAction<Message[]>>;
  markScrollToEnd: () => void;
};

export const useChatMedia = ({ conversationId, currentUserId, setMessages, markScrollToEnd }: Props) => {
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const { ensurePermission } = usePermissions();

  const downloadSelectedImage = async () => {
    if (!selectedImage || downloadingImage) return;
    try {
      setDownloadingImage(true);
      const permission = await ensurePermission('gallery');
      if (permission !== RESULTS.GRANTED && permission !== RESULTS.LIMITED) {
        Alert.alert('Permission required', 'Allow photo access to download this image.');
        return;
      }
      const extension = selectedImage.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
      const filePath = `${RNFS.CachesDirectoryPath}/zemin-${Date.now()}.${extension}`;
      const result = await RNFS.downloadFile({ fromUrl: selectedImage, toFile: filePath }).promise;
      if (result.statusCode < 200 || result.statusCode >= 300) throw new Error('Image download failed');
      await CameraRoll.save(filePath, { type: 'photo' });
      Alert.alert('Saved', 'Image saved to your gallery.');
    } catch {
      Alert.alert('Download failed', 'Unable to save this image.');
    } finally {
      setDownloadingImage(false);
    }
  };

  const pickAttachment = async () => {
    if (uploading) return;
    let temporaryId: string | null = null;
    try {
      setUploading(true);
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 1, quality: 0.9 });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      const fileName = asset.fileName || 'attachment';
      temporaryId = `local-image-${Date.now()}`;
      const optimisticImage: Message = {
        id: temporaryId,
        type: 'image',
        time: 'Now',
        isMine: true,
        imageUrl: asset.uri,
        fileName,
        fileSize: asset.fileSize ? `${(asset.fileSize / 1024 / 1024).toFixed(1)} MB` : undefined,
        isRead: false,
        isPending: true,
      };
      setMessages(previous => [...previous, optimisticImage]);
      markScrollToEnd();

      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: asset.type || 'image/jpeg', name: fileName } as any);
      formData.append('folder', 'posts');
      formData.append('type', 'image');
      const uploadResponse = await uploadApi.uploadMedia(formData);
      const uploadedFile = uploadResponse?.data || uploadResponse;
      if (!uploadedFile?.url) throw new Error('Image upload did not return a URL');

      const messageResponse = await chatApi.sendMessage(conversationId, '', 'image', uploadedFile.url);
      const sentMessage = mapApiMessage(messageResponse?.data || messageResponse, currentUserId);
      setMessages(previous => previous.map(item => item.id === temporaryId ? sentMessage : item));
    } catch {
      if (temporaryId) {
        setMessages(previous => previous.map(item => item.id === temporaryId ? { ...item, isPending: false, isFailed: true } : item));
      }
      Alert.alert('Attachment failed', 'Unable to upload and send this image.');
    } finally {
      setUploading(false);
    }
  };

  return { uploading, selectedImage, downloadingImage, setSelectedImage, downloadSelectedImage, pickAttachment };
};
