declare module 'y-websocket/bin/utils' {
  import * as WebSocket from 'ws';
  import * as http from 'http';
  
  export function setupWSConnection(
    conn: WebSocket,
    req: http.IncomingMessage,
    options?: { gc: boolean }
  ): void;
} 