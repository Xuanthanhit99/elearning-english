import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

/*
 * Shared Socket.IO Redis adapter for the whole app (not Arena-specific) —
 * Socket.IO's adapter operates at the underlying Engine.IO server level,
 * shared by every namespace/gateway (Arena, notifications, leaderboard,
 * community), so a single adapter instance here makes all of them
 * cross-instance-capable, not just Arena.
 */
export class RedisIoAdapter extends IoAdapter {
  private pubClient?: Redis;
  private subClient?: Redis;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  connectToRedis(): void {
    this.pubClient = new Redis({
      host: process.env.REDIS_HOST ?? '127.0.0.1',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });
    this.subClient = this.pubClient.duplicate();
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.pubClient && this.subClient) {
      server.adapter(createAdapter(this.pubClient, this.subClient));
    }
    return server;
  }

  // Deliberately NOT named `close()` — `IoAdapter` already declares
  // `close(server)` as the per-gateway-server teardown hook that Nest's
  // `SocketModule` calls automatically on `app.close()`. Overriding it with
  // a no-arg "quit the redis clients" version shadowed that lifecycle
  // method, so it ran once per registered gateway and threw "Connection is
  // closed" on the second call. This is called explicitly instead.
  async closeRedisClients() {
    await Promise.all([this.pubClient?.quit(), this.subClient?.quit()]);
  }
}
