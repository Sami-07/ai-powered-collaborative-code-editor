import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import Navbar from "../../components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FiPlus, FiCode, FiUsers, FiMonitor, FiArrowRight, FiGitBranch } from "react-icons/fi";
import { SparklesText } from "@/components/magicui/sparkles-text";

export const dynamic = 'force-dynamic';
// Define types for the API response
interface Activity {
  id: string;
  name: string;
  type: 'created' | 'joined';
  date: string;
}

interface DashboardStats {
  totalRoomsCreated: number;
  totalRoomsInvited: number;
  totalRooms: number;
  activeSessions: number;
  recentActivity: Activity[];
  createdRooms: any[];
  participatingRooms: any[];
}

async function getDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dashboard/stats?userId=${userId}`, {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch dashboard stats:', await response.text());
      // Return fallback data in case of error
      return {
        totalRoomsCreated: 0,
        totalRoomsInvited: 0,
        totalRooms: 0,
        activeSessions: 0,
        recentActivity: [],
        createdRooms: [],
        participatingRooms: [],
      };
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    // Return fallback data in case of error
    return {
      totalRoomsCreated: 0,
      totalRoomsInvited: 0,
      totalRooms: 0,
      activeSessions: 0,
      recentActivity: [],
      createdRooms: [],
      participatingRooms: [],
    };
  }
}

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();
  
  if (!userId || !user) {
    redirect("/sign-in");
  }

  const stats = await getDashboardStats(userId);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-20">
        {/* Dashboard Header */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <SparklesText text={`Welcome, ${user.firstName || "User"}!`} className="text-3xl font-bold text-gray-900" />
              <p className="mt-2 text-gray-600">
                Manage your code rooms and collaborations
              </p>
            </div>

            <div className="mt-4 sm:mt-0">
              <Link href="/rooms/new">
                <Button>
                  <FiPlus className="mr-2" />
                  New Room
                </Button>
              </Link>
            </div>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Rooms</p>
                  <p className="text-3xl font-semibold text-gray-900">{stats.totalRooms}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <FiCode className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Rooms Created</p>
                  <p className="text-3xl font-semibold text-gray-900">{stats.totalRoomsCreated}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <FiPlus className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Rooms Invited</p>
                  <p className="text-3xl font-semibold text-gray-900">{stats.totalRoomsInvited}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">
                  <FiUsers className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Actions */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2 mb-10">
          <Card className="bg-white overflow-hidden shadow-md border-none hover:shadow-lg transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b pb-4">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-600 rounded-md mr-3">
                  <FiMonitor className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">My Code Rooms</CardTitle>
              </div>
              <CardDescription className="text-gray-600 mt-2">
                Access your existing code rooms
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                View and manage all your collaborative coding spaces in one place. 
                Resume your projects anytime.
              </p>
              <Link href="/rooms">
                <Button variant="secondary" className="w-full justify-between group">
                  View Rooms
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <Card className="bg-white overflow-hidden shadow-md border-none hover:shadow-lg transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100 border-b pb-4">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-600 rounded-md mr-3">
                  <FiPlus className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-lg font-semibold text-gray-900">Create New Room</CardTitle>
              </div>
              <CardDescription className="text-gray-600 mt-2">
                Start a new collaborative session
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 mb-4">
                Create a fresh coding space and invite teammates to collaborate in real-time 
                with AI assistance.
              </p>
              <Link href="/rooms/new">
                <Button className="w-full justify-between group">
                  Create Room
                  <FiArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
        
        {/* Recent Activity Section */}
        <div className="bg-white rounded-lg shadow-md border-none p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
           
          </div>
          
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start p-3 rounded-lg hover:bg-gray-50">
                  <div className="p-2 bg-indigo-100 rounded-full mr-4">
                    <FiGitBranch className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-grow">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{activity.name}</p>
                      <span className="text-xs text-gray-500">
                        {new Date(activity.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 capitalize">
                      You {activity.type} this room
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity to show</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 