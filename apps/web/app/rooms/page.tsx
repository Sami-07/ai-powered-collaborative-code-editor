import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Navbar from "../../components/Navbar";
import { prisma } from "@repo/db";
import { CalendarDays, Code2, Plus, Share2, User } from "lucide-react";

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
      owner: {
        id: {
          not: userId,
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

  // Function to get time elapsed in a readable format
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const lowerToPascalMap = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'python': 'Python',
    'java': 'Java',
    'c#': 'C#',
    'go': 'Go',
    'rust': 'Rust',
    'ruby': 'Ruby',
    'php': 'PHP',
  }
  // Function to generate a color based on language
  const getLanguageColor = (language: string) => {
    const colors: Record<string, string> = {
      'JavaScript': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'TypeScript': 'bg-blue-100 text-blue-800 border-blue-200',
      'Python': 'bg-green-100 text-green-800 border-green-200',
      'Java': 'bg-orange-100 text-orange-800 border-orange-200',
      'C#': 'bg-purple-100 text-purple-800 border-purple-200',
      'Go': 'bg-sky-100 text-sky-800 border-sky-200',
      'Rust': 'bg-amber-100 text-amber-800 border-amber-200',
      'Ruby': 'bg-red-100 text-red-800 border-red-200',
      'PHP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    
    return colors[language] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mt-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Code Rooms</h1>
            <p className="text-gray-500">Manage and collaborate on your coding projects</p>
          </div>
          <Link
            href="/rooms/new"
            className="inline-flex items-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition duration-150 ease-in-out"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Room
          </Link>
        </div>

        {ownedRooms.length === 0 && participatingRooms.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-white shadow-sm border border-gray-100">
            <div className="mx-auto w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
              <Code2 className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No Code Rooms Found</h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Create a new room to start collaborating on code with others in real-time.
            </p>
            <Link
              href="/rooms/new"
              className="inline-flex items-center px-5 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Room
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {ownedRooms.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <User className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Your Rooms</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {ownedRooms.map((room: any) => (
                    <Link key={room.id} href={`/rooms/${room.id}`} className="group">
                      <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl hover:shadow-md hover:border-indigo-100 transition-all group-hover:translate-y-[-2px]">
                        <div className="px-5 py-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{room.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLanguageColor(lowerToPascalMap[room.language as keyof typeof lowerToPascalMap] || room.language)}`}>
                              {lowerToPascalMap[room.language as keyof typeof lowerToPascalMap] || room.language}
                            </span>
                          </div>
                          
                          {room.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2 min-h-[40px]">{room.description}</p>
                          )}
                          
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-500">
                              <CalendarDays className="w-4 h-4 mr-1.5" />
                              <span>
                                {getTimeAgo(new Date(room.updatedAt))}
                              </span>
                            </div>
                            <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                              Owner
                            </div>
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
                <div className="flex items-center gap-2 mb-6">
                  <Share2 className="w-5 h-5 text-indigo-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Shared With You</h2>
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {participatingRooms.map((room: any) => (
                    <Link key={room.id} href={`/rooms/${room.id}`} className="group">
                      <div className="bg-white overflow-hidden shadow-sm border border-gray-100 rounded-xl hover:shadow-md hover:border-indigo-100 transition-all group-hover:translate-y-[-2px]">
                        <div className="px-5 py-5">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{room.name}</h3>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getLanguageColor(lowerToPascalMap[room.language as keyof typeof lowerToPascalMap] || room.language)}`}>
                              {lowerToPascalMap[room.language as keyof typeof lowerToPascalMap] || room.language}
                            </span>
                          </div>
                          
                          {room.description && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2 min-h-[40px]">{room.description}</p>
                          )}
                          
                          <p className="mt-1 text-xs flex items-center text-gray-500">
                            <User className="w-3 h-3 mr-1" />
                            {room.owner.name || room.owner.email}
                          </p>
                          
                          <div className="mt-4 flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-500">
                              <CalendarDays className="w-4 h-4 mr-1.5" />
                              <span>
                                {getTimeAgo(new Date(room.updatedAt))}
                              </span>
                            </div>
                            <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Participant
                            </div>
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