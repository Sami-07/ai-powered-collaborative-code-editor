import Link from "next/link";
import Navbar from "../components/Navbar"
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Collaborative Code Editing
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Edit code in real-time with your team. See everyone's cursor position and changes as they happen.
          </p>
          
          <div className="mt-10">
            <SignedOut>
              <div className="flex justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Get Started
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Sign In
                </Link>
              </div>
            </SignedOut>
            
            <SignedIn>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Go to Dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
        
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Real-time Collaboration</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Edit code together in real-time. See changes as they happen.
                </p>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Cursor Tracking</h3>
                <p className="mt-2 text-sm text-gray-500">
                  See where everyone is working with real-time cursor positions.
                </p>
              </div>
            </div>
            
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900">Secure Authentication</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Powered by Clerk for secure and easy authentication.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
