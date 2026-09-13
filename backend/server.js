require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const connectDB = require("./src/config/db");
const User = require("./src/models/User");
const Message = require("./src/models/Message");
const Conversation = require("./src/models/Conversation");
const authRoutes = require("./src/routes/authRoutes");
const moodRoutes = require("./src/routes/moodRoutes");
const journalRoutes = require("./src/routes/journalRoutes");
const forumRoutes = require("./src/routes/forumRoutes");
const peerSupporterRoutes = require("./src/routes/peerSupporterRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const wellnessActivityRoutes = require("./src/routes/wellnessActivityRoutes");
const goalRoutes = require("./src/routes/goalRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");
const crisisSupportRoutes = require("./src/routes/crisisSupportRoutes");
const messageRoutes = require("./src/routes/messageRoutes");


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 5000;


connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Express 5 leaves req.url empty when the request path equals the mount path
const mount = (path, router) => {
  app.use(path, (req, _res, next) => {
    if (!req.url || req.url === "") req.url = "/";
    next();
  }, router);
};

// Routes
mount('/api/auth', authRoutes);
mount('/api/moods', moodRoutes);
mount('/api/journals', journalRoutes);
mount('/api/forum', forumRoutes);
mount('/api/peer-supporters', peerSupporterRoutes);
mount('/api/resources', resourceRoutes);
mount('/api/wellness-activities', wellnessActivityRoutes);
mount('/api/goals', goalRoutes);
mount('/api/sessions', sessionRoutes);
mount('/api/conversations', messageRoutes);

app.get("/api/ping-crisis", (req, res) => {
  res.json({ ok: true, route: "crisis-ping" });
});

app.post("/api/crisis-support", (req, res, next) => {
  req.url = "/";
  return crisisSupportRoutes(req, res, next);
});

app.get("/api/crisis-support", (req, res, next) => {
  req.url = "/";
  return crisisSupportRoutes(req, res, next);
});

// ── Socket.IO ──────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const onlineUsers = new Map(); // userId -> Set of socket IDs

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return next(new Error('User not found'));

    socket.userId = user._id.toString();
    socket.userName = user.name;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', async (socket) => {
  const userId = socket.userId;
  console.log(`[Socket] ${socket.userName} connected (${socket.id})`);

  // Track online status
  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);

  // Join all conversation rooms the user belongs to
  try {
    const convs = await Conversation.find({ participants: userId, deletedAt: null });
    convs.forEach((conv) => socket.join(conv._id.toString()));
    console.log(`[Socket] ${socket.userName} joined ${convs.length} rooms`);
  } catch (err) {
    console.error('[Socket] Error joining rooms:', err);
  }

  // ── Client requests to join a specific room ──
  socket.on('join_conversation', ({ conversationId }) => {
    if (conversationId) {
      socket.join(conversationId);
      console.log(`[Socket] ${socket.userName} joined room ${conversationId}`);
    }
  });

  // ── Send a message ──
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, content } = data;
      if (!conversationId || !content?.trim()) return;

      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
        deletedAt: null,
      });
      if (!conversation) return socket.emit('error', { message: 'Conversation not found' });

      const message = await Message.create({
        conversationId: conversation._id,
        senderId: userId,
        content: content.trim(),
        readBy: [userId],
      });

      conversation.lastMessage = message._id;
      conversation.lastMessageAt = message.createdAt;
      await conversation.save();

      const roomId = conversation._id.toString();
      const senderIdStr = userId.toString();
      const payload = {
        _id: message._id.toString(),
        conversationId: roomId,
        senderId: senderIdStr,
        senderName: socket.userName,
        content: message.content,
        readBy: message.readBy.map((id) => id.toString()),
        isMine: false,
        createdAt: message.createdAt.toISOString(),
      };

      console.log(`[Socket] Message from ${socket.userName} senderId=${senderIdStr} type=${typeof senderIdStr}`);

      // Broadcast to everyone in the room
      io.to(roomId).emit('receive_message', payload);
    } catch (err) {
      console.error('[Socket] send_message error:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // ── Typing indicator ──
  socket.on('typing', ({ conversationId }) => {
    socket.to(conversationId).emit('typing', {
      conversationId,
      userId,
      userName: socket.userName,
    });
  });

  socket.on('stop_typing', ({ conversationId }) => {
    socket.to(conversationId).emit('stop_typing', {
      conversationId,
      userId,
    });
  });

  // ── Mark as read ──
  socket.on('mark_read', async ({ conversationId }) => {
    try {
      await Message.updateMany(
        {
          conversationId,
          senderId: { $ne: userId },
          readBy: { $ne: userId },
        },
        { $addToSet: { readBy: userId } }
      );

      socket.to(conversationId).emit('messages_read', {
        conversationId,
        userId,
        userName: socket.userName,
      });
    } catch (err) {
      console.error('[Socket] mark_read error:', err);
    }
  });

  // ── Disconnect ──
  socket.on('disconnect', () => {
    console.log(`[Socket] ${socket.userName} disconnected (${socket.id})`);
    const sockets = onlineUsers.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) onlineUsers.delete(userId);
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`CareCircle API listening on http://localhost:${PORT}`);
});
