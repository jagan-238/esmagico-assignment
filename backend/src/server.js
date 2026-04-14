import { loadEnv } from './config/env.js';

loadEnv();

import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { connectDb } from './config/db.js';
import { setSocketIo } from './socket/socketHub.js';
import { verifyAuthToken } from './services/authService.js';

const PORT = Number(process.env.PORT) || 5000;

async function main() {
  await connectDb();
  const app = createApp();
  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || true,
      methods: ['GET', 'POST'],
    },
  });

  setSocketIo(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Unauthorized'));
      }
      const payload = verifyAuthToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('project:join', (projectId) => {
      if (!projectId || typeof projectId !== 'string') return;
      socket.join(`project:${projectId}`);
    });
    socket.on('project:leave', (projectId) => {
      if (!projectId) return;
      socket.leave(`project:${projectId}`);
    });
  });

  server.listen(PORT, () => {
    console.log(`API listening on port ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
