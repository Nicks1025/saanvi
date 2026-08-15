module.exports = (io, socket, chatService) => {
  const userUuid = socket.user.uuid;

  // Send a message
  socket.on('message:send', async (payload, callback) => {
    try {
      const { conversation_uuid, message } = payload;
      
      if (!conversation_uuid || !message) {
        return callback && callback({ error: 'MESSAGE_INVALID' });
      }

      // Persist the message via chatService (which handles block checks and membership)
      const persistedMessage = await chatService.sendMessage(userUuid, conversation_uuid, message);

      // Emit to everyone in the conversation room (including sender to verify)
      io.to(`conversation:${conversation_uuid}`).emit('message:receive', persistedMessage);

      // Acknowledge sender
      if (callback) callback({ success: true, data: persistedMessage });

    } catch (err) {
      console.error('[Socket Chat] message:send error:', err.message);
      if (callback) callback({ error: err.message || 'MESSAGE_FAILED' });
    }
  });

  // Mark message as delivered
  socket.on('message:delivered', async (payload, callback) => {
    try {
      const { message_uuid, conversation_uuid } = payload;
      if (!message_uuid) return;

      const receipt = await chatService.markMessageStatus(userUuid, message_uuid, 'delivered');
      
      // Notify the room
      io.to(`conversation:${conversation_uuid}`).emit('message:status_update', {
        message_uuid,
        user_uuid: userUuid,
        status: 'delivered',
        delivered_at: receipt.delivered_at
      });

      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ error: err.message });
    }
  });

  // Mark message as seen
  socket.on('message:seen', async (payload, callback) => {
    try {
      const { message_uuid, conversation_uuid } = payload;
      if (!message_uuid) return;

      const receipt = await chatService.markMessageStatus(userUuid, message_uuid, 'seen');
      
      // Notify the room
      io.to(`conversation:${conversation_uuid}`).emit('message:status_update', {
        message_uuid,
        user_uuid: userUuid,
        status: 'seen',
        seen_at: receipt.seen_at
      });

      if (callback) callback({ success: true });
    } catch (err) {
      if (callback) callback({ error: err.message });
    }
  });
};
