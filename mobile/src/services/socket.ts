import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import { tokenStorage } from './storage';

let socket: Socket | null = null;
let currentToken: string | null = null;
let reconnecting = false;

export interface MessagePayload {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  readBy: string[];
  isMine: boolean;
  createdAt: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

export interface ReadPayload {
  conversationId: string;
  userId: string;
  userName: string;
}

export async function connectSocket(): Promise<Socket> {
  const session = await tokenStorage.getItem('user_session');
  let token: string | null = null;
  if (session) {
    try {
      token = JSON.parse(session).token ?? null;
    } catch {
      token = null;
    }
  }

  if (!token) throw new Error('Not authenticated');

  // If token changed (user switched accounts), force reconnect
  if (socket && currentToken !== token) {
    console.log('[Socket] Token changed, reconnecting...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  if (socket?.connected) return socket;

  currentToken = token;

  socket = io(API_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    reconnecting = false;
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
    if (reason === 'io server disconnect') {
      // Server forced disconnect — reconnect manually
      socket?.connect();
    }
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
    reconnecting = false;
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log('[Socket] Reconnect attempt:', attempt);
    reconnecting = true;
  });

  socket.on('reconnect_error', (err) => {
    console.error('[Socket] Reconnect error:', err.message);
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Socket connection timeout'));
    }, 15000);

    // If already connected (race condition), resolve immediately
    if (socket!.connected) {
      clearTimeout(timeout);
      resolve(socket!);
      return;
    }

    socket!.once('connect', () => {
      clearTimeout(timeout);
      resolve(socket!);
    });

    socket!.once('connect_error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}

export function onMessage(callback: (msg: MessagePayload) => void): () => void {
  if (!socket) return () => {};
  socket.on('receive_message', callback);
  return () => { socket?.off('receive_message', callback); };
}

export function onTyping(callback: (data: TypingPayload) => void): () => void {
  if (!socket) return () => {};
  socket.on('typing', callback);
  return () => { socket?.off('typing', callback); };
}

export function onStopTyping(callback: (data: { conversationId: string; userId: string }) => void): () => void {
  if (!socket) return () => {};
  socket.on('stop_typing', callback);
  return () => { socket?.off('stop_typing', callback); };
}

export function onMessagesRead(callback: (data: ReadPayload) => void): () => void {
  if (!socket) return () => {};
  socket.on('messages_read', callback);
  return () => { socket?.off('messages_read', callback); };
}

export function sendMessage(conversationId: string, content: string): void {
  socket?.emit('send_message', { conversationId, content });
}

export function emitTyping(conversationId: string): void {
  socket?.emit('typing', { conversationId });
}

export function emitStopTyping(conversationId: string): void {
  socket?.emit('stop_typing', { conversationId });
}

export function emitMarkRead(conversationId: string): void {
  socket?.emit('mark_read', { conversationId });
}

export function joinConversation(conversationId: string): void {
  socket?.emit('join_conversation', { conversationId });
}
