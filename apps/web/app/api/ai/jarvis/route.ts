import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import OpenAI from 'openai';
import { prisma } from '@repo/db';
import { Redis } from 'ioredis';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Redis client for publishing messages
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  password: process.env.REDIS_PASSWORD,
});

// Define message type enum to match the one in the WebSocket server
enum MessageType {
  JOIN = 'join',
  LEAVE = 'leave',
  MESSAGE = 'message',
  USER_LIST = 'user_list',
  PRIVATE_MESSAGE = 'private_message',
  ERROR = 'error',
}

// Get a random instance ID since this is coming from the API, not a specific WebSocket instance
const instanceId = Math.random().toString(36).substring(2, 15);
const REDIS_CHANNEL_PREFIX = 'chat:room:';

export async function POST(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { message, code, language, roomId } = await req.json();
    
    if (!message || !message.includes('@jarvis')) {
      return NextResponse.json({ error: 'Message must include @jarvis' }, { status: 400 });
    }

    // Check if the user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Extract the actual query from the message (remove @jarvis)
    const query = message.replace(/@jarvis/gi, '').trim();

    // Prepare the prompt for the AI
    const prompt = `
You are Jarvis, an AI assistant specialized in helping with code. You have been tagged in a message with "@jarvis".
You should provide helpful, concise responses related to the code context provided.

USER QUERY: ${query}

CODE CONTEXT:
\`\`\`${language || 'javascript'}
${code}
\`\`\`

Additional context: The user is working in a collaborative coding environment. Only respond to queries related to the code.

GUIDELINES:
- Respond in a helpful, concise manner
- Focus only on the code and user's query
- Provide practical solutions, examples, or explanations
- If asked about something unrelated to the code, politely redirect to code-related topics
- Format code snippets appropriately
- Keep your response under 500 words
- only mention the code block inside tripple backticks. If there is any variable, then just make it bold. dont put the variable in the code block.
- Lets say the user asks you to explain the code, while explaining some variable, then just make it bold. dont put the variable in the code block.
- If the code is in JavaScript, take the input similar to the below example:
const input = require("fs").readFileSync("/dev/stdin").toString().trim();
const [rawArr, rawTarget] = input.split("\n");
const arr = rawArr.split(" ").map(Number); // Convert array elements to numbers
const target = Number(rawTarget); // Convert target to a number


`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.5,
    });

    // Extract the AI response
    const aiResponse = response.choices[0]?.message.content?.trim() || 'Sorry, I could not generate a response.';

    // Check if the jarvis user exists
    const jarvisUser = await prisma.user.findUnique({
      where: { id: 'jarvis' }
    });

    if (!jarvisUser) {
      return NextResponse.json({ error: 'Jarvis user not found in database' }, { status: 500 });
    }

    // Create a timestamp
    const timestamp = Date.now();

    // Create message object for WebSocket broadcast
    const chatMessage = {
      type: MessageType.MESSAGE,
      roomId: roomId,
      senderId: 'jarvis',
      senderName: 'Jarvis AI',
      content: aiResponse,
      timestamp: timestamp,
      instanceId: instanceId
    };

    // Publish the message to the room's Redis channel for WebSocket broadcast
    const roomRedisChannel = `${REDIS_CHANNEL_PREFIX}${roomId}`;
    await redis.publish(roomRedisChannel, JSON.stringify(chatMessage));

    // Also queue the message for database storage (same approach as the WebSocket server)
    await redis.rpush('chat_messages_queue', JSON.stringify({
      type: MessageType.MESSAGE.toString(),
      content: aiResponse,
      roomId: roomId,
      senderId: 'jarvis',
      senderName: 'Jarvis AI',
      timestamp: timestamp
    }));

    return NextResponse.json({ 
      response: aiResponse,
      timestamp: timestamp
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (error: any) {
    console.error('Error generating Jarvis response:', error);
    return NextResponse.json(
      { error: 'An error occurred while generating the response', details: error.message || String(error) },
      { status: 500 }
    );
  }
} 