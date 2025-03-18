"use client";

import { useState, useEffect, useRef } from "react";
import { FiSend, FiMessageSquare, FiAlertCircle, FiChevronDown, FiSmile, FiMoreHorizontal, FiCode, FiLink, FiBold, FiItalic } from "react-icons/fi";
import useChat, { ChatMessage } from "../hooks/useChat";
import { useUser } from "@clerk/nextjs";
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/atom-one-dark.css';
import { Components } from 'react-markdown';
import { Textarea } from "./ui/textarea";

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

// Define the type for the code component props
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
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
    
    // Process message before sending
    let processedMessage = message;
    
    // Check if the message might be an object or array
    if ((processedMessage.trim().startsWith('{') && processedMessage.trim().endsWith('}')) ||
        (processedMessage.trim().startsWith('[') && processedMessage.trim().endsWith(']'))) {
      try {
        // Try to parse it as JSON to see if it's valid
        const jsonObj = JSON.parse(processedMessage);
        // If it parses correctly, format it as a code block
        processedMessage = '```json\n' + JSON.stringify(jsonObj, null, 2) + '\n```';
      } catch (e) {
        // Not valid JSON, proceed as normal text
        console.log("Not valid JSON:", e);
      }
    }
    
    // Check if message contains @jarvis mention
    if (processedMessage.includes("@jarvis")) {
      setIsJarvisResponding(true);
      
      // Send the user message via WebSocket first
      if (sendMessage(processedMessage)) {
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
              message: processedMessage,
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
      if (sendMessage(processedMessage)) {
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
  
  // Custom components for ReactMarkdown
  const markdownComponents = {
    code: (props: any) => {
      const { inline, className, children } = props;
      const match = /language-(\w+)/.exec(className || '');
      
      return !inline ? (
        <div className="code-block w-full overflow-hidden rounded-lg shadow-md my-2">
          <div className="code-header px-3 py-1.5 bg-gray-800 text-gray-300 text-xs rounded-t">
            <span className="font-medium">{match && match[1] ? match[1] : 'code'}</span>
          </div>
          <div className="w-full overflow-auto max-h-[500px]">
            <pre className="!mt-0 !rounded-t-none w-full">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          </div>
        </div>
      ) : (
        <code className="bg-gray-800/20 dark:bg-gray-900/50 px-1.5 py-0.5 rounded font-mono text-sm break-all" {...props}>
          {children}
        </code>
      );
    },
    a: (props: any) => (
      <a target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline" {...props} />
    ),
  };
  
  // Render different message types
  const renderMessage = (message: ChatMessage, index: number) => {
    const isCurrentUser = user && message.senderId === user.id;
    const isJarvis = message.senderId === 'jarvis';
    const showSenderInfo = shouldShowSenderInfo(index, message);
    const showDateSeparator = shouldShowDateSeparator(index, message);
    
    // Process message content to handle objects properly
    let processedContent = message.content;
    if (processedContent && typeof processedContent === 'object') {
      try {
        processedContent = JSON.stringify(processedContent, null, 2);
        // Wrap in code block if it's JSON
        if (!processedContent.includes('```')) {
          processedContent = '```json\n' + processedContent + '\n```';
        }
      } catch (e) {
        console.warn("Error stringifying message content:", e);
        processedContent = String(processedContent);
      }
    }
    
    const hasCodeBlock = processedContent && processedContent.includes('```');
    
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
                className={`${
                  hasCodeBlock ? 'p-2' : 'px-3 py-2'
                } rounded-2xl ${
                  isCurrentUser 
                    ? `${hasCodeBlock ? 'bg-blue-700' : 'bg-blue-600'} text-white rounded-br-none` 
                    : isJarvis
                      ? `${hasCodeBlock ? 'bg-purple-200 dark:bg-purple-900/80' : 'bg-purple-100 dark:bg-purple-900'} text-purple-800 dark:text-purple-200 rounded-bl-none`
                      : `${hasCodeBlock ? 'bg-gray-300 dark:bg-gray-800' : 'bg-gray-200 dark:bg-gray-700'} text-gray-800 dark:text-gray-200 rounded-bl-none`
                } max-w-full overflow-hidden`}
              >
                <div className="markdown-content w-full overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                    components={markdownComponents}
                  >
                    {processedContent || ''}
                  </ReactMarkdown>
                </div>
              </div>
              <div className={`text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mx-2 flex-shrink-0`}>
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
              <div className={`${
                processedContent && processedContent.includes('```') ? 'p-2' : 'px-3 py-2'
              } rounded-2xl bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-br-none max-w-full overflow-hidden`}>
                <div className="markdown-content w-full overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
                    components={markdownComponents}
                  >
                    {processedContent || ''}
                  </ReactMarkdown>
                </div>
              </div>
              <div className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity mx-2 flex-shrink-0">
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
  
  // Add markdown toolbar
  const insertMarkdown = (type: string) => {
    let insertion = '';
    
    switch (type) {
      case 'bold':
        insertion = '**bold text**';
        break;
      case 'italic':
        insertion = '*italic text*';
        break;
      case 'code':
        insertion = '`code`';
        break;
      case 'codeblock':
        insertion = '```\ncode block\n```';
        break;
      case 'link':
        insertion = '[link text](https://example.com)';
        break;
    }
    
    setMessage(prev => {
      if (!prev) return insertion;
      
      // If there's a selection in the input, surround it with markdown syntax
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input && input.selectionStart !== null && input.selectionEnd !== null && 
          input.selectionStart !== input.selectionEnd) {
        const start = input.selectionStart;
        const end = input.selectionEnd;
        const selectedText = prev.substring(start, end);
        
        let prefix = '';
        let suffix = '';
        
        switch (type) {
          case 'bold':
            prefix = '**';
            suffix = '**';
            break;
          case 'italic':
            prefix = '*';
            suffix = '*';
            break;
          case 'code':
            prefix = '`';
            suffix = '`';
            break;
          case 'codeblock':
            prefix = '```\n';
            suffix = '\n```';
            break;
          case 'link':
            prefix = '[';
            suffix = '](https://example.com)';
            break;
        }
        
        return prev.substring(0, start) + prefix + selectedText + suffix + prev.substring(end);
      }
      
      return prev + insertion;
    });
  };

  // Add a paste handler for automatically formatting pasted JSON
  const handlePaste = (e: React.ClipboardEvent) => {
    const clipboardData = e.clipboardData || (window as any).clipboardData;
    const pastedData = clipboardData.getData('text');
    
    // Check if the pasted content looks like an object or array
    if ((pastedData.trim().startsWith('{') && pastedData.trim().endsWith('}')) ||
        (pastedData.trim().startsWith('[') && pastedData.trim().endsWith(']'))) {
      try {
        // Try to parse it as JSON to see if it's valid
        const jsonObj = JSON.parse(pastedData);
        // If it parses correctly, format it as a code block
        const formattedBlock = '```json\n' + JSON.stringify(jsonObj, null, 2) + '\n```';
        
        // Insert the formatted block in the message input
        e.preventDefault(); // Prevent default paste
        
        setMessage(prev => {
          const textArea = e.currentTarget as HTMLTextAreaElement;
          if (textArea && textArea.selectionStart !== null && textArea.selectionEnd !== null) {
            const start = textArea.selectionStart;
            const end = textArea.selectionEnd;
            return prev.substring(0, start) + formattedBlock + prev.substring(end);
          }
          return prev + formattedBlock;
        });
      } catch (e) {
        // Not valid JSON, proceed with normal paste
        console.log("Not valid JSON:", e);
      }
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-800 overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
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
        className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" 
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
      
      {/* Add markdown toolbar and update input area */}
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center px-3 pt-2">
          <div className="flex space-x-1 text-gray-500 dark:text-gray-400">
            <button 
              onClick={() => insertMarkdown('bold')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" 
              title="Bold"
            >
              <FiBold size={16} />
            </button>
            <button 
              onClick={() => insertMarkdown('italic')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" 
              title="Italic"
            >
              <FiItalic size={16} />
            </button>
            <button 
              onClick={() => insertMarkdown('code')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" 
              title="Inline Code"
            >
              <FiCode size={16} />
            </button>
            <button 
              onClick={() => insertMarkdown('codeblock')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" 
              title="Code Block"
            >
              <div className="flex items-center">
                <FiCode size={16} />
                <span className="text-xs ml-0.5">{ }</span>
              </div>
            </button>
            <button 
              onClick={() => insertMarkdown('link')}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700" 
              title="Link"
            >
              <FiLink size={16} />
            </button>
          </div>
        </div>
        
        <div className="p-3">
          <div className="flex items-center relative group bg-gray-50 dark:bg-gray-850 rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 shadow-sm transition-all duration-200 hover:ring-blue-300 dark:hover:ring-blue-700 focus-within:ring-blue-500 dark:focus-within:ring-blue-400 focus-within:ring-2">
            <Textarea
              className="flex-1 px-3 py-2.5 rounded-lg border-0 bg-transparent text-gray-900 dark:text-gray-100 text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:ring-0 focus:outline-none resize-none min-h-[60px]"
              placeholder={status === 'connected' 
                ? "Type a message or @jarvis to ask AI for help..." 
                : "Connecting..."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={status !== 'connected' || isJarvisResponding}
            />
            <button
              className={`absolute right-2 bottom-2 rounded-full p-2 focus:outline-none transition-all duration-200 transform ${
                status === 'connected' && message.trim() !== '' && !isJarvisResponding
                  ? 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-md hover:shadow-lg' 
                  : 'bg-gray-300 dark:bg-gray-600 text-white cursor-not-allowed'
              }`}
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
                <FiSend className="h-5 w-5 transition-transform group-hover:rotate-12" />
              )}
            </button>
          </div>
          {status !== 'connected' && (
            <p className="text-xs text-gray-500 mt-2 ml-1">
              {status === 'connecting' ? 'Connecting to chat...' : 'Chat disconnected'}
            </p>
          )}
          {isJarvisResponding && (
            <p className="text-xs text-purple-500 mt-2 ml-1 flex items-center">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2 animate-pulse"></span>
              Jarvis is thinking...
            </p>
          )}
        </div>
      </div>
      
      <style jsx global>{`
        /* Ensure the chat container doesn't allow horizontal scrolling */
        #chat-messages {
          overflow-x: hidden !important;
          width: 100%;
        }
        
        /* Make all code blocks in the chat properly handle overflow */
        #chat-messages pre {
          white-space: pre;
          overflow-x: auto;
          max-width: 100%;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        
        /* Update existing styles */
        .markdown-content {
          overflow-wrap: break-word;
          word-break: break-word;
          width: 100%;
          max-width: 100%;
          font-size: 0.95rem;
          line-height: 1.6;
        }
        
        .markdown-content p {
          margin-bottom: 0.75rem;
          white-space: normal;
        }
        
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        
        .markdown-content pre {
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          background-color: #1e1e1e;
          border-radius: 0.375rem;
          padding: 0.75rem 1rem;
          overflow-x: auto;
          max-width: 100%;
          width: 100%;
        }
        
        .markdown-content code {
          font-family: 'JetBrains Mono', 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
          font-size: 0.875rem;
          white-space: pre-wrap;
          word-break: break-all;
        }
        
        .code-block {
          margin: 0.75rem 0;
          overflow: hidden;
          border-radius: 0.375rem;
          max-width: 100%;
          width: 100%;
        }
        
        .code-block pre {
          margin: 0 !important;
          border-top-left-radius: 0 !important;
          border-top-right-radius: 0 !important;
          width: 100%;
          max-width: 100%;
          padding: 1rem;
        }
        
        .code-block code {
          display: inline-block;
          min-width: 100%;
          box-sizing: border-box;
        }
        
        .markdown-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .markdown-content blockquote {
          border-left: 4px solid #e5e7eb;
          padding-left: 1rem;
          color: #6b7280;
          margin: 0.75rem 0;
          background-color: rgba(229, 231, 235, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
        }
        
        .markdown-content h1,
        .markdown-content h2,
        .markdown-content h3,
        .markdown-content h4,
        .markdown-content h5,
        .markdown-content h6 {
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        
        .markdown-content h1 {
          font-size: 1.5rem;
        }
        
        .markdown-content h2 {
          font-size: 1.25rem;
        }
        
        .markdown-content h3 {
          font-size: 1.125rem;
        }
        
        .markdown-content table {
          border-collapse: collapse;
          margin: 0.75rem 0;
          overflow-x: auto;
          display: block;
          max-width: 100%;
          width: fit-content;
        }
        
        .markdown-content table th,
        .markdown-content table td {
          border: 1px solid #e5e7eb;
          padding: 0.5rem 0.75rem;
          white-space: normal;
          word-break: break-word;
        }
        
        .markdown-content table th {
          background-color: #f3f4f6;
          font-weight: 600;
        }
        
        .dark .markdown-content blockquote {
          border-left-color: #4b5563;
          color: #9ca3af;
          background-color: rgba(75, 85, 99, 0.2);
        }
        
        .dark .markdown-content table th,
        .dark .markdown-content table td {
          border-color: #4b5563;
        }
        
        .dark .markdown-content table th {
          background-color: #374151;
        }
        
        .code-header {
          border-bottom: 1px solid #4b5563;
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        
        /* Fix for inline code blocks that might be too long */
        .markdown-content :not(pre) > code {
          word-break: break-word;
          white-space: normal;
          padding: 0.1rem 0.3rem;
        }
        
        /* Ensure images don't overflow */
        .markdown-content img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1rem auto;
          border-radius: 0.375rem;
        }
      `}</style>
    </div>
  );
} 