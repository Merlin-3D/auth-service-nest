import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';

export type TokenType = 'access' | 'refresh';

@Injectable()
export class TokenBlacklistService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  private makeKey(jti: string, type: TokenType): string {
    return `bl:${type}:${jti}`;
  }

  async blacklist(
    jti: string,
    type: TokenType,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.makeKey(jti, type);
    // ttl en millisecondes pour cache-manager v5 / Keyv
    await this.cacheManager.set(key, true, { ttl: ttlSeconds * 1000 });
  }

  async isBlacklisted(jti: string, type: TokenType): Promise<boolean> {
    const key = this.makeKey(jti, type);
    const value = await this.cacheManager.get(key);
    return Boolean(value);
  }
}


