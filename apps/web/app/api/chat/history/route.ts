import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@repo/db';

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the room ID from the query parameters
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const before = searchParams.get('before'); // Message ID to paginate before
    
    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    // Get or create the user
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if the room exists
    const room = await prisma.codeRoom.findUnique({
      where: { id: roomId },
      select: { id: true }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if the user has access to this room
    const participant = await prisma.participant.findUnique({
      where: {
        userId_roomId: {
          userId,
          roomId,
        },
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Access denied to this room' }, { status: 403 });
    }

    // Build the query
    const query: any = {
      where: {
        OR: [
          // Room messages
          { roomId },
          // Private messages sent by the user
          { 
            AND: [
              { senderId: userId },
              { recipientId: { not: null } }
            ]
          },
          // Private messages received by the user
          {
            AND: [
              { recipientId: userId }
            ]
          }
        ]
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    };

    // Add cursor-based pagination if specified
    if (before) {
      query.cursor = {
        id: before,
      };
      query.skip = 1; // Skip the cursor message
    }

    // Fetch chat messages
    const messages = await prisma.chatMessage.findMany(query);

    // Return the messages in chronological order (oldest first)
    return NextResponse.json({ 
      messages: messages.reverse(),
      hasMore: messages.length === limit
    }, {
      // Add cache-control headers to reduce frequency of requests
      headers: {
        'Cache-Control': 'private, max-age=10'
      }
    });
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching chat history' },
      { status: 500 }
    );
  }
} 