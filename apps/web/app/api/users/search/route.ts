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

    // Get the email query from search parameters
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    
    if (!query || query.length < 3) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by email
    const users = await prisma.user.findMany({
      where: {
        email: {
          contains: query,
          mode: 'insensitive',
        },
        // Don't include the current user in results
        NOT: {
          id: userId
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
} 