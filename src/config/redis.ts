import EventEmitter from 'events';
import { Redis } from 'ioredis';
import { config } from './index.js';

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, callback: (message: string) => void): Promise<void>;
}

class InMemoryCache implements CacheClient {
  private store = new Map<string, { value: string; expiresAt?: number }>();
  private bus = new EventEmitter();

  constructor() {
    console.log('[Cache] Initialized In-Memory Cache with EventEmitter Pub/Sub');
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    this.bus.emit(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    this.bus.on(channel, callback);
  }
}

class RedisCache implements CacheClient {
  private client: Redis;
  private subscriber: Redis;

  constructor(url: string) {
    this.client = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });
    this.subscriber = new Redis(url, { maxRetriesPerRequest: 1, enableOfflineQueue: false });

    this.client.on('error', (err: any) => console.warn('[Redis] Connection warning:', err.message));
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async publish(channel: string, message: string): Promise<void> {
    await this.client.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    await this.subscriber.subscribe(channel);
    this.subscriber.on('message', (chan: string, msg: string) => {
      if (chan === channel) callback(msg);
    });
  }
}

export const cache: CacheClient = config.redis.url
  ? new RedisCache(config.redis.url)
  : new InMemoryCache();
