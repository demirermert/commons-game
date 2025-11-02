import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createGameManager } from './gameLogic.js';

const PORT = process.env.PORT || 4001;
const allowedOriginEnv = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginEnv
  ? allowedOriginEnv.split(',').map(origin => origin.trim()).filter(Boolean)
  : ['*'];
const corsConfig = allowedOrigins.includes('*')
  ? { origin: '*', methods: ['GET', 'POST'] }
  : { origin: allowedOrigins, methods: ['GET', 'POST'] };

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: corsConfig });

app.use(cors(corsConfig));
app.use(express.json());

const manager = createGameManager(io);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/session', (req, res) => {
  try {
    const { instructorName, config } = req.body || {};
    const session = manager.createSession(instructorName, config);
    res.status(201).json(session);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

io.on('connection', socket => {
  socket.on('joinSession', payload => {
    manager.handleJoin(socket, payload);
  });

  socket.on('startSession', ({ sessionCode }) => {
    manager.handleStartSession(socket, sessionCode);
  });

  socket.on('submitFish', payload => {
    manager.handleFishSubmission(socket, payload);
  });

  socket.on('disconnect', () => {
    manager.handleDisconnect(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Tragedy of Commons server listening on port ${PORT}`);
});

