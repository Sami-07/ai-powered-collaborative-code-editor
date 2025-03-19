"use client"

import Link from "next/link";
import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { TextAnimate } from "@/components/magicui/text-animate";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { FaCode } from "react-icons/fa6";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";

export default function Navbar() {




  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300", 
      "bg-white/95 backdrop-blur-md shadow-md" 
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center gap-2 group">
                <span className="text-indigo-600 text-2xl transition-transform group-hover:scale-110 duration-300">
                  <FaCode />
                </span>
                <AnimatedGradientText className="text-xl font-bold">
                  CodeCollab
                </AnimatedGradientText>
              </Link>
            </div>
            <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-700 hover:border-indigo-500 hover:text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200"
              >
                Home
              </Link>
             
             
              <SignedIn>
                <Link
                  href="/dashboard"
                  className="border-transparent text-gray-700 hover:border-indigo-500 hover:text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200"
                >
                  Dashboard
                </Link>
                <Link
                  href="/rooms"
                  className="border-transparent text-gray-700 hover:border-indigo-500 hover:text-indigo-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-200"
                >
                  Code Rooms
                </Link>
              </SignedIn>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <SignedIn>
              <TextAnimate animation="fadeIn" className="mr-4 text-indigo-600 font-medium">
                My Account
              </TextAnimate>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <div className="flex space-x-4">
                <Link href="/sign-in">
                  <Button variant="ghost">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button>
                    Sign Up Free
                  </Button>
                </Link>
              </div>
            </SignedOut>
          </div>
        </div>
      </div>
    </nav>
  );
} 