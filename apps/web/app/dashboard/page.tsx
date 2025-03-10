import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Navbar from "../../components/Navbar";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {user.firstName || "User"}!
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your code rooms and collaborations.
          </p>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">My Code Rooms</h3>
              <p className="mt-2 text-sm text-gray-500">
                View and manage your code rooms.
              </p>
              <div className="mt-4">
                <Link
                  href="/rooms"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  View Rooms
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Create New Room</h3>
              <p className="mt-2 text-sm text-gray-500">
                Start a new collaborative coding session.
              </p>
              <div className="mt-4">
                <Link
                  href="/rooms/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Create Room
                </Link>
              </div>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">Join Room</h3>
              <p className="mt-2 text-sm text-gray-500">
                Join an existing collaborative session.
              </p>
              <div className="mt-4">
                <Link
                  href="/rooms/join"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  Join Room
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 