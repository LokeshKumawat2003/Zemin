import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../constants/api.constants';
import { StorageService } from '../services/storage.service';

class SocketManager {
  private socket: Socket | null = null;

  connect() {
    const token = StorageService.getAccessToken();
    if (!token || this.socket?.connected) return this.socket;

    this.socket = io(API_CONFIG.SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
    });

    return this.socket;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }

  joinChat(conversationId: string) {
    this.socket?.emit('chat:join', { conversationId });
  }

  leaveChat(conversationId: string) {
    this.socket?.emit('chat:leave', { conversationId });
  }

  markChatRead(conversationId: string) {
    this.socket?.emit('chat:read', { conversationId });
  }

  onChatMessage(handler: (msg: unknown) => void) {
    this.socket?.on('chat:message', handler);
    return () => this.socket?.off('chat:message', handler);
  }

  onChatRead(
    handler: (data: { conversationId: string; messageIds: string[] }) => void,
  ) {
    this.socket?.on('chat:read', handler);
    return () => this.socket?.off('chat:read', handler);
  }

  onPresence(handler: (data: { userId: string; online: boolean }) => void) {
    this.socket?.on('presence:update', handler);
    return () => this.socket?.off('presence:update', handler);
  }

  joinLive(roomId: string) {
    this.socket?.emit('live:join', { roomId });
  }

  leaveLive(roomId: string) {
    this.socket?.emit('live:leave', { roomId });
  }

  sendLiveChat(roomId: string, text: string) {
    this.socket?.emit('live:chat', { roomId, text });
  }

  onLiveChatMessage(
    handler: (msg: { userId: string; text: string; sentAt: string }) => void,
  ) {
    this.socket?.on('live:chat_message', handler);
    return () => this.socket?.off('live:chat_message', handler);
  }

  onLiveViewerCount(
    handler: (data: { roomId: string; count: number }) => void,
  ) {
    this.socket?.on('live:viewer_count', handler);
    return () => this.socket?.off('live:viewer_count', handler);
  }

  onLiveGift(
    handler: (gift: {
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
    }) => void,
  ) {
    this.socket?.on('live:gift', handler);
    return () => this.socket?.off('live:gift', handler);
  }

  getSocket() {
    return this.socket;
  }
}

export const socketManager = new SocketManager();
