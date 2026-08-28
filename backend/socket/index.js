const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { getClient, isReady } = require('../redis/redisClient');
const authMiddleware = require('./middleware/auth');

const ChatRepository = require('../features/chat/chatRepository');
const ChatService = require('../features/chat/chatService');

const chatRepository = new ChatRepository();
const chatService = new ChatService(chatRepository);

// Handlers
const registerChatHandlers = require('./handlers/chat');
const registerPresenceHandlers = require('./handlers/presence');
const registerUnoHandlers = require('./handlers/uno');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // or your frontend URL
      methods: ['GET', 'POST']
    }
  });

  // Setup Redis Adapter for horizontal scaling if Redis is available
  if (isReady()) {
    const pubClient = getClient();
    const subClient = pubClient.duplicate();
    subClient.connect().catch(() => {}).then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('[Socket.IO] Redis adapter enabled');
    });
  }

  // Authentication Middleware
  io.use(authMiddleware);

  io.on('connection', async (socket) => {
    const userUuid = socket.user.uuid;
    
    // Join private user room for requests and notifications
    socket.join(`user:${userUuid}`);

    // Fetch authorized conversations and join their rooms
    try {
      const conversations = await chatService.getConversations(userUuid);
      conversations.forEach(conv => {
        socket.join(`conversation:${conv.uuid}`);
      });

      // Mark offline messages as delivered and emit updates
      const deliveredMessages = await chatService.markOfflineMessagesAsDelivered(userUuid);
      deliveredMessages.forEach(msg => {
        io.to(`conversation:${msg.conversation_uuid}`).emit('message:status_update', {
          message_uuid: msg.message_uuid,
          user_uuid: userUuid,
          status: 'delivered',
          delivered_at: msg.delivered_at
        });
      });
    } catch (err) {
      console.error('[Socket.IO] Error fetching conversations on connection:', err.message);
    }

    // Register module-specific handlers
    registerChatHandlers(io, socket, chatService);
    registerPresenceHandlers(io, socket, chatService);
    registerUnoHandlers(io, socket);

    socket.on('disconnect', () => {
       // Disconnect logic is handled in presence handlers if needed
    });
  });

  return io;
};

const getIo = () => io;

module.exports = { initSocket, getIo };
