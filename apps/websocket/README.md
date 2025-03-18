# WebSocket Server for Code Collab

This WebSocket server provides collaborative editing and chat functionality for the Code Collab application.

## Chat Authentication

The chat system uses Clerk for authentication to prevent impersonation attacks. Here's how it works:

### Client Implementation

1. Obtain the Clerk session token from your frontend Clerk instance.
2. Include the token when connecting to the websocket:
   ```
   ws://[host]:[port]/chat?token=[clerk-session-token]&room=[room-id]
   ```
3. The server validates the session token using Clerk's backend SDK.
4. If authentication fails, the connection will be closed with an error message.

### Sample Client Implementation with Clerk

```javascript
import { useAuth } from '@clerk/clerk-react';

// Connect to chat server using Clerk authentication
function connectToChat(room = "general") {
  const { getToken } = useAuth();
  
  async function establishConnection() {
    try {
      // Get the session token from Clerk
      const token = await getToken();
      
      if (!token) {
        console.error("Failed to get Clerk session token");
        return null;
      }
      
      const wsUrl = new URL("/chat", "ws://localhost:1235");
      
      // Add parameters
      wsUrl.searchParams.append("token", token);
      wsUrl.searchParams.append("room", room);
      
      const socket = new WebSocket(wsUrl.toString());
      
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        // Handle different message types...
        console.log("Received message:", message);
      };
      
      socket.onopen = () => {
        console.log("Connected to chat server");
      };
      
      socket.onclose = (event) => {
        if (event.code === 4000) {
          console.error("Authentication error:", event.reason);
        } else {
          console.log("Disconnected from chat server:", event.reason);
        }
      };
      
      return socket;
    } catch (error) {
      console.error("Failed to connect to chat:", error);
      return null;
    }
  }
  
  return establishConnection();
}

// Usage in a React component
function ChatComponent() {
  const [socket, setSocket] = useState(null);
  
  useEffect(() => {
    const initChat = async () => {
      const chatSocket = await connectToChat("general");
      setSocket(chatSocket);
    };
    
    initChat();
    
    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);
  
  // Rest of your component...
}
```

## Server Configuration

The server requires one of the following environment variables for Clerk integration:

```
# Either use the Secret Key (requires network call to Clerk)
CLERK_SECRET_KEY=your_clerk_secret_key

# Or for networkless verification (preferred for production)
CLERK_JWT_KEY=your_clerk_jwt_verification_key
```

You can obtain these from your Clerk dashboard:
- Secret Key: API Keys page → Secret Key
- JWT Verification Key: API Keys page → Show JWT Verification Key → PEM Public Key

## Security Considerations

- The WebSocket server relies on Clerk's security model for authentication.
- Session tokens have a limited lifespan, providing additional security.
- For production environments, consider using HTTPS/WSS to secure the connection.

## Setup

1. Install dependencies:

```bash
cd websocket-server
npm install
```

2. Build the TypeScript code:

```bash
npm run build
```

3. Start the server:

```bash
npm start
```

For development with automatic reloading:

```bash
npm run dev
```

## Configuration

The server can be configured using environment variables in the `.env` file at the root of the project:

- `WEBSOCKET_PORT`: The port on which the WebSocket server will run (default: 1234)
- `WEBSOCKET_HOST`: The host on which the WebSocket server will run (default: localhost)
- `NEXT_PUBLIC_WEBSOCKET_URL`: The WebSocket URL that the client will use to connect (default: ws://localhost:1234)

## Production Deployment

For production deployment, you should:

1. Set up the WebSocket server on a reliable host with a static IP or domain name
2. Configure proper security (TLS/SSL) for secure WebSocket connections (wss://)
3. Update the `.env` file with the production values:

```
WEBSOCKET_PORT=1234
WEBSOCKET_HOST=0.0.0.0  # Listen on all interfaces
NEXT_PUBLIC_WEBSOCKET_URL=wss://your-domain.com:1234
```

## How It Works

This server uses the y-websocket package to handle WebSocket connections for Yjs documents. When clients connect, they can collaborate in real-time on the same document, with changes being synchronized across all connected clients. 