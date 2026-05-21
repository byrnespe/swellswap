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
      socketInstance = io('http://localhost:3001', {
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
