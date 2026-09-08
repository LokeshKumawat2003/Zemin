import { useEffect } from 'react';
import { socketManager } from '../socket/socketClient';
import { StorageService } from '../services/storage.service';

export const useSocket = () => {
  useEffect(() => {
    if (StorageService.getAccessToken()) {
      socketManager.connect();
    }
    return () => socketManager.disconnect();
  }, []);
};

export type LiveGiftPayload = {
  roomId: string;
  senderId: string;
  senderName: string;
  giftId: string;
  giftName: string;
  giftEmoji?: string;
  coinCost: number;
  quantity?: number;
  totalCoins: number;
  sentAt: string;
  isFake?: boolean;
};

export const useLiveSocket = (
  roomId: string,
  onChatMessage: (msg: { userId: string; userName?: string; text: string; sentAt: string; isFake?: boolean }) => void,
  onViewerCount?: (count: number) => void,
  onGift?: (gift: LiveGiftPayload) => void,
  enabled = true,
) => {
  useEffect(() => {
    if (!enabled) return undefined;
    socketManager.connect();
    socketManager.joinLive(roomId);

    const cleanupChat = socketManager.onLiveChatMessage((msg) => {
      if (msg) onChatMessage(msg);
    });

    const cleanupCount = onViewerCount
      ? socketManager.onLiveViewerCount((data) => {
          if (data?.roomId === roomId) onViewerCount(data.count);
        })
      : undefined;

    const cleanupGift = onGift
      ? socketManager.onLiveGift((gift) => {
          if (gift?.roomId === roomId) onGift(gift);
        })
      : undefined;

    return () => {
      cleanupChat?.();
      cleanupCount?.();
      cleanupGift?.();
      socketManager.leaveLive(roomId);
    };
  }, [roomId, onChatMessage, onViewerCount, onGift, enabled]);
};

export const useChatSocket = (
  conversationId: string,
  onMessage: (msg: any) => void
) => {
  useEffect(() => {
    socketManager.connect();
    socketManager.joinChat(conversationId);
    const cleanup = socketManager.onChatMessage((msg: any) => {
      if (msg?.conversationId === conversationId) {
        onMessage(msg);
      }
    });
    return () => {
      cleanup?.();
      socketManager.leaveChat(conversationId);
    };
  }, [conversationId, onMessage]);
};
