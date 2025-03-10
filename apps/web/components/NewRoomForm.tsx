"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FiPlus, FiX, FiMail } from "react-icons/fi";
import { useUser } from "@clerk/nextjs";
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
  { id: "html", name: "HTML" },
  { id: "css", name: "CSS" },
];

interface NewRoomFormProps {
  userId: string;
}

export default function NewRoomForm({ userId }: NewRoomFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [participants, setParticipants] = useState<string[]>([]);
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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleAddParticipant = () => {
    // Basic email validation
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError("Please enter a valid email address");
      return;
    }

    if (participants.includes(email)) {
      setError("This email is already added");
      return;
    }

    setParticipants([...participants, email]);
    setEmail("");
    setError(null);
  };

  const handleRemoveParticipant = (emailToRemove: string) => {
    setParticipants(participants.filter(email => email !== emailToRemove));
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
          participants: [...participants, user?.emailAddresses[0]?.emailAddress]
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
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
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
          <input
            type="text"
            name="name"
            id="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 py-2 px-3 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="My Awesome Project"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            name="description"
            id="description"
            rows={3}
            value={formData.description}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 py-2 px-3 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="A brief description of this code room"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="language" className="block text-sm font-medium text-gray-700">
          Programming Language
        </label>
        <div className="mt-1">
          <select
            id="language"
            name="language"
            value={formData.language}
            onChange={handleChange}
            className="shadow-sm focus:ring-indigo-500 py-2 px-3 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
          >
            {LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>
                {language.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div>
        <label htmlFor="participants" className="block text-sm font-medium text-gray-700 mb-1">
          Invite Participants (Optional)
        </label>
        <div className="flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              id="participants"
              value={email}
              onChange={handleEmailChange}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
              className="pl-10 shadow-md focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 block w-full sm:text-base border border-gray-300 rounded-lg py-2 transition duration-150 ease-in-out hover:shadow-lg"
              placeholder="Enter email address"
            />
          </div>
          <button
            type="button"
            onClick={handleAddParticipant}
            className="ml-2 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <FiPlus className="h-4 w-4 mr-1" />
            Add
          </button>
        </div>
        
        {participants.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-500 mb-2">
              These users will be invited to join this room:
            </p>
            <div className="space-y-2">
              {participants.map((participantEmail) => (
                <div key={participantEmail} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                  <span className="text-sm text-gray-600">{participantEmail}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveParticipant(participantEmail)}
                    className="text-gray-400 hover:text-red-500 focus:outline-none"
                  >
                    <FiX className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? "Creating..." : "Create Room"}
        </button>
      </div>
    </form>
  );
} 