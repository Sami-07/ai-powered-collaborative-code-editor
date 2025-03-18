import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';

export interface ChatMessage {
  id?: string;
  type: string;
  roomId?: string;
  senderId: string;
  senderName: string;
  content?: string;
  timestamp: number;
  recipientId?: string;
}

const useChat = (roomId: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<{id: string, name: string}[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const { getToken, userId } = useAuth();
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  
  // Connect to the chat WebSocket
  const connect = useCallback(async () => {
    if (!userId) return;
    
    try {
      setStatus('connecting');
      setError(null);
      
      // Get authentication token
      const token = await getToken();
      
      // Construct WebSocket URL with authentication
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = process.env.NEXT_PUBLIC_WEBSOCKET_URL || `${wsProtocol}//${window.location.hostname}:1235`;
      const wsUrl = new URL(`${wsHost}/chat?room=${roomId}&token=${token}`);
      console.log("wsUrl", wsUrl);

      // Create WebSocket connection
      const socket = new WebSocket(wsUrl.toString());
      socketRef.current = socket;
      
      // Set up event handlers
      socket.onopen = () => {
        console.log('Connected to chat server');
        setStatus('connected');
      };
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received message:', data);
        
        // Handle different message types
        switch (data.type) {
          case 'join':
            setMessages(prev => [...prev, data]);
            break;
            
          case 'leave':
            setMessages(prev => [...prev, data]);
            break;
            
          case 'message':
            setMessages(prev => [...prev, data]);
            break;
            
          case 'private_message':
            setMessages(prev => [...prev, data]);
            break;
            
          case 'user_list':
            if (data.users) {
              setUsers(data.users);
            }
            break;
            
          case 'error':
            setError(data.content || 'Unknown error');
            break;
            
          default:
            console.warn('Unknown message type:', data.type);
        }
      };
      
      socket.onclose = (event) => {
        console.log('Disconnected from chat server:', event.reason);
        setStatus('disconnected');
        
        // Auto-reconnect after delay, if the connection wasn't closed intentionally
        if (event.code !== 1000) {
          setTimeout(() => connect(), 5000);
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error. Please try again.');
      };
      
    } catch (error) {
      console.error('Failed to connect to chat:', error);
      setStatus('disconnected');
      setError('Failed to connect to chat server');
    }
  }, [roomId, getToken, userId]);
  
  // Disconnect from the chat WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close(1000, 'User disconnected');
    }
    socketRef.current = null;
    setStatus('disconnected');
  }, []);
  
  // Send a message
  const sendMessage = useCallback((content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'message',
        content
      };
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Send a private message
  const sendPrivateMessage = useCallback((recipientId: string, content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const message = {
        type: 'private',
        recipientId,
        content
      };
      socketRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);
  
  // Fetch chat history from server
  const fetchChatHistory = useCallback(async (loadMore = false) => {
    if (!userId || isLoadingHistory) return;
    
    try {
      setIsLoadingHistory(true);
      const token = await getToken();
      
      // Build the URL with parameters
      const url = new URL(`/api/chat/history`, window.location.origin);
      url.searchParams.append('roomId', roomId);
      url.searchParams.append('limit', '50');
      
      // If loading more history, use the oldest message as cursor
      if (loadMore && messages.length > 0 && hasMoreHistory) {
        // Find the oldest message with an ID
        const oldestMessages = [...messages].sort((a, b) => a.timestamp - b.timestamp);
        if (oldestMessages.length > 0 && oldestMessages[0] && oldestMessages[0].id) {
          url.searchParams.append('before', oldestMessages[0].id);
        }
      }
      
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log("data", data);
      if (data.messages && Array.isArray(data.messages)) {
        if (loadMore) {
          // Prepend historical messages to existing ones, avoiding duplicates
          const existingIds = new Set(messages.map(m => m.id).filter(Boolean));
          const newMessages = data.messages.filter((m: ChatMessage) => !existingIds.has(m.id));
          
          if (newMessages.length > 0) {
            setMessages(prev => [...newMessages, ...prev]);
          }
        } else {
          // Replace all messages with historical ones
          setMessages(data.messages);
        }
        setHasMoreHistory(data.hasMore);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      if (!loadMore) {
        setError('Error loading chat history');
      }
    } finally {
      setIsLoadingHistory(false);
    }
  }, [roomId, getToken, userId, messages, hasMoreHistory]);
  
  // Load more history (for pagination)
  const loadMoreHistory = useCallback(() => {
    if (hasMoreHistory && !isLoadingHistory) {
      console.log("fetching history inside loadMoreHistory true");
      fetchChatHistory(true);
    }
  }, [fetchChatHistory, hasMoreHistory, isLoadingHistory]);
  
  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (userId) {
      connect();
      // Only fetch history once on initial mount

      console.log("fetching history inside useEffect with 500ms delay setTimeout");
      const initialFetchTimeout = setTimeout(() => {
        fetchChatHistory();
      }, 500);
      
      return () => {
        disconnect();
        clearTimeout(initialFetchTimeout);
      };
    }
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect, userId, roomId]);
  
  return {
    messages,
    status,
    error,
    users,
    sendMessage,
    sendPrivateMessage,
    connect,
    disconnect,
    fetchChatHistory,
    loadMoreHistory,
    hasMoreHistory,
    isLoadingHistory
  };
};

export default useChat; 