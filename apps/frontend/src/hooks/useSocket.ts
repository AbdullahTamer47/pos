import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const maxReconnectAttempts = 10;
  const baseDelay = 1000;

  const { accessToken, user } = useAuthStore();

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: baseDelay,
      reconnectionDelayMax: 30000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;

      if (user?.tenantId) {
        socket.emit('join:tenant', { tenantId: user.tenantId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (_error) => {
      setIsConnected(false);
      reconnectAttemptRef.current += 1;

      if (reconnectAttemptRef.current >= maxReconnectAttempts) {
        socket.disconnect();
      }
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      const delay = Math.min(baseDelay * Math.pow(2, attempt), 30000);
      socket.io.opts.reconnectionDelay = delay;
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [accessToken, user?.tenantId]);

  const joinRoom = useCallback((room: string) => {
    socketRef.current?.emit('join:room', { room });
  }, []);

  const leaveRoom = useCallback((room: string) => {
    socketRef.current?.emit('leave:room', { room });
  }, []);

  const emit = useCallback((event: string, data: unknown) => {
    socketRef.current?.emit(event, data);
  }, []);

  const on = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  const off = useCallback((event: string, handler?: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    socketRef.current = null;
    setIsConnected(false);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinRoom,
    leaveRoom,
    emit,
    on,
    off,
    disconnect,
  };
}