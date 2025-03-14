import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@repo/db";

// Get all rooms for the current user
export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get rooms owned by the user
    const ownedRooms = await prisma.codeRoom.findMany({
      where: { ownerId: userId },
      orderBy: { updatedAt: "desc" },
    });

    // Get rooms where the user is a participant
    const participatingRooms = await prisma.codeRoom.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      ownedRooms,
      participatingRooms,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}

// Create a new room
export async function POST(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { name, description, language = "javascript", participants = [] } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Room name is required" },
        { status: 400 }
      );
    }

    // Validate participant emails
    if (participants && !Array.isArray(participants)) {
      return NextResponse.json(
        { error: "Participants should be an array of email addresses" },
        { status: 400 }
      );
    }

    // Create the room first
    const room = await prisma.codeRoom.create({
      data: {
        name,
        description,
        language,
        ownerId: userId,
      },
    });

    // Process participant invitations
    if (participants.length > 0) {
      // First validate that all participant emails exist in the system
      const participantEmails = participants.filter(
        (email: string) => email !== user?.email
      );
      
      if (participantEmails.length > 0) {
        const existingUsers = await prisma.user.findMany({
          where: {
            email: {
              in: participantEmails,
            },
          },
          select: {
            email: true,
          },
        });
        
        const existingEmails = existingUsers.map(user => user.email);
        const nonExistingEmails = participantEmails.filter(
          (email: string) => !existingEmails.includes(email)
        );
        
        if (nonExistingEmails.length > 0) {
          return NextResponse.json(
            { 
              error: `The following emails are not registered users: ${nonExistingEmails.join(', ')}` 
            }, 
            { status: 400 }
          );
        }
      }
      
      // Handle each participant
      await Promise.all(
        participants.map(async (email: string) => {
          try {
            // Check if the user already exists
            let participantUser = await prisma.user.findUnique({
              where: { email },
            });

            if(!participantUser) {
              return; // We've already validated that all users exist
            }

            // Create the participant relationship
            await prisma.participant.create({
              data: {
                userId: participantUser.id,
                roomId: room.id,
              },
            });

            // TODO: Send invitation email to the participant
            console.log(`Invitation created for ${email} to join room ${room.id}`);
          } catch (error) {
            console.error(`Error processing participant ${email}:`, error);
            // Continue with other participants even if one fails
          }
        })
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
} 