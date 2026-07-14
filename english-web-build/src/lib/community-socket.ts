import { io } from 'socket.io-client';

export const communitySocket = io(`${process.env.NEXT_PUBLIC_API_URL}/community`, {
  autoConnect: false,
  withCredentials: true,
  transports: ['websocket'],
});
