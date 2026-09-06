import Icon from '@react-native-vector-icons/material-icons';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  imageUrl: string | null;
  downloading: boolean;
  onClose: () => void;
  onDownload: () => void;
};

export const ChatImagePreviewModal = ({ imageUrl, downloading, onClose, onDownload }: Props) => (
  <Modal visible={!!imageUrl} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modal}>
      <Pressable style={styles.close} onPress={onClose} accessibilityLabel="Close image preview">
        <Icon name="close" size={28} color="#FFFFFF" />
      </Pressable>
      {imageUrl && <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />}
      <Pressable style={styles.download} onPress={onDownload} disabled={downloading} accessibilityLabel="Download image">
        {downloading ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="file-download" size={24} color="#FFFFFF" />}
      </Pressable>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', top: 48, right: 18, zIndex: 1, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  image: { width: '100%', height: '78%' },
  download: { position: 'absolute', bottom: 42, width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff2f6e' },
});
