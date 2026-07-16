import {
  io,
  Socket,
} from 'socket.io-client';

let socket: Socket | null = null;

export function connectLeaderboardSocket(
  userId: string,
) {
  if (socket?.connected) {
    return socket;
  }

  socket = io(
    `${process.env.NEXT_PUBLIC_SOCKET_URL}/leaderboard`,
    {
      transports: ['websocket'],
      withCredentials: true,
      auth: {
        userId,
      },
    },
  );

  return socket;
}

export function disconnectLeaderboardSocket() {
  socket?.disconnect();
  socket = null;
}
