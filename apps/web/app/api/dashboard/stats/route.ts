import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { prisma } from '@repo/db';

export async function GET(req: NextRequest) {
  try {
    // Authenticate the request
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user in our database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get rooms created by the user
    const createdRooms = await prisma.codeRoom.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        language: true,
      }
    });
    
    // Get rooms where the user is a participant (invited)
    const participatingRooms = await prisma.codeRoom.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
        NOT: {
          ownerId: userId, // Exclude rooms the user created
        }
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        language: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      }
    });

   

    // Fetch recent activity
    // Get room creation activities
    const createdRoomsActivity = await prisma.codeRoom.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
      }
    });

    // Get joined room activities
    const joinedRoomsActivity = await prisma.participant.findMany({
      where: {
        userId: userId,
        room: {
          ownerId: {
            not: userId
          }
        }
      },
      orderBy: { joinedAt: 'desc' },
      take: 5,
      include: {
        room: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Format the creation activities
    const creationActivity = createdRoomsActivity.map(room => ({
      id: room.id,
      name: room.name,
      type: 'created' as const,
      date: room.createdAt.toISOString(),
    }));

    // Format the joined activities
    const joinActivity = joinedRoomsActivity.map(participant => ({
      id: participant.roomId,
      name: participant.room.name,
      type: 'joined' as const,
      date: participant.joinedAt.toISOString(),
    }));

    // Combine and sort all activities by date
    const allActivities = [...creationActivity, ...joinActivity]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Limit to 5 most recent activities

    // Combine all stats into a single response
    console.log("allActivities", allActivities)
    console.log("createdRooms", createdRooms)
    console.log("participatingRooms", participatingRooms)   
 
    console.log("createdRooms.length", createdRooms.length)
    return NextResponse.json({
      totalRoomsCreated: createdRooms.length,
      totalRoomsInvited: participatingRooms.length,
      totalRooms: createdRooms.length + participatingRooms.length,
 
      recentActivity: allActivities,
      createdRooms,
      participatingRooms,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
} 