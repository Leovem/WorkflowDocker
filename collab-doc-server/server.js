import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';

const host = '0.0.0.0';
const port = 1234;

const server = createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end('Yjs collaborative document server running\n');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (conn, request) => {
  setupWSConnection(conn, request, {
    gc: true,
  });
});

server.listen(port, host, () => {
  console.log(`[YJS] Collaborative document server running on ws://${host}:${port}`);
});