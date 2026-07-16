import {
  io,
  Socket,
} from 'socket.io-client';

let socket: Socket | null = null;

export function getLeaderboardSocket() {
  if (socket) {
    return socket;
  }

  socket = io(
    `${process.env.NEXT_PUBLIC_SOCKET_URL}/leaderboard`,
    {
      transports: ['websocket'],
      withCredentials: true,
    },
  );

  return socket;
}

export function disconnectLeaderboardSocket() {
  socket?.disconnect();
  socket = null;
}
