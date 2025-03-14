"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiX, FiMail, FiSearch, FiUser } from "react-icons/fi";
import { useUser } from "@clerk/nextjs";
import { debounce } from "../utils/debounce";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "csharp", name: "C#" },
  { id: "cpp", name: "C++" },
  { id: "php", name: "PHP" },
  { id: "ruby", name: "Ruby" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
];

interface NewRoomFormProps {
  userId: string;
}

interface UserResult {
  id: string;
  email: string;
  name: string | null;
}

export default function NewRoomForm({ userId }: NewRoomFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [participants, setParticipants] = useState<UserResult[]>([]);
  const { user, isLoaded } = useUser();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    language: "javascript",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 3) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const response = await fetch(`/api/users/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) {
          throw new Error("Failed to search users");
        }
        const data = await response.json();
        setSearchResults(data.users);
      } catch (err) {
        console.error("Error searching users:", err);
        setError("Failed to search for users");
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (email) {
      debouncedSearch(email);
    } else {
      setSearchResults([]);
    }

    return () => {
      debouncedSearch.cancel();
    };
  }, [email, debouncedSearch]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handleAddParticipant = (selectedUser: UserResult) => {
    if (participants.some(p => p.email === selectedUser.email)) {
      setError("This user is already added");
      return;
    }

    setParticipants([...participants, selectedUser]);
    setEmail("");
    setSearchResults([]);
    setError(null);
  };

  const handleManualAddParticipant = () => {
    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError("Please enter a valid email address");
      return;
    }
    
    if (participants.some(p => p.email === email)) {
      setError("This user is already added");
      return;
    }
    
    // Check if we have a user with this email
    if (searchResults.length === 0) {
      setError("User not found. Only registered users can be added.");
      return;
    }
    
    // Add the first matching user - fix the potential undefined issue
    const userToAdd = searchResults[0];
    if (userToAdd) {
      handleAddParticipant(userToAdd);
    }
  };

  const handleRemoveParticipant = (emailToRemove: string) => {
    setParticipants(participants.filter(p => p.email !== emailToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          participants: [
            ...participants.map(p => p.email),
            user?.emailAddresses[0]?.emailAddress
          ]
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create room");
      }

      const room = await response.json();
      router.push(`/rooms/${room.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSubmitting(false);
    }
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Room Name *
        </label>
        <div className="mt-1">
          <Input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full"
            placeholder="My Awesome Project"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <Textarea
            name="description"
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="w-full"
            placeholder="A brief description of this code room"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-gray-700">
          Programming Language
        </label>
        <div className="mt-1">
          <Select
            value={formData.language}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, language: value }))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((language) => (
                <SelectItem key={language.id} value={language.id}>
                  {language.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div>
        <label htmlFor="participants" className="block text-sm font-medium text-gray-700 mb-1">
          Invite Participants (Only registered users)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
            {isSearching ? (
              <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <FiSearch className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <Input
            type="email"
            id="participants"
            value={email}
            onChange={handleEmailChange}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualAddParticipant())}
            className="pl-10 w-full"
            placeholder="Search for users by email (min 3 characters)"
          />
          
          {/* Search results dropdown */}
          {email.length >= 3 && (
            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-auto max-h-60">
              {isSearching ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {searchResults.map((result) => (
                    <li
                      key={result.id}
                      className="px-4 py-2 flex items-center hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleAddParticipant(result)}
                    >
                      <FiUser className="mr-2 text-gray-500" />
                      <div>
                        <div className="font-medium text-gray-900">{result.email}</div>
                        {result.name && <div className="text-sm text-gray-500">{result.name}</div>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-4 text-center text-sm text-gray-500">
                  No users found. Only registered users can be added.
                </div>
              )}
            </div>
          )}
        </div>
        
        {participants.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-500 mb-2">
              These users will be invited to join this room:
            </p>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <div>
                    <span className="text-sm text-gray-600">{participant.email}</span>
                    {participant.name && (
                      <span className="text-xs text-gray-500 ml-2">({participant.name})</span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveParticipant(participant.email)}
                    className="text-gray-400 hover:text-indigo-600 p-0 h-auto"
                  >
                    <FiX className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="mr-3"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Creating..." : "Create Room"}
        </Button>
      </div>
    </form>
  );
} 