import { useCallback, useEffect, useState } from 'react';
import { chatApi } from '../api';
import { socketManager } from '../socket/socketClient';
import type { OnlineFriend } from '../components/chat/OnlineFriendsRow';
import type { ConversationItem } from '../components/chat/ConversationRow';

const formatTimestamp = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

type Props = { userId?: string };

export const useChatList = ({ userId }: Props) => {
  const [onlineFriends, setOnlineFriends] = useState<OnlineFriend[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const updateConversationUnread = useCallback((conversationId: string, delta: number, replaceValue?: number) => {
    setConversations(previous => previous.map(conversation =>
      conversation.conversationId === conversationId
        ? { ...conversation, unreadCount: replaceValue !== undefined ? Math.max(0, replaceValue) : Math.max(0, conversation.unreadCount + delta) }
        : conversation
    ));
  }, []);

  const upsertConversationMessage = useCallback((message: any) => {
    setConversations(previous => {
      const timestampLabel = formatTimestamp(message.sentAt);
      const index = previous.findIndex(item => item.conversationId === message.conversationId || item.participantId === String(message.senderId));
      const existing = index >= 0 ? previous[index] : undefined;
      const updated: ConversationItem = {
        conversationId: message.conversationId,
        participantId: String(message.senderId || existing?.participantId || ''),
        username: message.sender?.username ?? existing?.username ?? 'unknown',
        displayName: message.sender?.displayName ?? existing?.displayName ?? message.sender?.username ?? 'Unknown',
        verified: existing?.verified ?? !!message.sender?.verified,
        avatar: message.sender?.avatarUrl ?? message.sender?.avatar ?? existing?.avatar,
        isOnline: existing?.isOnline ?? false,
        lastMessageText: message.text ?? existing?.lastMessageText ?? 'New message',
        lastMessageIsMedia: message.type !== 'text',
        timestampLabel,
        unreadCount: Math.max(0, (existing?.unreadCount ?? 0) + 1),
        pinned: existing?.pinned ?? false,
      };
      if (index === -1) return [updated, ...previous];
      const next = [...previous];
      next[index] = updated;
      if (index !== 0) {
        next.splice(index, 1);
        next.unshift(updated);
      }
      return next;
    });
  }, []);

  const loadConversations = useCallback(async () => {
    if (!refreshing) setLoading(true);
    try {
      const response = await chatApi.getConversations();
      const unique = new Map<string, ConversationItem>();
      (response.data || []).forEach((conversation: any) => {
        const participantId = String(conversation.participant?.id || conversation.participant?._id || '');
        if (!participantId || unique.has(participantId)) return;
        unique.set(participantId, {
          conversationId: String(conversation.conversationId),
          participantId,
          username: conversation.participant?.username ?? 'unknown',
          displayName: conversation.participant?.displayName ?? conversation.participant?.username ?? 'Unknown',
          verified: !!(conversation.participant?.isVerified ?? conversation.participant?.verified),
          avatar: conversation.participant?.avatar ?? conversation.participant?.avatarUrl,
          isOnline: !!conversation.participant?.isOnline,
          lastMessageText: conversation.lastMessage?.text ?? 'No messages yet',
          lastMessageIsMedia: conversation.lastMessage?.type !== undefined && conversation.lastMessage?.type !== 'text',
          timestampLabel: formatTimestamp(conversation.lastMessage?.sentAt),
          unreadCount: conversation.unreadCount ?? 0,
          pinned: !!conversation.pinned,
        });
      });
      setConversations(Array.from(unique.values()));
      setOnlineFriends([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => { void loadConversations(); }, [loadConversations]);

  useEffect(() => {
    socketManager.connect();
    const cleanup = socketManager.onChatMessage((message: any) => {
      if (!message?.conversationId || message?.senderId === userId || message?.userId === userId || message?.isMine) return;
      upsertConversationMessage(message);
    });
    return () => {
      cleanup?.();
    };
  }, [upsertConversationMessage, userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadConversations();
  }, [loadConversations]);

  const visibleConversations = conversations.filter(conversation => {
    const query = search.trim().toLowerCase();
    return (!query || `${conversation.displayName} ${conversation.username}`.toLowerCase().includes(query)) &&
      (filter === 'all' || conversation.unreadCount > 0);
  });

  return {
    onlineFriends,
    conversations,
    visibleConversations,
    loading,
    refreshing,
    search,
    filter,
    setSearch,
    setFilter,
    setRefreshing,
    onRefresh,
    updateConversationUnread,
  };
};
