import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { KeyboardChatScrollViewRef } from 'react-native-keyboard-controller';
import { chatApi } from '../api';
import { socketManager } from '../socket/socketClient';
import type { ChatMessage } from '../components/chat/ChatMessageBubble';

export type Message = ChatMessage & { avatar?: string };

const MESSAGE_PAGE_SIZE = 15;

const getMessageItems = (response: any): any[] => {
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return Array.isArray(response) ? response : [];
};

export const mapApiMessage = (item: any, currentUserId?: string): Message => {
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

type Props = {
  conversationId: string;
  recipientId: string;
  currentUserId?: string;
  recipientOnline?: boolean;
};

export const useChatMessages = ({ conversationId, recipientId, currentUserId, recipientOnline }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isRecipientOnline, setIsRecipientOnline] = useState(Boolean(recipientOnline));
  const chatScrollRef = useRef<KeyboardChatScrollViewRef>(null);
  const nextMessagePage = useRef(2);
  const scrollOffset = useRef(0);
  const contentHeight = useRef(0);
  const viewportHeight = useRef(0);
  const userStartedScrolling = useRef(false);
  const preserveScrollAfterPrepend = useRef<{ offset: number; height: number } | null>(null);
  const scrollToEndAfterLayout = useRef(true);

  const scrollToLatestMessage = () => {
    if (loadingMessages || !messages.length || preserveScrollAfterPrepend.current) return;

    const scroll = () => chatScrollRef.current?.scrollToEnd({ animated: false });
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
        if (!active) return;

        const serverMessages = getMessageItems(response).map(item => mapApiMessage(item, currentUserId));
        const totalPages = (response as any)?.meta?.totalPages;
        setHasOlderMessages(totalPages ? totalPages > 1 : serverMessages.length === MESSAGE_PAGE_SIZE);
        setMessages(serverMessages);
        requestAnimationFrame(() => requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: false })));
        socketManager.markChatRead(conversationId);
      } catch {
        if (active) Alert.alert('Unable to load messages', 'Please try again.');
      } finally {
        if (active) setLoadingMessages(false);
      }
    };

    void loadMessages();
    return () => { active = false; };
  }, [conversationId, currentUserId]);

  useEffect(() => {
    socketManager.connect();
    socketManager.joinChat(conversationId);

    const cleanup = socketManager.onChatMessage((payload: any) => {
      if (payload?.conversationId !== conversationId || String(payload?.senderId) === String(currentUserId)) return;
      const incomingMessage = mapApiMessage(payload, currentUserId);
      scrollToEndAfterLayout.current = true;
      setMessages(previous => previous.some(item => item.id === incomingMessage.id) ? previous : [...previous, incomingMessage]);
    });
    const cleanupRead = socketManager.onChatRead(data => {
      if (data.conversationId !== conversationId) return;
      setMessages(previous => previous.map(item => data.messageIds.includes(item.id) ? { ...item, isRead: true } : item));
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
      const response = await chatApi.getMessages(conversationId, nextMessagePage.current, MESSAGE_PAGE_SIZE);
      const olderMessages = getMessageItems(response).map(item => mapApiMessage(item, currentUserId));
      const totalPages = (response as any)?.meta?.totalPages;
      if (!olderMessages.length) {
        setHasOlderMessages(false);
        return;
      }

      preserveScrollAfterPrepend.current = { offset: previousOffset, height: previousHeight };
      nextMessagePage.current += 1;
      setHasOlderMessages(totalPages ? nextMessagePage.current - 1 < totalPages : olderMessages.length === MESSAGE_PAGE_SIZE);
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
      requestAnimationFrame(() => chatScrollRef.current?.scrollTo({ y: previousScroll.offset + (height - previousScroll.height), animated: false }));
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

  return {
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
  };
};
