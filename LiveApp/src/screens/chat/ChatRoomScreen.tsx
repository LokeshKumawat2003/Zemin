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
import { chatApi, reportApi, uploadApi, userApi } from '../../api';
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
const REPORT_REASONS = ['spam', 'fraud', 'harassment', 'inappropriate', 'other'] as const;

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
export const ChatRoomScreen = ({ navigation, route }: Props) => {
  const { conversationId, recipientId, recipientName, recipientAvatar, recipientOnline } = route.params;
  const currentUserId = useAppSelector(state => state.auth.user?.id);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(Boolean(recipientOnline));
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [downloadingImage, setDownloadingImage] = useState(false);
  const [showChatActions, setShowChatActions] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const chatScrollRef = useRef<KeyboardChatScrollViewRef>(null);
  const nextMessagePage = useRef(2);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const userStartedScrolling = useRef(false);
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
    let active = true;
    setLoadingMessages(true);
    setMessages([]);
    setHasOlderMessages(true);
    nextMessagePage.current = 2;
    scrollToEndAfterLayout.current = true;

    const loadMessages = async () => {
      try {
        const response = await chatApi.getMessages(conversationId, 1, MESSAGE_PAGE_SIZE);
        if (active) {
          const serverMessages = getMessageItems(response).map(item => mapApiMessage(item, currentUserId));
          const totalPages = (response as any)?.meta?.totalPages;
          const hasMore = totalPages ? totalPages > 1 : serverMessages.length === MESSAGE_PAGE_SIZE;
          setHasOlderMessages(hasMore);
          scrollToEndAfterLayout.current = true;
          setMessages(serverMessages);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              chatScrollRef.current?.scrollToEnd({ animated: false });
            });
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
        return;
      }

      preserveScrollAfterPrepend.current = {
        offset: previousOffset,
        height: previousHeight,
      };
      nextMessagePage.current += 1;
      const hasMore = totalPages
        ? nextMessagePage.current - 1 < totalPages
        : olderMessages.length === MESSAGE_PAGE_SIZE;
      setHasOlderMessages(hasMore);
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
    if (userStartedScrolling.current && y <= 80) void loadOlderMessages();
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

  const reportUser = async () => {
    if (reporting) return;

    try {
      setReporting(true);
      await reportApi.create({
        targetType: 'user',
        targetId: recipientId,
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setShowReportModal(false);
      setReportDescription('');
      Alert.alert('Reported', 'Thank you. Our team will review this report.');
    } catch {
      Alert.alert('Report failed', 'Unable to submit this report.');
    } finally {
      setReporting(false);
    }
  };

  const blockUser = async () => {
    try {
      await userApi.blockUser(recipientId);
      Alert.alert('User blocked', `${recipientName} has been blocked.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Block failed', 'Unable to block this user.');
    }
  };

  const openChatActions = () => {
    setShowChatActions(previous => !previous);
  };

  const openReportModal = () => {
    setShowChatActions(false);
    setShowReportModal(true);
  };

  const confirmBlockUser = () => {
    setShowChatActions(false);
    Alert.alert('Block user?', `You will stop receiving messages from ${recipientName}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: blockUser },
    ]);
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
        <Pressable style={styles.headerIconButton} onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="arrow-back" size={18} color={colors.textPrimary} />
        </Pressable>

        <View style={styles.headerProfile}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: recipientAvatar || AVATAR_URI }} style={styles.headerAvatar} />
            {isRecipientOnline && <View style={styles.onlineBadge} />}
          </View>
          <View style={styles.userInfo}>
            <Text numberOfLines={1} style={styles.userName}>
              {recipientName?.trim() || 'Chat'}
            </Text>
            <Text numberOfLines={1} style={styles.onlineText}>
              {isRecipientOnline ? 'Active now' : 'Last seen recently'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable style={styles.actionIconButton} hitSlop={8}>
            <Icon name="call" size={16} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.actionIconButton} onPress={openChatActions} hitSlop={8}>
            <Icon name="more-vert" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {showChatActions && (
        <>
          <Pressable
            style={styles.actionMenuBackdrop}
            onPress={() => setShowChatActions(false)}
            accessibilityLabel="Close chat actions"
          />
          <View style={styles.chatActionMenu}>
            <Pressable style={styles.chatActionItem} onPress={openReportModal}>
              <Icon name="flag" size={18} color={colors.textPrimary} />
              <Text style={styles.chatActionText}>Report</Text>
            </Pressable>
            <Pressable style={styles.chatActionItem} onPress={confirmBlockUser}>
              <Icon name="block" size={18} color={colors.error} />
              <Text style={[styles.chatActionText, styles.dangerText]}>Block</Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ---------------- CHAT ---------------- */}
      <KeyboardChatScrollView
        ref={chatScrollRef}
        contentContainerStyle={styles.chatContent}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          userStartedScrolling.current = true;
        }}
        onScrollEndDrag={handleScroll}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        onLayout={event => {
          viewportHeight.current = event.nativeEvent.layout.height;
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

      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <View style={styles.reportModalBackdrop}>
          <View style={styles.reportModalCard}>
            <View style={styles.reportModalHeader}>
              <View>
                <Text style={styles.reportModalTitle}>Report user</Text>
                <Text style={styles.reportModalSubtitle}>What happened with {recipientName}?</Text>
              </View>
              <Pressable onPress={() => setShowReportModal(false)} hitSlop={8}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={styles.reportLabel}>Reason</Text>
            <View style={styles.reportReasons}>
              {REPORT_REASONS.map(reason => (
                <Pressable
                  key={reason}
                  style={[styles.reportReason, reportReason === reason && styles.reportReasonSelected]}
                  onPress={() => setReportReason(reason)}
                >
                  <Text
                    style={[
                      styles.reportReasonText,
                      reportReason === reason && styles.reportReasonTextSelected,
                    ]}
                  >
                    {reason.charAt(0).toUpperCase() + reason.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.reportLabel}>Description</Text>
            <TextInput
              value={reportDescription}
              onChangeText={setReportDescription}
              placeholder="Tell us more (optional)"
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              style={styles.reportDescription}
            />

            <View style={styles.reportModalActions}>
              <Pressable
                style={styles.reportCancelButton}
                onPress={() => setShowReportModal(false)}
                disabled={reporting}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.reportSubmitButton, reporting && styles.reportSubmitDisabled]}
                onPress={reportUser}
                disabled={reporting}
              >
                {reporting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.reportSubmitText}>Submit</Text>}
              </Pressable>
            </View>
          </View>
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
    paddingHorizontal: 6,
    backgroundColor: colors.background,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  headerProfile: {
    flex: 1,
    minWidth: 0,
    height: 48,
    marginLeft: 6,
    marginRight: 4,
    paddingHorizontal: 6,
    borderRadius: 24,
    backgroundColor: colors.surfaceAlt,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceAlt,
  },
  actionIconButton: {
    width: 40,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMenuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  chatActionMenu: {
    position: 'absolute',
    top: 58,
    right: 8,
    zIndex: 3,
    width: 148,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  chatActionItem: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 10,
  },
  chatActionText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerText: {
    color: colors.error,
  },
  avatarWrap: {
    marginLeft: 0,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginLeft: 8,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 17,
  },
  onlineText: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 13,
    marginTop: 0,
  },

  /* REPORT */
  reportModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  reportModalCard: {
    width: '100%',
    maxWidth: 390,
    padding: 20,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  reportModalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  reportModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
  reportLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 9,
  },
  reportReasons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  reportReason: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 9,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reportReasonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reportReasonText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  reportReasonTextSelected: {
    color: '#FFFFFF',
  },
  reportDescription: {
    minHeight: 90,
    maxHeight: 140,
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 11,
    marginBottom: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  reportModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  reportCancelButton: {
    minWidth: 82,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
  },
  reportCancelText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  reportSubmitButton: {
    minWidth: 92,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  reportSubmitDisabled: {
    opacity: 0.65,
  },
  reportSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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