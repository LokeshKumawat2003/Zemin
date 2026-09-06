import Icon from '@react-native-vector-icons/material-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { chatColors as colors } from './chatTheme';

type MessageType = 'text' | 'image' | 'file';

export type ChatMessage = {
  id: string;
  text?: string;
  time: string;
  isMine: boolean;
  type: MessageType;
  imageUrl?: string;
  fileName?: string;
  fileSize?: string;
  isRead?: boolean;
  isPending?: boolean;
  isFailed?: boolean;
};

type Props = {
  message: ChatMessage;
  tail: boolean;
  onImagePress: (imageUrl: string) => void;
};

const DeliveryIcon = ({ message }: { message: ChatMessage }) => message.isMine ? (
  <Icon
    name={message.isFailed ? 'error-outline' : message.isPending ? 'schedule' : message.isRead ? 'done-all' : 'done'}
    size={14}
    color={message.isFailed ? colors.error : message.isRead ? '#BFDBFE' : 'rgba(255,255,255,0.65)'}
  />
) : null;

const MessageMeta = ({ message }: { message: ChatMessage }) => (
  <View style={styles.messageBottom}>
    <Text style={[styles.messageTime, message.isMine && styles.myMessageTime]}>{message.time}</Text>
    <DeliveryIcon message={message} />
  </View>
);

const TextBubble = ({ message, tail }: { message: ChatMessage; tail: boolean }) => (
  <View style={[styles.messageBubble, message.isMine ? styles.myBubble : styles.otherBubble, tail && (message.isMine ? styles.myBubbleTail : styles.otherBubbleTail)]}>
    <Text style={[styles.messageText, message.isMine && styles.myMessageText]}>{message.text}</Text>
    <MessageMeta message={message} />
  </View>
);

const ImageBubble = ({ message, onImagePress }: { message: ChatMessage; onImagePress: (imageUrl: string) => void }) => (
  <View style={[styles.attachmentBubble, message.isMine ? styles.myAttachmentBubble : styles.otherAttachmentBubble]}>
    <Pressable onPress={() => message.imageUrl && onImagePress(message.imageUrl)}>
      <Image source={{ uri: message.imageUrl }} style={styles.chatImage} resizeMode="cover" />
    </Pressable>
    <View style={styles.attachmentBottom}>
      <Text style={[styles.messageTime, message.isMine && styles.myMessageTime]}>{message.time}</Text>
      <DeliveryIcon message={message} />
    </View>
  </View>
);

const FileBubble = ({ message }: { message: ChatMessage }) => (
  <View style={[styles.fileBubble, message.isMine ? styles.myBubble : styles.otherBubble]}>
    <View style={[styles.fileIconWrap, message.isMine && styles.fileIconWrapMine]}>
      <Icon name="description" size={22} color={message.isMine ? '#FFFFFF' : colors.primary} />
    </View>
    <View style={styles.fileInfo}>
      <Text numberOfLines={1} style={[styles.fileName, message.isMine && styles.myMessageText]}>{message.fileName || 'Attachment'}</Text>
      {message.fileSize && <Text style={[styles.fileSize, message.isMine && styles.myMessageTime]}>{message.fileSize}</Text>}
    </View>
    <View style={[styles.fileDownload, message.isMine && styles.fileDownloadMine]}>
      <Icon name="file-download" size={18} color={message.isMine ? '#FFFFFF' : colors.primary} />
    </View>
  </View>
);

export const ChatMessageBubble = ({ message, tail, onImagePress }: Props) => {
  if (message.type === 'image') return <ImageBubble message={message} onImagePress={onImagePress} />;
  if (message.type === 'file') return <FileBubble message={message} />;
  return <TextBubble message={message} tail={tail} />;
};

const styles = StyleSheet.create({
  messageBubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, marginBottom: 4 },
  otherBubble: { backgroundColor: colors.surface, borderTopLeftRadius: 16 },
  otherBubbleTail: { borderBottomLeftRadius: 4 },
  myBubble: { backgroundColor: colors.primary },
  myBubbleTail: { borderBottomRightRadius: 4 },
  messageText: { color: colors.textPrimary, fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#FFFFFF' },
  messageBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 3 },
  messageTime: { color: colors.textSecondary, fontSize: 9.5 },
  myMessageTime: { color: 'rgba(255,255,255,0.75)' },
  attachmentBubble: { overflow: 'hidden', borderRadius: 16, marginBottom: 4 },
  myAttachmentBubble: { backgroundColor: colors.primary },
  otherAttachmentBubble: { backgroundColor: colors.surface },
  chatImage: { width: 210, height: 155 },
  attachmentBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, paddingHorizontal: 9, paddingVertical: 6 },
  fileBubble: { minWidth: 215, maxWidth: 270, flexDirection: 'row', alignItems: 'center', padding: 9, borderRadius: 16, marginBottom: 4 },
  fileIconWrap: { width: 40, height: 40, borderRadius: 11, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  fileIconWrapMine: { backgroundColor: 'rgba(255,255,255,0.2)' },
  fileInfo: { flex: 1, marginRight: 8 },
  fileName: { color: colors.textPrimary, fontSize: 13, fontWeight: '600' },
  fileSize: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  fileDownload: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  fileDownloadMine: { backgroundColor: 'rgba(255,255,255,0.2)' },
});
