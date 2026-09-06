import { useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { chatApi } from '../../api';
import { useAppSelector } from '../../redux/hooks';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';
import { ChatRoomHeader } from '../../components/chat/ChatRoomHeader';
import { ChatImagePreviewModal } from '../../components/chat/ChatImagePreviewModal';
import { ReportUserModal } from '../../components/chat/ReportUserModal';
import { ChatMessageList } from '../../components/chat/ChatMessageList';
import { ChatComposer } from '../../components/chat/ChatComposer';
import { chatColors as colors } from '../../components/chat/chatTheme';
import { mapApiMessage, Message, useChatMessages } from '../../hooks/useChatMessages';
import { useChatMedia } from '../../hooks/useChatMedia';
import { useChatModeration } from '../../hooks/useChatModeration';

/**
 * ----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------
 */
type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

const AVATAR_URI = 'https://i.pravatar.cc/100?img=12';
/**
 * ----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------
 */
export const ChatRoomScreen = ({ navigation, route }: Props) => {
  const { conversationId, recipientId, recipientName, recipientAvatar, recipientOnline } = route.params;
  const currentUserId = useAppSelector(state => state.auth.user?.id);
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);
  const {
    messages,
    setMessages,
    loadingMessages,
    loadingOlder,
    showScrollToBottom,
    isRecipientOnline,
    chatScrollRef,
    viewportHeight,
    userStartedScrolling,
    scrollToEndAfterLayout,
    handleScroll,
    handleContentSizeChange,
    scrollToBottom,
  } = useChatMessages({ conversationId, recipientId, currentUserId, recipientOnline });
  const media = useChatMedia({
    conversationId,
    currentUserId,
    setMessages,
    markScrollToEnd: () => { scrollToEndAfterLayout.current = true; },
  });
  const moderation = useChatModeration({
    recipientId,
    recipientName,
    onBlocked: () => navigation.goBack(),
  });

  const hasText = message.trim().length > 0;

  const sendMessage = async () => {
    const text = message.trim();
    if (!text) return;

    const temporaryId = `local-${Date.now()}`;
    const optimisticMessage: Message = {
      id: temporaryId,
      text,
      time: 'Now',
      isMine: true,
      type: 'text',
      isRead: false,
      isPending: true,
    };

    setMessages(previous => [...previous, optimisticMessage]);
    scrollToEndAfterLayout.current = true;
    setMessage('');

    try {
      const response = await chatApi.sendMessage(conversationId, text);
      const sentMessage = mapApiMessage(response?.data || response, currentUserId);
      setMessages(previous =>
        previous.map(item => (item.id === temporaryId ? sentMessage : item))
      );
    } catch {
      setMessages(previous =>
        previous.map(item =>
          item.id === temporaryId ? { ...item, isPending: false, isFailed: true } : item
        )
      );
      Alert.alert('Message failed', 'Unable to send your message. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ChatRoomHeader
        recipientName={recipientName}
        recipientAvatar={recipientAvatar}
        isRecipientOnline={isRecipientOnline}
        showActions={moderation.showChatActions}
        onBack={() => navigation.goBack()}
        onToggleActions={moderation.openChatActions}
        onReport={moderation.openReportModal}
        onBlock={moderation.confirmBlockUser}
      />

      <ChatMessageList
        scrollRef={chatScrollRef}
        messages={messages}
        loadingMessages={loadingMessages}
        loadingOlder={loadingOlder}
        showScrollToBottom={showScrollToBottom}
        recipientAvatar={recipientAvatar}
        fallbackAvatar={AVATAR_URI}
        onScroll={handleScroll}
        onScrollBeginDrag={() => { userStartedScrolling.current = true; }}
        onLayout={event => {
          viewportHeight.current = event.nativeEvent.layout.height;
        }}
        onContentSizeChange={handleContentSizeChange}
        onScrollToBottom={scrollToBottom}
        onImagePress={media.setSelectedImage}
      />

      <ChatComposer
        inputRef={inputRef}
        message={message}
        hasText={hasText}
        uploading={media.uploading}
        onChangeMessage={setMessage}
        onPickAttachment={media.pickAttachment}
        onSend={sendMessage}
      />

      <ChatImagePreviewModal
        imageUrl={media.selectedImage}
        downloading={media.downloadingImage}
        onClose={() => media.setSelectedImage(null)}
        onDownload={media.downloadSelectedImage}
      />

      <ReportUserModal
        visible={moderation.showReportModal}
        recipientName={recipientName}
        reason={moderation.reportReason}
        description={moderation.reportDescription}
        reporting={moderation.reporting}
        onClose={() => moderation.setShowReportModal(false)}
        onReasonChange={moderation.setReportReason}
        onDescriptionChange={moderation.setReportDescription}
        onSubmit={moderation.reportUser}
      />
    </View>
  );
};

/**
 * ----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});