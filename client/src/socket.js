import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4001';

console.log('🔌 Socket.IO Configuration:');
console.log('  VITE_SOCKET_URL env var:', import.meta.env.VITE_SOCKET_URL);
console.log('  Connecting to:', SOCKET_URL);
console.log('  All env vars:', import.meta.env);

export const socket = io(SOCKET_URL, {
  autoConnect: true
});

