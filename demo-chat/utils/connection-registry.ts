import { WebSocket } from 'ws';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';

export class RedisConnections {
    private redis: Redis;
    private pub: Redis;  
    private sub: Redis; 
    public readonly instanceId: string;
    private connections = new Map<string, WebSocket>();

    constructor(config: any) {
        this.redis = new Redis(config);
        this.pub = new Redis(config);
        this.sub = new Redis(config);
        this.instanceId = `instance:${randomUUID()}`;

        this.sub.subscribe(this.instanceId, (err) => {
            if (err) console.error('Redis subscription error:', err);
        });

        this.sub.on('message', (channel, message) => {
            try {
                const { userId, payload } = JSON.parse(message);
                const connection = this.connections.get(userId);
                connection?.send(JSON.stringify(payload));
            } catch (error) {
                console.error('Error handling cross-instance message:', error);
            }
        });
    }

    async addConnection(userId: string, ws: WebSocket): Promise<void> {
        this.connections.set(userId, ws);
        await this.redis.hset(`connections:${userId}`, {
            instanceId: this.instanceId,
            timestamp: Date.now()
        });
    }

    async removeConnection(userId: string): Promise<void> {
        this.connections.delete(userId);
        await this.redis.del(`connections:${userId}`);
    }

    async sendToUser(userId: string, payload: any): Promise<boolean> {
      
        const localConnection = this.connections.get(userId);
        if (localConnection) {
            localConnection.send(JSON.stringify(payload));
            return true;
        }

        const connectionData = await this.redis.hgetall(`connections:${userId}`);
        if (connectionData.instanceId && connectionData.instanceId !== this.instanceId) {
            // Forward message to correct instance
            await this.pub.publish(connectionData.instanceId, JSON.stringify({
                userId,
                payload
            }));
            return true;
        }

        return false; 
    }

    async cleanup(): Promise<void> {
        await this.sub.unsubscribe();
        await this.sub.quit();
        await this.pub.quit();
        await this.redis.quit();
    }
}