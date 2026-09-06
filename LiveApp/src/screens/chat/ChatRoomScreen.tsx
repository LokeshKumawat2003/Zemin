import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  KeyboardChatScrollView,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import type { KeyboardChatScrollViewRef } from 'react-native-keyboard-controller';

import Icon from '@react-native-vector-icons/material-icons';
import { CameraRoll } from '@react-native-camera-roll/camera-roll';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { RESULTS } from 'react-native-permissions';
import { colors as baseColors } from '../../theme';
import { chatApi, uploadApi } from '../../api';
import { socketManager } from '../../socket/socketClient';
import { useAppSelector } from '../../redux/hooks';
import { usePermissions } from '../../permissions';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ChatStackParamList } from '../../navigation/types';

/**
 * ----------------------------------------------------------------
 * Types
 * ----------------------------------------------------------------
 */
type MessageType = 'text' | 'image' | 'file';

type Message = {
  id: string;
  text?: string;
  time: string;
  isMine: boolean;
  type: MessageType;
  imageUrl?: string;
  fileName?: string;
  fileSize?: string;
  avatar?: string;
  isRead?: boolean;
  isPending?: boolean;
  isFailed?: boolean;
};

type Props = NativeStackScreenProps<ChatStackParamList, 'ChatRoom'>;

const AVATAR_URI = 'https://i.pravatar.cc/100?img=12';
const MESSAGE_PAGE_SIZE = 15;
const chatMessagesCache = new Map<string, Message[]>();
const chatNextPageCache = new Map<string, number>();
const chatHasMoreCache = new Map<string, boolean>();

/**
 * ----------------------------------------------------------------
 * Helpers
 * ----------------------------------------------------------------
 */
const isGroupStart = (messages: Message[], index: number) =>
  index === 0 || messages[index - 1].isMine !== messages[index].isMine;

const isGroupEnd = (messages: Message[], index: number) =>
  index === messages.length - 1 || messages[index + 1].isMine !== messages[index].isMine;

const getMessageItems = (response: any): any[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return Array.isArray(response) ? response : [];
};

const mapApiMessage = (item: any, currentUserId?: string): Message => {
  const senderId = item.senderId?._id || item.senderId?.id || item.senderId;
  const sentAt = item.sentAt || item.createdAt;

  return {
    id: String(item.id || item._id),
    text: item.text,
    time: sentAt ? new Date(sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Now',
    isMine: item.isMine ?? String(senderId) === String(currentUserId),
    type: item.type === 'image' || item.type === 'file' ? item.type : 'text',
    imageUrl: item.imageUrl || item.mediaUrl,
    fileName: item.fileName,
    fileSize: item.fileSize,
    avatar: item.sender?.avatar || item.sender?.avatarUrl,
    isRead: item.isRead,
  };
};

/**
 * ----------------------------------------------------------------
 * Screen
 * ----------------------------------------------------------------
 */
export const ChatRoomScreen = ({ route }: Props) => {
  const { conversationId, recipientId, recipientName, recipientAvatar, recipientOnline } = route.params;
  const currentUserId = useAppSelector(state => state.auth.user?.id);
  const [message, setMessage] = useState('');
  const cachedMessages = chatMessagesCache.get(conversationId);
  const hasCachedMessages = Boolean(cachedMessages?.length);
  const [messages, setMessages] = useState<Message[]>(() => cachedMessages || []);
  const [loadingMessages, setLoadingMessages] = useState(!hasCachedMessages);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(
    chatHasMoreCache.get(conversationId) ?? true
  );
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(Boolean(recipientOnline));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const chatScrollRef = useRef<KeyboardChatScrollViewRef>(null);
  const nextMessagePage = useRef(chatNextPageCache.get(conversationId) ?? 2);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const preserveScrollAfterPrepend = useRef<{ offset: number; height: number } | null>(null);
  const scrollToEndAfterLayout = useRef(true);
  const { ensurePermission } = usePermissions();

  const hasText = message.trim().length > 0;

  const scrollToLatestMessage = () => {
    if (loadingMessages || !messages.length || preserveScrollAfterPrepend.current) return;

    const scroll = () => {
      chatScrollRef.current?.scrollToEnd({ animated: false });
    };

    requestAnimationFrame(() => {
      scroll();
      requestAnimationFrame(() => {
        scroll();
        setTimeout(scroll, 100);
      });
    });
  };

  useEffect(() => {
    chatMessagesCache.set(conversationId, messages);
  }, [conversationId, messages]);

  useEffect(() => {
    let active = true;
    setLoadingMessages(!hasCachedMessages);

    const loadMessages = async () => {
      try {
        const response = await chatApi.getMessages(conversationId, 1, MESSAGE_PAGE_SIZE);
        if (active) {
          const serverMessages = getMessageItems(response).map(item => mapApiMessage(item, currentUserId));
          const totalPages = (response as any)?.meta?.totalPages;
          if (!hasCachedMessages) {
            nextMessagePage.current = 2;
            chatNextPageCache.set(conversationId, 2);
          }
          const hasMore = totalPages ? totalPages > 1 : serverMessages.length === MESSAGE_PAGE_SIZE;
          setHasOlderMessages(hasMore);
          chatHasMoreCache.set(conversationId, hasMore);
          if (!hasCachedMessages) scrollToEndAfterLayout.current = true;
          setMessages(previous => {
            const serverMessageIds = new Set(serverMessages.map(item => item.id));
            return [
              ...serverMessages,
              ...previous.filter(item => !serverMessageIds.has(item.id)),
            ];
          });
          socketManager.markChatRead(conversationId);
        }
      } catch {
        if (active) Alert.alert('Unable to load messages', 'Please try again.');
      } finally {
        if (active) setLoadingMessages(false);
      }
    };

    void loadMessages();
    return () => {
      active = false;
    };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    socketManager.connect();
    socketManager.joinChat(conversationId);

    const cleanup = socketManager.onChatMessage((payload: any) => {
      if (
        payload?.conversationId !== conversationId ||
        String(payload?.senderId) === String(currentUserId)
      ) {
        return;
      }

      const incomingMessage = mapApiMessage(payload, currentUserId);
      scrollToEndAfterLayout.current = true;
      setMessages(previous =>
        previous.some(item => item.id === incomingMessage.id) ? previous : [...previous, incomingMessage]
      );
    });
    const cleanupRead = socketManager.onChatRead(data => {
      if (data.conversationId !== conversationId) return;
      setMessages(previous =>
        previous.map(item =>
          data.messageIds.includes(item.id) ? { ...item, isRead: true } : item
        )
      );
    });
    const cleanupPresence = socketManager.onPresence(data => {
      if (data.userId === recipientId) setIsRecipientOnline(data.online);
    });

    return () => {
      cleanup?.();
      cleanupRead?.();
      cleanupPresence?.();
      socketManager.leaveChat(conversationId);
    };
  }, [conversationId, currentUserId, recipientId]);

  const loadOlderMessages = async () => {
    if (loadingMessages || loadingOlder || !hasOlderMessages) return;

    const previousHeight = contentHeight.current;
    const previousOffset = scrollOffset.current;
    setLoadingOlder(true);
    try {
      const response = await chatApi.getMessages(
        conversationId,
        nextMessagePage.current,
        MESSAGE_PAGE_SIZE
      );
      const olderMessages = getMessageItems(response).map(item => mapApiMessage(item, currentUserId));
      const totalPages = (response as any)?.meta?.totalPages;
      if (!olderMessages.length) {
        setHasOlderMessages(false);
        chatHasMoreCache.set(conversationId, false);
        return;
      }

      preserveScrollAfterPrepend.current = {
        offset: previousOffset,
        height: previousHeight,
      };
      nextMessagePage.current += 1;
      chatNextPageCache.set(conversationId, nextMessagePage.current);
      const hasMore = totalPages
        ? nextMessagePage.current - 1 < totalPages
        : olderMessages.length === MESSAGE_PAGE_SIZE;
      setHasOlderMessages(hasMore);
      chatHasMoreCache.set(conversationId, hasMore);
      scrollToEndAfterLayout.current = false;
      setMessages(previous => {
        const existingIds = new Set(previous.map(item => item.id));
        return [...olderMessages.filter(item => !existingIds.has(item.id)), ...previous];
      });
    } catch {
      Alert.alert('Unable to load older messages', 'Please try again.');
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleScroll = (event: any) => {
    const { y } = event.nativeEvent.contentOffset;
    scrollOffset.current = y;
    const distanceFromBottom = contentHeight.current - (y + viewportHeight.current);
    setShowScrollToBottom(distanceFromBottom > 100);
    if (y <= 80) void loadOlderMessages();
  };

  const handleContentSizeChange = (_width: number, height: number) => {
    const previousScroll = preserveScrollAfterPrepend.current;
    contentHeight.current = height;

    if (loadingMessages) return;

    if (previousScroll) {
      preserveScrollAfterPrepend.current = null;
      requestAnimationFrame(() => {
        chatScrollRef.current?.scrollTo({
          y: previousScroll.offset + (height - previousScroll.height),
          animated: false,
        });
      });
      return;
    }

    if (height <= viewportHeight.current + 10) void loadOlderMessages();

    if (scrollToEndAfterLayout.current) scrollToLatestMessage();
  };

  useEffect(() => {
    if (loadingMessages || !messages.length || !scrollToEndAfterLayout.current) return;

    scrollToEndAfterLayout.current = false;
    scrollToLatestMessage();
    setShowScrollToBottom(false);
  }, [loadingMessages, messages.length]);

  const scrollToBottom = () => {
    chatScrollRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
  };

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
      if (result.statusCode < 200 || result.statusCode >= 300) {
        throw new Error('Image download failed');
      }

      await CameraRoll.save(filePath, { type: 'photo' });
      Alert.alert('Saved', 'Image saved to your gallery.');
    } catch {
      Alert.alert('Download failed', 'Unable to save this image.');
    } finally {
      setDownloadingImage(false);
    }
  };

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

  const pickAttachment = async () => {
    if (uploading) return;

    let temporaryId: string | null = null;

    try {
      setUploading(true);

      const result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });

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
      scrollToEndAfterLayout.current = true;

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: fileName,
      } as any);
      formData.append('folder', 'posts');
      formData.append('type', 'image');

      const uploadResponse = await uploadApi.uploadMedia(formData);
      const uploadedFile = uploadResponse?.data || uploadResponse;
      if (!uploadedFile?.url) {
        throw new Error('Image upload did not return a URL');
      }

      const messageResponse = await chatApi.sendMessage(
        conversationId,
        '',
        'image',
        uploadedFile.url
      );
      const sentMessage = mapApiMessage(messageResponse?.data || messageResponse, currentUserId);
      setMessages(previous =>
        previous.map(item => (item.id === temporaryId ? sentMessage : item))
      );
    } catch {
      if (temporaryId) {
        setMessages(previous =>
          previous.map(item =>
            item.id === temporaryId ? { ...item, isPending: false, isFailed: true } : item
          )
        );
      }
      Alert.alert('Attachment failed', 'Unable to upload and send this image.');
    } finally {
      setUploading(false);
    }
  };

  /** ---------------- Bubble renderers ---------------- */

  const renderTextMessage = (item: Message, tail: boolean) => (
    <View
      style={[
        styles.messageBubble,
        item.isMine ? styles.myBubble : styles.otherBubble,
        tail && (item.isMine ? styles.myBubbleTail : styles.otherBubbleTail),
      ]}
    >
      <Text style={[styles.messageText, item.isMine && styles.myMessageText]}>{item.text}</Text>

      <View style={styles.messageBottom}>
        <Text style={[styles.messageTime, item.isMine && styles.myMessageTime]}>{item.time}</Text>
        {item.isMine && (
            <Icon
            name={item.isFailed ? 'error-outline' : item.isPending ? 'schedule' : item.isRead ? 'done-all' : 'done'}
            size={14}
            color={item.isFailed ? colors.error : item.isRead ? '#BFDBFE' : 'rgba(255,255,255,0.65)'}
          />
        )}
      </View>
    </View>
  );

  const renderImageMessage = (item: Message) => (
    <View
      style={[
        styles.attachmentBubble,
        item.isMine ? styles.myAttachmentBubble : styles.otherAttachmentBubble,
      ]}
    >
      <Pressable onPress={() => item.imageUrl && setSelectedImage(item.imageUrl)}>
        <Image source={{ uri: item.imageUrl }} style={styles.chatImage} resizeMode="cover" />
      </Pressable>

      <View style={styles.attachmentBottom}>
        <Text style={[styles.messageTime, item.isMine && styles.myMessageTime]}>{item.time}</Text>
        {item.isMine && (
          <Icon
            name={item.isFailed ? 'error-outline' : item.isPending ? 'schedule' : item.isRead ? 'done-all' : 'done'}
            size={14}
            color={item.isFailed ? colors.error : item.isRead ? '#BFDBFE' : 'rgba(255,255,255,0.65)'}
          />
        )}
      </View>
    </View>
  );

  const renderFileMessage = (item: Message) => (
    <View style={[styles.fileBubble, item.isMine ? styles.myBubble : styles.otherBubble]}>
      <View style={[styles.fileIconWrap, item.isMine && styles.fileIconWrapMine]}>
        <Icon name="description" size={22} color={item.isMine ? '#FFFFFF' : colors.primary} />
      </View>

      <View style={styles.fileInfo}>
        <Text numberOfLines={1} style={[styles.fileName, item.isMine && styles.myMessageText]}>
          {item.fileName || 'Attachment'}
        </Text>
        {item.fileSize && (
          <Text style={[styles.fileSize, item.isMine && styles.myMessageTime]}>{item.fileSize}</Text>
        )}
      </View>

      <View style={[styles.fileDownload, item.isMine && styles.fileDownloadMine]}>
        <Icon name="file-download" size={18} color={item.isMine ? '#FFFFFF' : colors.primary} />
      </View>
    </View>
  );

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const groupEnd = isGroupEnd(messages, index);
    const groupStart = isGroupStart(messages, index);

    return (
      <View
        style={[
          styles.messageRow,
          item.isMine && styles.myMessageRow,
          groupStart && styles.messageRowSpaced,
        ]}
      >
        {!item.isMine && (
          groupEnd ? (
            <Image source={{ uri: item.avatar || recipientAvatar || AVATAR_URI }} style={styles.messageAvatar} />
          ) : (
            <View style={styles.messageAvatarSpacer} />
          )
        )}

        <View style={styles.messageContent}>
          {item.type === 'image'
            ? renderImageMessage(item)
            : item.type === 'file'
            ? renderFileMessage(item)
            : renderTextMessage(item, groupEnd)}
        </View>
      </View>
    );
  };

  const listData = useMemo(() => messages, [messages]);

  return (
    <View style={styles.container}>
      {/* ---------------- HEADER ---------------- */}
      <View style={styles.header}>
        <Pressable style={styles.headerIconButton} onPress={() => {}} hitSlop={8}>
          <Icon name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.avatarWrap}>
          <Image source={{ uri: recipientAvatar || AVATAR_URI }} style={styles.headerAvatar} />
          {isRecipientOnline && <View style={styles.onlineBadge} />}
        </View>

        <View style={styles.userInfo}>
          <Text numberOfLines={1} style={styles.userName}>
            {recipientName}
          </Text>
          {isRecipientOnline && <Text style={styles.onlineText}>Active now</Text>}
        </View>

        <Pressable style={styles.headerIconButton} hitSlop={8}>
          <Icon name="call" size={20} color={colors.primary} />
        </Pressable>

        <Pressable style={styles.headerIconButton} hitSlop={8}>
          <Icon name="videocam" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {/* ---------------- CHAT ---------------- */}
      <KeyboardChatScrollView
        ref={chatScrollRef}
        contentContainerStyle={styles.chatContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        onLayout={event => {
          viewportHeight.current = event.nativeEvent.layout.height;
          if (contentHeight.current <= viewportHeight.current + 10) void loadOlderMessages();
        }}
        onContentSizeChange={handleContentSizeChange}
      >
        {loadingMessages ? (
          <ActivityIndicator color={colors.primary} style={styles.messageLoader} />
        ) : (
          <>
            {loadingOlder && <ActivityIndicator color={colors.primary} style={styles.olderLoader} />}

            <View style={styles.dateContainer}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>TODAY</Text>
              <View style={styles.dateLine} />
            </View>

            <FlatList
              data={listData}
              renderItem={renderMessage}
              keyExtractor={item => item.id}
              scrollEnabled={false}
            />
          </>
        )}
      </KeyboardChatScrollView>

      {showScrollToBottom && (
        <Pressable
          style={styles.scrollToBottomButton}
          onPress={scrollToBottom}
          accessibilityLabel="Scroll to latest message"
        >
          <Icon name="keyboard-arrow-down" size={24} color={colors.textPrimary} />
        </Pressable>
      )}

      {/* ---------------- INPUT ---------------- */}
      <KeyboardStickyView offset={{ opened: 0, closed: 0 }} style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Pressable style={styles.attachButton} onPress={pickAttachment} disabled={uploading} hitSlop={6}>
            {uploading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Icon name="add" size={24} color={colors.primary} />
            )}
          </Pressable>

          <TextInput
            ref={inputRef}
            value={message}
            onChangeText={setMessage}
            placeholder="Write a message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
            style={styles.input}
          />

          {!hasText && (
            <Pressable style={styles.iconButton} hitSlop={6}>
              <Icon name="emoji-emotions" size={22} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={sendMessage}
          disabled={!hasText}
          style={[styles.sendButton, !hasText && styles.sendButtonDisabled]}
        >
          <Icon name="send" size={19} color="#FFFFFF" />
        </Pressable>
      </KeyboardStickyView>

      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageModal}>
          <Pressable
            style={styles.imageModalClose}
            onPress={() => setSelectedImage(null)}
            accessibilityLabel="Close image preview"
          >
            <Icon name="close" size={28} color="#FFFFFF" />
          </Pressable>

          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.fullscreenImage} resizeMode="contain" />
          )}

          <Pressable
            style={styles.imageDownloadButton}
            onPress={downloadSelectedImage}
            disabled={downloadingImage}
            accessibilityLabel="Download image"
          >
            {downloadingImage ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Icon name="file-download" size={24} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </Modal>
    </View>
  );
};

/**
 * ----------------------------------------------------------------
 * Styles
 * ----------------------------------------------------------------
 */
const colors = {
  ...baseColors,
  background: '#0d0b10',
  surface: '#18151c',
  surfaceAlt: '#211d27',
  primary: '#ff2f6e',
  online: '#2ecc71',
  textSecondary: '#9b95a3',
  border: '#2a2530',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  /* HEADER */
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    marginLeft: 2,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineBadge: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  userInfo: {
    flex: 1,
    marginLeft: 10,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '700',
  },
  onlineText: {
    color: colors.online,
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 1,
  },

  /* CHAT */
  chatContent: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 6,
  },
  messageLoader: {
    alignSelf: 'center',
    marginVertical: 40,
  },
  olderLoader: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dateText: {
    marginHorizontal: 10,
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },

  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 3,
    paddingRight: 36,
  },
  messageRowSpaced: {
    marginTop: 10,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
    paddingRight: 0,
    paddingLeft: 36,
  },
  messageAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    marginRight: 7,
  },
  messageAvatarSpacer: {
    width: 33,
  },
  messageContent: {
    maxWidth: '78%',
  },

  /* TEXT BUBBLE */
  messageBubble: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
    marginBottom: 4,
  },
  otherBubble: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
  },
  otherBubbleTail: {
    borderBottomLeftRadius: 4,
  },
  myBubble: {
    backgroundColor: colors.primary,
  },
  myBubbleTail: {
    borderBottomRightRadius: 4,
  },
  messageText: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  messageBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 3,
  },
  messageTime: {
    color: colors.textSecondary,
    fontSize: 9.5,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.75)',
  },

  /* IMAGE */
  attachmentBubble: {
    overflow: 'hidden',
    borderRadius: 16,
    marginBottom: 4,
  },
  myAttachmentBubble: {
    backgroundColor: colors.primary,
  },
  otherAttachmentBubble: {
    backgroundColor: colors.surface,
  },
  chatImage: {
    width: 210,
    height: 155,
  },
  attachmentBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  imageModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 48,
    right: 18,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  fullscreenImage: {
    width: '100%',
    height: '78%',
  },
  imageDownloadButton: {
    position: 'absolute',
    bottom: 42,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },

  /* FILE */
  fileBubble: {
    minWidth: 215,
    maxWidth: 270,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 9,
    borderRadius: 16,
    marginBottom: 4,
  },
  fileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  fileIconWrapMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  fileSize: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 3,
  },
  fileDownload: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  fileDownloadMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  /* INPUT */
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    // backgroundColor: colors.surface,
    borderTopWidth: 1,
    // borderTopColor: colors.border,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  scrollToBottomButton: {
    position: 'absolute',
    right: 16,
    bottom: 82,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 24,
    paddingHorizontal: 4,
  },
  attachButton: {
    width: 40,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 100,
    paddingHorizontal: 4,
    paddingTop: 11,
    paddingBottom: 10,
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  iconButton: {
    width: 40,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#7a304b',
  },
});