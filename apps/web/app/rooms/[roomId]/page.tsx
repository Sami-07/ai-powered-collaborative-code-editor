import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Navbar from "../../../components/Navbar";
import CodeEditorWrapper from "../../../components/CodeEditorWrapper";
import { prisma } from "@repo/db";

interface SerializableUser {
  id: string;
  name: string;
  email: string;
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { userId } = await auth();
  const user = await currentUser();
  const { roomId } = await params;
  if (!userId || !user) {
    redirect("/sign-in");
  }
  const simplifiedUser: SerializableUser = {
    id: user?.id || "",
    name: user?.firstName + " " + user?.lastName || "",
    email: user?.emailAddresses[0]?.emailAddress || "",
  };

  // Find the user in our database
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Get the room
  const room = await prisma.codeRoom.findUnique({
    where: { id: roomId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!room) {
    redirect("/rooms");
  }

  // Check if user is owner or participant
  const isOwner = room.owner.id === userId;
  const isParticipant = room.participants.some(
    (p: any) => p.user.id === userId
  );
  console.log("room.participants", room.participants);
  console.log("isOwner", isOwner);
  console.log("isParticipant", isParticipant);
  console.log("room", room);
  if (!isOwner && !isParticipant) {
    // Add user as participant if they're not already
    console.log("Adding user as participant");
    console.log("dbUser", dbUser);
    console.log("room.id", room.id);
    await prisma.participant.create({
      data: {
        userId: dbUser?.id || "",
        roomId: room.id,
      },
    });
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 mt-20">
      <Navbar />

      <main className="flex-grow flex flex-col">
        <div className="flex-grow px-4 sm:px-6 lg:px-8">
          <div className="h-full max-w-[90vw] mx-auto pt-4">
            <CodeEditorWrapper
              roomId={room.id}
              initialCode={room.code}
              language={room.language}
              currentUser={simplifiedUser}
              isOwner={isOwner}
              roomName={room.name}
              roomDescription={room.description}
              roomOwner={room.owner.name || room.owner.email}
            />
          </div>
        </div>
      </main>
    </div>
  );
} 