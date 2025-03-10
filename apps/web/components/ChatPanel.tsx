"use client";

import { useState, useEffect, useRef } from "react";
import { FiSend, FiMessageSquare, FiAlertCircle, FiChevronDown, FiSmile, FiMoreHorizontal } from "react-icons/fi";
import useChat, { ChatMessage } from "../hooks/useChat";
import { useUser } from "@clerk/nextjs";

// Enhanced chat panel with improved UI
interface ChatPanelProps {
  roomName: string;
  roomDescription?: string | null;
  roomOwner: string;
  language: string;
  languageIcon: React.ReactNode;
  remoteUsers: Array<{ id: string; name: string; color: string }>;
  roomId: string;
  codeContent?: string; // Add codeContent prop
}

export default function ChatPanel({
  roomName,
  roomDescription,
  roomOwner,
  language,
  languageIcon,
  remoteUsers,
  roomId,
  codeContent = '', // Default to empty string
}: ChatPanelProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();
  const [isJarvisResponding, setIsJarvisResponding] = useState(false);
  const { 
    messages, 
    status, 
    sendMessage, 
    error, 
    users,
    loadMoreHistory,
    hasMoreHistory,
    isLoadingHistory
  } = useChat(roomId);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  
  // Handle scroll events
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const bottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 20;
      setIsAtBottom(bottom);
      setShowScrollButton(!bottom);
      
      if (bottom && hasUnread) {
        setHasUnread(false);
      }
    };
    
    chatContainer.addEventListener('scroll', handleScroll);
    return () => chatContainer.removeEventListener('scroll', handleScroll);
  }, [hasUnread]);
  
  // Auto-scroll to bottom when new messages arrive if already at bottom
  useEffect(() => {
    if (messages.length > 0) {
      if (isAtBottom) {
        scrollToBottom();
      } else {
        setHasUnread(true);
      }
    }
  }, [messages, isAtBottom]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setHasUnread(false);
  };

  const handleSendMessage = async () => {
    if (message.trim() === "" || !user) return;
    
    // Check if message contains @jarvis mention
    if (message.includes("@jarvis")) {
      setIsJarvisResponding(true);
      
      // Send the user message via WebSocket first
      if (sendMessage(message)) {
        // Clear the input after sending
        setMessage("");
        
        try {
          // Call Jarvis API
          const response = await fetch('/api/ai/jarvis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              code: codeContent,
              language,
              roomId,
            }),
          });
          
          if (!response.ok) {
            throw new Error('Failed to get Jarvis response');
          }
          
          // The Jarvis response is already stored in the database by the API
          // The chat will refresh automatically through the WebSocket
          
        } catch (error) {
          console.error('Error getting Jarvis response:', error);
        } finally {
          setIsJarvisResponding(false);
        }
      }
    } else {
      // Normal message, just send it via WebSocket
      if (sendMessage(message)) {
        // Clear the input only if message was sent successfully
        setMessage("");
      }
    }
    
    // Ensure we scroll to bottom after sending a message
    setTimeout(() => scrollToBottom(), 100);
  };
  
  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Format date for day separators
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
    }
  };
  
  // Determine if a message should show sender info
  const shouldShowSenderInfo = (index: number, message: ChatMessage) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    
    // Show sender info if this is from a different sender or more than 2 minutes apart
    return prevMessage && (
      prevMessage.senderId !== message.senderId || 
      (message.timestamp - prevMessage.timestamp > 2 * 60 * 1000)
    );
  };
  
  // Check if we need to show date separator
  const shouldShowDateSeparator = (index: number, message: ChatMessage) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    
    if (!prevMessage) return false;
    
    const prevDate = new Date(prevMessage.timestamp);
    const currentDate = new Date(message.timestamp);
    
    return prevDate.toDateString() !== currentDate.toDateString();
  };
  
  // Render different message types
  const renderMessage = (message: ChatMessage, index: number) => {
    const isCurrentUser = user && message.senderId === user.id;
    const isJarvis = message.senderId === 'jarvis';
    const showSenderInfo = shouldShowSenderInfo(index, message);
    const showDateSeparator = shouldShowDateSeparator(index, message);
    
    return (
      <div key={`msg-${message.timestamp}-${index}`}>
        {showDateSeparator && (
          <div className="flex items-center justify-center my-4">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-medium py-1 px-3 rounded-full">
              {formatDate(message.timestamp)}
            </div>
          </div>
        )}
        
        {message.type === 'join' || message.type === 'leave' ? (
          <div className="flex justify-center my-2">
            <div className="px-3 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 rounded-full">
              <span className="font-medium">{message.senderName}</span>
              {' '}{message.type === 'join' ? 'joined' : 'left'} the room
            </div>
          </div>
        ) : message.type === 'message' ? (
          <div 
            className={`flex flex-col mb-2 group ${isCurrentUser ? 'items-end' : 'items-start'}`}
          >
            {showSenderInfo && !isCurrentUser && (
              <div className="flex items-center ml-2 mb-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-1 ${
                  isJarvis ? 'bg-purple-600' : ''
                }`}
                    style={{ 
                      backgroundColor: isJarvis ? undefined : stringToColor(message.senderId),
                    }}>
                  {message.senderName.charAt(0).toUpperCase()}
                </div>
                <div className={`text-sm font-medium ${isJarvis ? 'text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-gray-100'}`}>
                  {message.senderName}
                </div>
              </div>
            )}
            
            <div className="flex items-end max-w-[85%] group">
              <div 
                className={`px-3 py-2 rounded-2xl ${
                  isCurrentUser 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : isJarvis
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-bl-none'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
              <div className={`text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mx-2`}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ) : message.type === 'private_message' ? (
          <div className="flex flex-col mb-2 items-end group">
            <div className="flex items-center mb-1">
              <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                Private: {isCurrentUser ? `You → ${message.recipientId}` : `${message.senderName} → You`}
              </div>
            </div>
            <div className="flex items-end max-w-[85%]">
              <div className="px-3 py-2 rounded-2xl bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-br-none">
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
              <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mx-2">
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };
  
  // Convert a string to a consistent color
  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{roomName}</h2>
          <div className={`h-2 w-2 rounded-full flex-shrink-0 ${
            status === 'connected' 
              ? 'bg-green-500' 
              : status === 'connecting' 
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`} title={status} />
        </div>
        
        {roomDescription && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">{roomDescription}</p>
        )}
        
        <div className="mt-2 flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 overflow-x-auto pb-1 scrollbar-thin">
          <div className="flex items-center flex-shrink-0">
            <span className="mr-1">{languageIcon}</span>
            <span>{language}</span>
          </div>
          
          <div className="flex items-center flex-shrink-0">
            <span className="mr-1 font-medium">Owner:</span> 
            <span className="truncate max-w-[80px]">{roomOwner}</span>
          </div>
          
          {remoteUsers.length > 0 && (
            <div className="flex items-center flex-shrink-0">
              <span className="mr-1 font-medium">Users:</span>
              <div className="flex -space-x-2">
                {remoteUsers.slice(0, 3).map(user => (
                  <div 
                    key={user.id}
                    className="h-5 w-5 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm border-2 border-white dark:border-gray-800"
                    style={{ backgroundColor: user.color }}
                    title={user.name}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {remoteUsers.length > 3 && (
                  <div className="h-5 w-5 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-semibold shadow-sm border-2 border-white dark:border-gray-800">
                    +{remoteUsers.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" 
        id="chat-messages"
        ref={chatContainerRef}
      >
        {error && (
          <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded flex items-center mb-4">
            <FiAlertCircle className="mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        {status === 'connecting' && (
          <div className="flex justify-center items-center h-16">
            <div className="flex space-x-1 items-center">
              <div className="animate-pulse bg-blue-400 dark:bg-blue-600 h-2 w-2 rounded-full"></div>
              <div className="animate-pulse delay-75 bg-blue-400 dark:bg-blue-600 h-2 w-2 rounded-full"></div>
              <div className="animate-pulse delay-150 bg-blue-400 dark:bg-blue-600 h-2 w-2 rounded-full"></div>
              <span className="ml-2 text-gray-500 dark:text-gray-400 text-sm">Connecting...</span>
            </div>
          </div>
        )}
        
        {messages.length === 0 && status === 'connected' ? (
          <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <FiMessageSquare className="h-6 w-6 mx-auto mb-2" />
              <p>No messages yet</p>
              <p className="text-xs mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1 pb-2">
            {messages.map((msg: ChatMessage, index: number) => renderMessage(msg, index))}
            <div ref={messagesEndRef} />
          </div>
        )}
        
        {hasMoreHistory && (
          <div className="flex justify-center my-3">
            <button
              onClick={loadMoreHistory}
              disabled={isLoadingHistory}
              className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-xs py-1 px-3 rounded-full flex items-center"
            >
              {isLoadingHistory ? (
                <>
                  <div className="animate-pulse bg-gray-400 dark:bg-gray-500 h-1 w-1 rounded-full mr-1"></div>
                  <div className="animate-pulse delay-75 bg-gray-400 dark:bg-gray-500 h-1 w-1 rounded-full mr-1"></div>
                  <div className="animate-pulse delay-150 bg-gray-400 dark:bg-gray-500 h-1 w-1 rounded-full mr-1"></div>
                  Loading...
                </>
              ) : (
                <>
                  <FiMoreHorizontal className="mr-1" /> Load older messages
                </>
              )}
            </button>
          </div>
        )}
      </div>
      
      {/* New messages indicator */}
      {hasUnread && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2">
          <button 
            onClick={scrollToBottom}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 px-3 rounded-full shadow-md flex items-center"
          >
            New messages <FiChevronDown className="ml-1" />
          </button>
        </div>
      )}
      
      {/* Scroll to bottom button */}
      {showScrollButton && !hasUnread && (
        <div className="absolute bottom-20 right-8">
          <button 
            onClick={scrollToBottom}
            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full p-2 shadow-md"
          >
            <FiChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {/* Input area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center">
          <input
            type="text"
            className="flex-1 px-2 rounded-l-lg border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 py-2"
            placeholder={status === 'connected' ? "Type @jarvis to ask AI for help..." : "Connecting..."}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={status !== 'connected' || isJarvisResponding}
          />
          <button
            className={`${
              status === 'connected' && message.trim() !== '' && !isJarvisResponding
                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                : 'bg-gray-400 text-white cursor-not-allowed'
            } rounded-r-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400`}
            onClick={handleSendMessage}
            disabled={status !== 'connected' || message.trim() === '' || isJarvisResponding}
          >
            {isJarvisResponding ? (
              <div className="flex space-x-1 items-center px-1">
                <div className="animate-pulse bg-white h-1 w-1 rounded-full"></div>
                <div className="animate-pulse delay-75 bg-white h-1 w-1 rounded-full"></div>
                <div className="animate-pulse delay-150 bg-white h-1 w-1 rounded-full"></div>
              </div>
            ) : (
              <FiSend className="h-5 w-5" />
            )}
          </button>
        </div>
        {status !== 'connected' && (
          <p className="text-xs text-gray-500 mt-1 ml-1">
            {status === 'connecting' ? 'Connecting to chat...' : 'Chat disconnected'}
          </p>
        )}
        {isJarvisResponding && (
          <p className="text-xs text-purple-500 mt-1 ml-1">
            Jarvis is thinking...
          </p>
        )}
      </div>
    </div>
  );
} 