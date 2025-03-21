import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
const { setupWSConnection } = require('y-websocket/bin/utils');
import * as dotenv from 'dotenv';
import { prisma } from '@repo/db';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT, 10) : 1235;
const HOST = process.env.WEBSOCKET_HOST || 'localhost';
const USE_SSL = process.env.USE_SSL === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '';

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

const clerk = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;

// =========== Redis Configuration ===========
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASSWORD,
}

// Create Redis clients for publishing and subscribing
export const pub = new Redis(redisConfig);
export const sub = new Redis(redisConfig);

// Create a dedicated Redis client for queue operations
export const queueClient = new Redis(redisConfig);

// =========== End Redis Configuration ===========

// Define message types for the chat system
enum MessageType {
  JOIN = 'join',
  LEAVE = 'leave',
  MESSAGE = 'message',
  USER_LIST = 'user_list',
  PRIVATE_MESSAGE = 'private_message',
  ERROR = 'error', // Add error type for authentication failures
}

// Define the structure for chat messages
interface ChatMessage {
  type: MessageType;
  roomId?: string;
  senderId: string;
  senderName: string;
  content?: string;
  timestamp: number;
  recipientId?: string; // For private messages
  instanceId?: string; // For tracking which instance sent this message
}

// Define a type for chat user connection
interface ChatUser {
  userId: string;
  username: string;
  currentRoom: string;
  socket: WebSocket;
  joinedAt: number;
}

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send('WebSocket server for Code Collab');
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Create either HTTP or HTTPS server based on configuration
let server: http.Server | https.Server;

if (USE_SSL && SSL_KEY_PATH && SSL_CERT_PATH) {
  try {
    const sslOptions = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    };
    server = https.createServer(sslOptions, app);
    console.log('Using HTTPS server with SSL');
  } catch (error) {
    console.error('Error loading SSL certificates:', error);
    console.log('Falling back to HTTP server');
    server = http.createServer(app);
  }
} else {
  server = http.createServer(app);
  console.log('Using HTTP server');
}

const wss = new WebSocketServer({ server });

const REDIS_CHANNEL_PREFIX = 'chat:room:';
const REDIS_ROOMS_KEY = 'chat:rooms';

// Create a unique instance ID for this server
const instanceId = `instance:${uuidv4()}`;

// Store chat users by userId for quick lookup
const chatUsers = new Map<string, ChatUser>();
// Store rooms and their members - this will be synced with Redis
const chatRooms = new Map<string, Set<string>>();
// Store connection registry to track which instance holds each user's connection
const connectionRegistry = new Map<string, string>();

// Track subscribed channels to prevent duplicate subscriptions
const subscribedChannels = new Set<string>();

// Rate limiting configuration
const MESSAGE_RATE_LIMIT = {
  WINDOW_MS: 1000,  // 1 second window
  MAX_MESSAGES: 5,  // Maximum messages per window
  COOLDOWN_MS: 5000 // Cooldown period after hitting limit
};

// Store last message timestamps and counts for rate limiting
const messageRateLimit = new Map<string, { 
  windowStart: number,
  messageCount: number,
  cooldownUntil: number 
}>();

// Check if a user has exceeded their rate limit
function checkRateLimit(userId: string): { limited: boolean, reason?: string } {
  const now = Date.now();
  const userLimit = messageRateLimit.get(userId);

  // If no previous messages or window expired, start new window
  if (!userLimit || now - userLimit.windowStart >= MESSAGE_RATE_LIMIT.WINDOW_MS) {
    messageRateLimit.set(userId, {
      windowStart: now,
      messageCount: 1,
      cooldownUntil: 0
    });
    return { limited: false };
  }

  // Check if user is in cooldown
  if (userLimit.cooldownUntil > now) {
    return { 
      limited: true, 
      reason: `Please wait ${Math.ceil((userLimit.cooldownUntil - now) / 1000)} seconds before sending more messages.`
    };
  }

  // Check if user has exceeded rate limit
  if (userLimit.messageCount >= MESSAGE_RATE_LIMIT.MAX_MESSAGES) {
    userLimit.cooldownUntil = now + MESSAGE_RATE_LIMIT.COOLDOWN_MS;
    return { 
      limited: true, 
      reason: `You've sent too many messages. Please wait ${MESSAGE_RATE_LIMIT.COOLDOWN_MS / 1000} seconds.`
    };
  }

  // Increment message count in current window
  userLimit.messageCount++;
  return { limited: false };
}

async function subscribeToRoomChannel(roomId: string) {
  const channel = `${REDIS_CHANNEL_PREFIX}${roomId}`;
  
  // Only subscribe if not already subscribed to this channel
  if (subscribedChannels.has(channel)) {
    console.log(`Already subscribed to channel: ${channel}`);
    return;
  }
  
  // Add to tracked channels
  subscribedChannels.add(channel);
  
  // Subscribe to Redis channel directly
  await sub.subscribe(channel);
  
  console.log(`Subscribed to channel: ${channel}`);
}

// Initialize the server
async function initialize() {
  console.log(`Starting WebSocket server instance: ${instanceId}`);
  
  // Subscribe to instance-specific channel for private messages
  await sub.subscribe(instanceId);
  
  // Ensure general room exists
  await ensureGeneralRoom();
  
  // Start message processor
  await startChatMessageProcessor();
  
  // Set up process termination handler for cleanup
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Create a default general room if it doesn't exist
async function ensureGeneralRoom(): Promise<void> {
  try {
    const exists = await pub.sismember(REDIS_ROOMS_KEY, 'general');
    if (!exists) {
      await pub.sadd(REDIS_ROOMS_KEY, 'general');
      console.log('Created default general room');
    }
  } catch (error) {
    console.error('Error ensuring general room exists:', error);
  }
}

// Global message handler for all Redis channels
sub.on('message', (receivedChannel, messageStr) => {
  // Handle instance-specific messages (private messages)
  if (receivedChannel === instanceId) {
    try {
      const { userId, payload } = JSON.parse(messageStr);
      const user = chatUsers.get(userId);
      if (user && user.socket.readyState === WebSocket.OPEN) {
        user.socket.send(JSON.stringify(payload));
      }
    } catch (error) {
      console.error('Error handling cross-instance message:', error);
    }
    return;
  }

  // Handle room messages
  if (receivedChannel.startsWith(REDIS_CHANNEL_PREFIX)) {
    try {
      const message = JSON.parse(messageStr) as ChatMessage;
      const roomId = receivedChannel.substring(REDIS_CHANNEL_PREFIX.length);
      
      // Broadcast to all users in this room on this instance
      const room = chatRooms.get(roomId);
      if (!room) return;
      
      room.forEach(userId => {
        // Skip sending the message back to the original sender
        if (userId === message.senderId) return;
        
        const user = chatUsers.get(userId);
        if (user && user.socket.readyState === WebSocket.OPEN) {
          console.log("sending message to user", userId);
          user.socket.send(JSON.stringify(message));
        }
      });
    } catch (error) {
      console.error('Error handling Redis message:', error);
    }
  }
});

// Handle WebSocket connections
wss.on('connection', async (socket: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const path = url.pathname;
  // Remove the unnecessary users query that's causing connection pool issues
  // const users = await prisma.user.findMany();
  // console.log("database users", users);
  
  // Handle Y.js collaborative editing connections
  if (path.startsWith('/yjs')) {
    setupWSConnection(socket, req, { gc: true });
    console.log('Client connected to collaborative editor');
    return;
  }

  // Handle chat connections
  else if (path.startsWith('/chat')) {
    handleChatConnection(socket, req);
    return;
  }

 
});

// Register a user connection with Redis
async function registerUserConnection(userId: string): Promise<void> {
  await pub.hset(`connections:${userId}`, {
    instanceId,
    timestamp: Date.now()
  });
  connectionRegistry.set(userId, instanceId);
}

// Remove a user connection from Redis
async function removeUserConnection(userId: string): Promise<void> {
  await pub.del(`connections:${userId}`);
  connectionRegistry.delete(userId);
}

// Handle chat-specific connections
async function handleChatConnection(socket: WebSocket, req: http.IncomingMessage) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const sessionToken = url.searchParams.get('token');
  const roomId = url.searchParams.get('room') || 'general';
  console.log("roomId in URL", roomId);
  
  // Authenticate with Clerk token
  if (!sessionToken) {
    console.log(`Authentication failure: No Clerk session token provided`);
    sendAuthError(socket, "Authentication required");
    return;
  }

  try {
    // Verify session token using Clerk SDK
    let userId;

    if (clerk) {
      try {
        const verifiedToken = await verifyToken(sessionToken, { secretKey: CLERK_SECRET_KEY });
        console.log("verifiedToken", verifiedToken);
        userId = verifiedToken.sub;
      } catch (error: any) {
        console.log(`Authentication failure: Invalid token - ${error?.message || 'Unknown error'}`);
        sendAuthError(socket, "Invalid authentication");
        return;
      }
    } else {
      console.error("Clerk is not properly initialized. Missing CLERK_SECRET_KEY or CLERK_JWT_KEY environment variables.");
      sendAuthError(socket, "Server authentication error");
      return;
    }

    if (!userId) {
      console.log(`Authentication failure: No user ID found in token`);
      sendAuthError(socket, "Invalid authentication");
      return;
    }

    // Get user details from Clerk
    const user = await clerk?.users.getUser(userId);

    if (!user) {
      console.log(`Authentication failure: User not found for ID ${userId}`);
      sendAuthError(socket, "User not found");
      return;
    }

    const username = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Anonymous User';

    console.log(`Chat user connected: ${username} (${userId}) in room ${roomId}`);

    // Register user connection with this instance
    await registerUserConnection(userId);

    // Check if the room exists in memory first before querying database
    if (!chatRooms.has(roomId)) {
      // Only check database if room is not already in memory
      const room = await prisma.codeRoom.findUnique({
        where: { id: roomId },
        select: { id: true }  // Only select the id field
      });
      
      if (!room) {
        console.log(`Room not found: ${roomId}`);
        sendAuthError(socket, "Invalid room");
        return;
      }
      
      chatRooms.set(roomId, new Set<string>());
      
      // Subscribe to Redis channel for this new room
      await subscribeToRoomChannel(roomId);
    }

    // Add user to the room
    chatRooms.get(roomId)?.add(userId);

    // Create user object and store for future reference
    chatUsers.set(userId, {
      userId,
      username,
      currentRoom: roomId,
      socket,
      joinedAt: Date.now()
    });

    // Send join notification to room
    const joinMessage = {
      type: MessageType.JOIN,
      roomId,
      senderId: userId,
      senderName: username,
      timestamp: Date.now(),
      instanceId
    };
    
    // Enqueue join message for database storage
    try {
      await queueClient.rpush('chat_messages_queue', JSON.stringify({
        type: MessageType.JOIN.toString(),
        content: 'joined the room',
        roomId,
        senderId: userId,
        senderName: username,
        timestamp: joinMessage.timestamp
      }));
    } catch (error) {
      console.error('Error enqueueing join message:', error);
    }
    
    // Publish join message to Redis
    await pub.publish(`${REDIS_CHANNEL_PREFIX}${roomId}`, JSON.stringify(joinMessage));

    // Send current user list to the new user
    sendUserList(roomId, userId);

    // Handle incoming messages
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await handleChatMessage(userId, message);
      } catch (error) {
        console.error('Invalid message format:', error);
      }
    });

    // Handle disconnection
    socket.on('close', async () => {
      console.log(`Chat user disconnected: ${username} (${userId})`);

      // Remove user connection from registry
      await removeUserConnection(userId);

      // Remove user from room
      chatRooms.get(roomId)?.delete(userId);

      // Cleanup empty rooms
      if (chatRooms.get(roomId)?.size === 0 && roomId !== 'general') {
        chatRooms.delete(roomId);
        // No need to unsubscribe from room channel as we want to keep receiving messages
        // for when new users join this room on this instance
      }


      // Remove user from users map
      chatUsers.delete(userId);

      // Notify room about user leaving
      const leaveMessage = {
        type: MessageType.LEAVE,
        roomId,
        senderId: userId,
        senderName: username,
        timestamp: Date.now(),
        instanceId
      };
      
      // Enqueue leave message for database storage
      try {
        await queueClient.rpush('chat_messages_queue', JSON.stringify({
          type: MessageType.LEAVE.toString(),
          content: 'left the room',
          roomId,
          senderId: userId,
          senderName: username,
          timestamp: leaveMessage.timestamp
        }));
      } catch (error) {
        console.error('Error enqueueing leave message:', error);
      }
      
      // Publish leave message to Redis
      await pub.publish(`${REDIS_CHANNEL_PREFIX}${roomId}`, JSON.stringify(leaveMessage));
    });
  } catch (error) {
    console.error("Token verification failed:", error);
    sendAuthError(socket, "Invalid authentication");
  }
}

// Handle incoming messages from a chat user
async function handleChatMessage(userId: string, message: any) {
  const user = chatUsers.get(userId);
  if (!user) return;

  // Check rate limit before processing message
  const rateLimitCheck = checkRateLimit(userId);
  if (rateLimitCheck.limited) {
    user.socket.send(JSON.stringify({
      type: MessageType.ERROR,
      senderId: 'system',
      senderName: 'System',
      content: rateLimitCheck.reason,
      timestamp: Date.now()
    }));
    return;
  }

  // Handle based on message type
  if (message.type === 'private' && message.recipientId) {
    try {
      // Handle private message
      const privateMessage = {
        type: MessageType.PRIVATE_MESSAGE,
        senderId: userId,
        senderName: user.username,
        content: message.content || '',
        timestamp: Date.now(),
        recipientId: message.recipientId,
        instanceId
      };

      // First enqueue message for database storage to ensure persistence
      await queueClient.rpush('chat_messages_queue', JSON.stringify({
        ...privateMessage,
        type: MessageType.PRIVATE_MESSAGE.toString(),
      }));

      // Check if recipient exists and is connected to any instance
      const recipientConnData = await pub.hgetall(`connections:${message.recipientId}`);
      
      if (!recipientConnData.instanceId) {
        // Recipient is not connected, but message is still stored in DB
        user.socket.send(JSON.stringify({
          type: MessageType.ERROR,
          senderId: 'system',
          senderName: 'System',
          content: 'User is not currently online',
          timestamp: Date.now()
        }));
        return; // Exit early since recipient is offline
      }

      // If recipient is on a different instance, forward the message there
      if (recipientConnData.instanceId !== instanceId) {
        await pub.publish(recipientConnData.instanceId, JSON.stringify({
          userId: message.recipientId,
          payload: privateMessage
        }));
      } else {
        // Otherwise send directly if they're on this instance
        const recipientUser = chatUsers.get(message.recipientId);
        if (recipientUser && recipientUser.socket.readyState === WebSocket.OPEN) {
          recipientUser.socket.send(JSON.stringify(privateMessage));
        }
      }

      // Send an acknowledgment to the sender that message was sent successfully
      user.socket.send(JSON.stringify({
        type: MessageType.MESSAGE,
        senderId: 'system',
        senderName: 'System',
        content: 'Message sent successfully',
        timestamp: Date.now()
      }));
      
    } catch (error) {
      console.error('Error handling private message:', error);
      // Notify sender of the error
      user.socket.send(JSON.stringify({
        type: MessageType.ERROR,
        senderId: 'system',
        senderName: 'System',
        content: 'Failed to send private message',
        timestamp: Date.now()
      }));
    }
  } else {
    // Handle regular room message
    const chatMessage = {
      type: MessageType.MESSAGE,
      roomId: user.currentRoom,
      senderId: userId,
      senderName: user.username,
      content: message.content,
      timestamp: Date.now(),
      instanceId
    };

    // Enqueue room message for database storage
    try {
      await queueClient.rpush('chat_messages_queue', JSON.stringify({
        type: MessageType.MESSAGE.toString(),
        content: message.content || '',
        roomId: user.currentRoom,
        senderId: userId,
        senderName: user.username,
        timestamp: chatMessage.timestamp
      }));
    } catch (error) {
      console.error('Error enqueueing room message:', error);
    }

    // Publish to Redis so all server instances receive it
    const roomRedisChannel = `${REDIS_CHANNEL_PREFIX}${user.currentRoom}`;
    console.log("publishing message to roomRedisChannel", roomRedisChannel, chatMessage);
    await pub.publish(roomRedisChannel, JSON.stringify(chatMessage));
  }
}

// Send the list of users in a room to a specific user
function sendUserList(roomId: string, recipientId: string) {
  const room = chatRooms.get(roomId);
  if (!room) return;

  const users = Array.from(room)
    .map(id => {
      const user = chatUsers.get(id);
      return {
        userId: id,
        username: user?.username
      };
    });
  
  const userListMessage = {
    type: MessageType.USER_LIST,
    roomId,
    senderId: 'system',
    senderName: 'System',
    content: JSON.stringify(users),
    timestamp: Date.now(),
    instanceId
  };
  
  const recipient = chatUsers.get(recipientId);
  if (recipient && recipient.socket.readyState === WebSocket.OPEN) {
    recipient.socket.send(JSON.stringify(userListMessage));
  }
}

// Helper function to send authentication error
function sendAuthError(socket: WebSocket, message: string) {
  socket.send(JSON.stringify({
    type: MessageType.ERROR,
    senderId: 'system',
    senderName: 'System',
    content: message,
    timestamp: Date.now()
  }));
  socket.close(4000, message);
}

// Periodically clean up stale connections
setInterval(async () => {
  const now = Date.now();
  const staleTimeout = 30000; // 30 seconds

  // Clean up stale connections in Redis
  const connections = await pub.keys('connections:*');
  for (const key of connections) {
    const data = await pub.hgetall(key);
    if (now - parseInt(data.timestamp) > staleTimeout) {
      await pub.del(key);
    }
  }
}, 15000);

// Process the chat message queue and save to database in batches
async function processChatMessageQueue() {
  try {
    // Get up to 100 messages from the queue
    const messages = await queueClient.lrange('chat_messages_queue', 0, 99);
    
    if (messages.length === 0) {
      return; // No messages to process
    }
    
    console.log(`Processing ${messages.length} chat messages from queue`);
    
    // Remove the messages we're about to process
    await queueClient.ltrim('chat_messages_queue', messages.length, -1);
    
    // Parse messages
    const parsedMessages = messages.map(msg => {
      const data = JSON.parse(msg);
      return {
        type: data.type,
        content: data.content || '',
        senderId: data.senderId, // This is now directly the Clerk ID
        senderName: data.senderName,
        roomId: data.roomId || null,
        recipientId: data.recipientId || null, // This is now directly the Clerk ID
        timestamp: new Date(data.timestamp)
      };
    });
    
    // Validate each message before inserting into database
    const validMessages = [];
    
    for (const msg of parsedMessages) {
      // Skip messages with invalid data
      if (!msg.senderId) {
        console.warn('Skipping message without senderId:', msg);
        continue;
      }
      
      // For private messages, we don't need a roomId
      if (msg.type === MessageType.PRIVATE_MESSAGE.toString()) {
        // Private messages need a recipientId
        if (!msg.recipientId) {
          console.warn('Skipping private message without recipientId:', msg);
          continue;
        }
        
        // Remove roomId from private messages
        msg.roomId = null;
        validMessages.push(msg);
        continue;
      }
      
      // For room messages, we need a valid roomId
      if (msg.type === MessageType.MESSAGE.toString() || 
          msg.type === MessageType.JOIN.toString() || 
          msg.type === MessageType.LEAVE.toString()) {
        
        if (!msg.roomId) {
          console.warn(`Skipping ${msg.type} message without roomId:`, msg);
          continue;
        }
        
        // Verify the room exists
        try {
          const room = await prisma.codeRoom.findUnique({
            where: { id: msg.roomId },
            select: { id: true }
          });
          
          if (!room) {
            console.warn(`Skipping message for non-existent room ${msg.roomId}:`, msg);
            continue;
          }
          
          validMessages.push(msg);
        } catch (error) {
          console.error('Error verifying room existence:', error);
          continue;
        }
      } else {
        // Other message types (like system messages)
        validMessages.push(msg);
      }
    }
    
    if (validMessages.length === 0) {
      console.log('No valid messages to save after validation');
      return;
    }
    
    console.log(`Storing ${validMessages.length} valid messages (${parsedMessages.length - validMessages.length} invalid)`);
    
    // Insert messages in batches to improve performance
    const batchSize = 20;
    for (let i = 0; i < validMessages.length; i += batchSize) {
      const batch = validMessages.slice(i, i + batchSize);
      await prisma.$transaction(
        batch.map(msg => 
          prisma.chatMessage.create({
            data: msg
          })
        )
      );
    }
    
    console.log(`Successfully stored ${validMessages.length} messages in database`);
  } catch (error) {
    console.error('Error processing chat message queue:', error);
  }
}

// Start the chat message processor on an interval
function startChatMessageProcessor() {
  // Process queue every 10 seconds
  const PROCESS_INTERVAL = 10 * 1000; 
  
  setInterval(async () => {
    await processChatMessageQueue();
  }, PROCESS_INTERVAL);
  
  console.log('Chat message batch processor started');
}

// Clean up function for graceful shutdown
async function cleanup() {
  console.log('Cleaning up before shutdown...');
  
  try {
    // Unsubscribe from all channels
    const channels = Array.from(subscribedChannels);
    if (channels.length > 0) {
      await sub.unsubscribe(...channels);
      console.log(`Unsubscribed from ${channels.length} Redis channels`);
    }
    
    // Unsubscribe from instance channel
    await sub.unsubscribe(instanceId);
    
    // Close Redis connections
    await sub.quit();
    await pub.quit();
    await queueClient.quit();
    
    console.log('Cleanup complete');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  // Exit process
  process.exit(0);
}

// Start the server
server.listen(PORT, HOST, async () => {
  const protocol = USE_SSL ? 'https' : 'http';
  console.log(`WebSocket server is running at ${protocol}://${HOST}:${PORT}`);
  
  // Setup Redis subscriptions when starting server
  await initialize();
});

process.on('SIGINT', async () => {
  console.log('Shutting down WebSocket server');
  
  // Clean up all Redis connections for this instance
  for (const userId of chatUsers.keys()) {
    await removeUserConnection(userId);
  }
  
  wss.close();
  process.exit(0);
}); 