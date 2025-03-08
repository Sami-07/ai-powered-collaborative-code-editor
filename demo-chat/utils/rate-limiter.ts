import { Redis } from 'ioredis';

export class RateLimiter {
    constructor(private redis: Redis) {}

    async isRateLimited(userId: string): Promise<boolean> {
        const key = `rate:${userId}`;
        const limit = 100; 
        const window = 60;
        
        const current = await this.redis.incr(key);
        if (current === 1) {
            await this.redis.expire(key, window);
        }
        
        return current > limit;
    }
} 