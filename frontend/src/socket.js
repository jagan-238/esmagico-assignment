import { io } from 'socket.io-client';
import { store } from './store/store.js';

const url = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || undefined;

export function connectSocket() {
  const token = store.getState().auth.token;
  if (!token) return null;
  const socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
  return socket;
}
