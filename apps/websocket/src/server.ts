import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
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

const server = http.createServer(app);
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

// Initialize the server
async function initialize() {
  // Load existing rooms from Redis on startup
  await loadRoomsFromRedis();
  
  // Set up Redis subscription to channels for each room
  await setupRedisSubscriptions();
  
  // Set up batch processor for chat messages
  startChatMessageProcessor();
  
  // The sub.on('message'...) handlers for instance-specific and room channels 
  // are now set up in a centralized way in the setupRedisSubscriptions function
  
  console.log(`WebSocket server initialized with instance ID: ${instanceId}`);
  
  // Set up process termination handler for cleanup
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

// Load rooms from Redis
async function loadRoomsFromRedis() {
  try {
    // Get all rooms from Redis
    const rooms = await pub.smembers(REDIS_ROOMS_KEY);
    
    // If no rooms exist, create the default general room
    if (rooms.length === 0) {
      await pub.sadd(REDIS_ROOMS_KEY, 'general');
      rooms.push('general');
    }
    
    // Initialize chatRooms with rooms from Redis
    for (const roomId of rooms) {
      chatRooms.set(roomId, new Set<string>());
      console.log(`Loaded room from Redis: ${roomId}`);
    }
  } catch (error) {
    console.error('Error loading rooms from Redis:', error);
    // Fallback to at least having the general room
    chatRooms.set('general', new Set<string>());
  }
}

// Add a new room
async function addRoom(roomId: string): Promise<boolean> {
  try {
    // Check if room already exists
    if (chatRooms.has(roomId)) {
      return false;
    }
    
    // Add room to Redis
    await pub.sadd(REDIS_ROOMS_KEY, roomId);
    
    // Add room to local cache
    chatRooms.set(roomId, new Set<string>());
    
    // Subscribe to the new room's channel
    await subscribeToRoomChannel(roomId);
    
    console.log(`Created new room: ${roomId}`);
    return true;
  } catch (error) {
    console.error(`Error creating room ${roomId}:`, error);
    return false;
  }
}

// Remove a room
async function removeRoom(roomId: string): Promise<boolean> {
  try {
    const exists = await pub.sismember(REDIS_ROOMS_KEY, roomId);
    if (!exists) {
      console.log(`Room ${roomId} does not exist in Redis`);
      return false;
    }
    
    // Remove from Redis set
    await pub.srem(REDIS_ROOMS_KEY, roomId);
    
    // Unsubscribe from channel
    const channel = `${REDIS_CHANNEL_PREFIX}${roomId}`;
    await sub.unsubscribe(channel);
    
    // Remove from subscribedChannels set
    subscribedChannels.delete(channel);
    
    console.log(`Removed room: ${roomId}`);
    return true;
  } catch (error) {
    console.error(`Error removing room ${roomId}:`, error);
    return false;
  }
}

// Setup Redis subscriptions
async function setupRedisSubscriptions() {
  // Subscribe to all existing rooms
  for (const roomId of chatRooms.keys()) {
    await subscribeToRoomChannel(roomId);
  }
  
  // Subscribe to this instance's channel
  await sub.subscribe(instanceId);
  
  // Handle instance-specific messages
  sub.on('message', (channel, messageStr) => {
    console.log("received message from instance", channel, messageStr);
    if (channel === instanceId) {
      try {
        const { userId, payload } = JSON.parse(messageStr);
        const user = chatUsers.get(userId);
        if (user && user.socket.readyState === WebSocket.OPEN) {
          user.socket.send(JSON.stringify(payload));
        }
      } catch (error) {
        console.error('Error handling cross-instance message:', error);
      }
    }
  });
}

// Track subscribed channels to prevent duplicate subscriptions
const subscribedChannels = new Set<string>();

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

// Use a single global message handler instead of creating a new one for each subscription
sub.on('message', (receivedChannel, messageStr) => {
  // Skip instance-specific channel, which is handled separately
  if (receivedChannel === instanceId) return;
  console.log("received message from channel ", receivedChannel, messageStr);
  // Handle room channels
  if (receivedChannel.startsWith(REDIS_CHANNEL_PREFIX)) {
    try {
      const message = JSON.parse(messageStr) as ChatMessage;
      const roomId = receivedChannel.substring(REDIS_CHANNEL_PREFIX.length);
      
      // Broadcast to all users in this room on this instance
      const room = chatRooms.get(roomId);
      if (!room) return;
      
      room.forEach(userId => {
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
      // Fallback to using secretKey to verify the token
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

    // Check if user is already connected on this instance
    if (chatUsers.has(userId)) {
      // Handle reconnection - close existing connection
      const existingUser = chatUsers.get(userId);
      if (existingUser && existingUser.socket.readyState === WebSocket.OPEN) {
        existingUser.socket.close(1000, 'Reconnecting from another location');
      }
    } else {
      // Check if user is connected to another instance
      const connectionData = await pub.hgetall(`connections:${userId}`);
      if (connectionData.instanceId && connectionData.instanceId !== instanceId) {
        // User is connected to another instance, we should notify that instance
        await pub.publish(connectionData.instanceId, JSON.stringify({
          userId,
          payload: {
            type: MessageType.ERROR,
            senderId: 'system',
            senderName: 'System',
            content: 'Reconnecting from another location',
            timestamp: Date.now()
          }
        }));
      }
    }

    console.log(`Chat user connected: ${username} (${userId}) in room ${roomId}`);

    // Register user connection with this instance
    await registerUserConnection(userId);

    // Check if the room exists in memory first before querying database
    if (!chatRooms.has(roomId)) {
      // Only check database if room is not already in memory
      // Use select with only the id field to minimize data transfer
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

  // Handle based on message type
  if (message.type === 'private' && message.recipientId) {
    // Handle private message
    const privateMessage = {
      type: MessageType.PRIVATE_MESSAGE,
      senderId: userId,
      senderName: user.username,
      content: message.content,
      timestamp: Date.now(),
      recipientId: message.recipientId,
      instanceId
    };

    // Enqueue private message for database storage
    try {
      await queueClient.rpush('chat_messages_queue', JSON.stringify({
        type: MessageType.PRIVATE_MESSAGE.toString(),
        content: message.content || '',
        senderId: userId,
        senderName: user.username,
        recipientId: message.recipientId,
        timestamp: privateMessage.timestamp
      }));
    } catch (error) {
      console.error('Error enqueueing private message:', error);
    }

    // Check if recipient is connected to any instance
    const recipientConnData = await pub.hgetall(`connections:${message.recipientId}`);
    
    if (recipientConnData.instanceId) {
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
    }
    
    // Send a copy to the sender as well
    user.socket.send(JSON.stringify(privateMessage));
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
  console.log(`WebSocket server is running at http://${HOST}:${PORT}`);
  
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