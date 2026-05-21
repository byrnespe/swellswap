import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

let socketInstance = null;

export function useSocket() {
  const { token } = useAuth();
  const ref = useRef(null);

  useEffect(() => {
    if (!token) {
      if (socketInstance) { socketInstance.disconnect(); socketInstance = null; }
      return;
    }
    if (!socketInstance || !socketInstance.connected) {
      // In dev, Vite proxies; in prod, same origin
      const socketUrl = import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin;
      socketInstance = io(socketUrl, {
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
      });
    }
    ref.current = socketInstance;
    return () => {};
  }, [token]);

  return ref.current || socketInstance;
}

export function getSocket() {
  return socketInstance;
}
