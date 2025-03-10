import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Navbar from "../../components/Navbar";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";
export default async function RoomsPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  // Find the user in our database
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  // Get rooms owned by the user
  const ownedRooms = await prisma.codeRoom.findMany({
    where: {
      owner: {
        id: userId,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get rooms where the user is a participant
  const participatingRooms = await prisma.codeRoom.findMany({
    where: {
      participants: {
        some: {
          user: {
            id: userId,
          },
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
      participants: {
        select: {
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
    orderBy: { updatedAt: "desc" },
  });

  console.log("participatingRooms", participatingRooms[0]?.participants[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Code Rooms</h1>
          <Link
            href="/rooms/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create New Room
          </Link>
        </div>

        {ownedRooms.length === 0 && participatingRooms.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Code Rooms Found</h3>
            <p className="text-gray-500 mb-6">
              Create a new room to start collaborating with others.
            </p>
            <Link
              href="/rooms/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Your First Room
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {ownedRooms.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rooms</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ownedRooms.map((room: any) => (
                    <Link key={room.id} href={`/rooms/${room.id}`}>
                      <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                        <div className="px-4 py-5 sm:p-6">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{room.name}</h3>
                          {room.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{room.description}</p>
                          )}
                          <div className="mt-4 flex items-center justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {room.language}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(room.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {participatingRooms.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Shared With You</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {participatingRooms.map((room: any) => (
                    <Link key={room.id} href={`/rooms/${room.id}`}>
                      <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                        <div className="px-4 py-5 sm:p-6">
                          <h3 className="text-lg font-medium text-gray-900 truncate">{room.name}</h3>
                          {room.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">{room.description}</p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Owned by: {room.owner.name || room.owner.email}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              {room.language}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(room.updatedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 