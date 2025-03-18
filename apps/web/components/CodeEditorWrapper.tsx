"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";

// Use dynamic import with SSR disabled
const CodeMirrorEditor = dynamic(() => import("./CodeMirrorEditor"), { ssr: false });

// Define a User type since we can't import it from Clerk
interface ClerkUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddresses: Array<{ emailAddress: string }>;
}

// Define a simplified user object that can be safely serialized
interface SerializableUser {
  id: string;
  name: string;
  email: string;

}

interface CodeEditorWrapperProps {
  roomId: string;
  initialCode: string;
  language: string;
  currentUser: SerializableUser;
  isOwner: boolean;
  roomName: string;
  roomDescription?: string | null;
  roomOwner: string;
}

export default function CodeEditorWrapper({
  roomId,
  initialCode,
  language,
  currentUser,
  isOwner,
  roomName,
  roomDescription,
  roomOwner,
}: CodeEditorWrapperProps) {
  const [code, setCode] = useState(initialCode);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  // Create a simplified user object that can be safely serialized
  const simplifiedUser: SerializableUser = {
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email
  };
  
  console.log("simplifiedUser", simplifiedUser);
  // Debounced save function
  const saveCode = useCallback(
    async (codeToSave: string) => {
      if (!isOwner) return; // Only owners can save code changes
      
      setIsSaving(true);
      setSaveError(null);
      
      try {
        const response = await fetch(`/api/rooms/${roomId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code: codeToSave }),
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to save code");
        }
        
        setLastSaved(new Date());
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : "An error occurred while saving");
        console.error("Error saving code:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [roomId, isOwner]
  );
  
  // Debounce code saving
  useEffect(() => {
    if (code === initialCode) return;
    
    const timer = setTimeout(() => {
      saveCode(code);
    }, 2000); // Save after 2 seconds of inactivity
    
    return () => clearTimeout(timer);
  }, [code, initialCode, saveCode]);
  
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
  };
  
  return (
    <div className="flex flex-col h-full">
        <div className="mb-4 flex items-center justify-between">
      {isOwner && (
          <div className="flex items-center">
            {isSaving ? (
              <span className="text-sm text-gray-500">Saving...</span>
            ) : lastSaved ? (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            ) : null}
            
            {saveError && (
              <span className="ml-4 text-sm text-red-600">{saveError}</span>
            )}
          </div>
          
          
        )}
      <div className="text-sm text-gray-500">
            {isOwner ? "You can edit and save this code" : "View only mode"}
          </div>
        </div>
      <div className="flex-grow">
        <CodeMirrorEditor
          roomId={roomId}
          initialCode={initialCode}
          language={language}
          currentUser={simplifiedUser}
          onCodeChange={handleCodeChange}
          roomName={roomName}
          roomDescription={roomDescription}
          roomOwner={roomOwner}
        />
      </div>
    </div>
  );
} 