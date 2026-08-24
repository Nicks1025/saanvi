// Maintain a simple in-memory set of online users for this node.
// For a fully scaled Redis architecture, we would use a Redis SET per user or presence hash.
const localOnlineUsers = new Set();

module.exports = (io, socket, chatService) => {
  const userUuid = socket.user.uuid;

  // Mark user as online upon connection
  localOnlineUsers.add(userUuid);
  
  // Since presence might need to be global, a simple broadcast to all conversations the user is in:
  socket.on('presence:sync', async () => {
    try {
      const conversations = await chatService.getConversations(userUuid);
      
      // 1. Broadcast to others that I am online
      conversations.forEach(conv => {
        io.to(`conversation:${conv.uuid}`).emit('presence:online', { user_uuid: userUuid });
      });

      // 2. Tell the connecting user who is already online
      const onlineSet = new Set();
      conversations.forEach(conv => {
         if (conv.members) {
            conv.members.forEach(m => {
               if (m.uuid !== userUuid && localOnlineUsers.has(m.uuid)) {
                  onlineSet.add(m.uuid);
               }
            });
         }
      });
      
      // Emit online presence for each currently online user back to THIS socket
      onlineSet.forEach(uuid => {
         socket.emit('presence:online', { user_uuid: uuid });
      });
      
    } catch (e) {
      console.error(e);
    }
  });

  socket.on('typing:start', (payload) => {
    const { conversation_uuid } = payload;
    if (!conversation_uuid) return;
    
    // Broadcast to the conversation room (except the sender)
    socket.to(`conversation:${conversation_uuid}`).emit('typing:update', {
      conversation_uuid,
      user_uuid: userUuid,
      is_typing: true
    });
  });

  socket.on('typing:stop', (payload) => {
    const { conversation_uuid } = payload;
    if (!conversation_uuid) return;

    socket.to(`conversation:${conversation_uuid}`).emit('typing:update', {
      conversation_uuid,
      user_uuid: userUuid,
      is_typing: false
    });
  });

  socket.on('disconnect', async () => {
    // Ideally we check if this was the last socket for this user
    // For simplicity, we broadcast offline status
    try {
      const conversations = await chatService.getConversations(userUuid);
      conversations.forEach(conv => {
        io.to(`conversation:${conv.uuid}`).emit('presence:offline', { user_uuid: userUuid });
      });
    } catch (e) {
      // ignore
    }
    localOnlineUsers.delete(userUuid);
  });
};
