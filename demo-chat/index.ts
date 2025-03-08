import dotenv from 'dotenv';
dotenv.config();
import { WebSocket, WebSocketServer } from 'ws';
import { Redis } from 'ioredis';
import { verifyToken } from './utils/jwt';
import { getChatParticipants } from './utils/queries';
import { processBatch } from './utils/batch-process';
import { Queue } from 'bullmq';
import { RateLimiter } from './utils/rate-limiter';
import { ChatValidator } from './utils/chat-validator';
import { RedisConnections } from './utils/connection-registry';


const redisConfig = {
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD!,
};



const redis = new Redis(redisConfig);

const sub = new Redis(redisConfig);

const wss = new WebSocketServer({ port: 8080 });


const messageQueue = new Queue('chat-messages', {
    connection: redisConfig
});




const connectionRegistry = new RedisConnections(redisConfig);

const rateLimiter = new RateLimiter(redis);


const chatValidator = new ChatValidator();

wss.on('connection', async (ws, req) => {

    const token = new URL(req.url!, `ws://${req.headers.host}`).searchParams.get('token');
    if (!token) {
        ws.close(4403);
        return;
    }
    const userId = verifyToken(token);
    if (!userId) {
        ws.close(4403);
        return;
    }


    const isLimited = await rateLimiter.isRateLimited(userId as string);
    if (isLimited) {
        ws.send(JSON.stringify({
            error: 'Rate limit exceeded. Please wait before sending more messages.'
        }));
        return;
    }

    await connectionRegistry.addConnection(userId as string, ws);

        ws.on('message', async (rawData) => {
            try {

                const isLimited = await rateLimiter.isRateLimited(userId as string);
                if (isLimited) {
                    ws.send(JSON.stringify({
                        error: 'Rate limit exceeded. Please wait before sending more messages.'
                    }));
                    return;
                }

                const message = JSON.parse(rawData.toString());


                const validation = await chatValidator.validateChatAccess(message.chatId, userId as string);

                if (!validation.isValid) {
                    ws.send(JSON.stringify({
                        error: validation.error
                    }));
                    return;
                }

                const chatKey = `chat:${message.chatId}`;


                await messageQueue.add('message', {
                    chatKey,
                    message: {
                        ...message,
                        senderId: userId,
                        timestamp: Date.now(),
                        chatType: validation.chatType
                    }
                });


                await redis.publish(`chat:${message.chatId}`, JSON.stringify({
                    ...message,
                    senderId: userId,
                    chatType: validation.chatType,
                    timestamp: Date.now(),
                    instanceId: connectionRegistry.instanceId
                }));

            } catch (error) {
                console.error('Error processing message:', error);
                ws.send(JSON.stringify({
                    error: 'Failed to process message'
                }));
            }
        });

    ws.on('close', () => {
        connectionRegistry.removeConnection(userId as string);
    });
});


sub.on('message', async (channel, message) => {
    const chatId = channel.replace('chat:', '');
    const participants = await getChatParticipants(chatId);
    
    for (const participant of participants) {
        try {
            await connectionRegistry.sendToUser(participant.userId!, message);
        } catch (error) {
            console.error(`Failed to send message to user ${participant.userId}:`, error);
        }
    }
});

sub.subscribe('chat:*', (err) => {
    if (err) console.error('Redis subscription error:', err);
});


setInterval(async () => {
    const jobs = await messageQueue.getJobs(['waiting']);
    if (jobs.length > 0) {
        await processBatch(jobs);
    }
}, 5000);

setInterval(async () => {
    const now = Date.now();
    const staleTimeout = 30000; 

  
    const connections = await redis.keys('connections:*');
    for (const key of connections) {
        const data = await redis.hgetall(key);
        if (now - parseInt(data.timestamp) > staleTimeout) {
            await redis.del(key);
        }
    }
}, 15000);

 
process.on('SIGTERM', async () => {
    await connectionRegistry.cleanup();
    process.exit(0);
});