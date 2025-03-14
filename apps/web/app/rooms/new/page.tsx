

import { redirect } from "next/navigation";
import Navbar from "../../../components/Navbar";
import { auth } from "@clerk/nextjs/server";
import NewRoomForm from "../../../components/NewRoomForm";
import { prisma } from "@repo/db";

export default async function NewRoomPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/sign-in");
  }

  // Find the user in our database
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    // Redirect to rooms page which will create the user
    redirect("/rooms");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mt-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Code Room</h1>
          <p className="mt-2 text-gray-600">
            Create a new collaborative code editing room to share with others.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <NewRoomForm userId={user.id} />
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p className="font-medium mb-2">💡 Participant Invitations:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Add multiple participants by email address</li>
            <li>Participants will be automatically added to the room</li>
       
            <li>You can always add more participants after creating the room</li>
          </ul>
        </div>
      </main>
    </div>
  );
} 