const RedisHelper = require('../../redis/redisHelper');
const UnoEngine = require('../../features/uno/unoEngine');

module.exports = (io, socket) => {
  const userUuid = socket.user.uuid;

  socket.on('uno:join', async ({ roomCode }) => {
    socket.join(`uno:${roomCode}`);
    const roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState) {
      // Connect player
      const pIndex = roomState.players.findIndex(p => p.id === userUuid);
      if (pIndex !== -1) {
        roomState.players[pIndex].connectionStatus = 'connected';
        await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
        
        // Broadcast sanitized state
        const safePlayers = roomState.players.map(p => {
          const { hand, ...safePlayer } = p;
          return safePlayer;
        });

        if (roomState.status === 'PLAYING') {
          // Send personalized game state to the reconnecting player
          io.to(`user:${userUuid}`).emit('GAME_STATE_UPDATED', {
            ...roomState,
            players: roomState.players.map(op => {
              if (op.id === userUuid) return op;
              const { hand, ...safeOp } = op;
              return safeOp;
            })
          });
          // Notify others in the room
          socket.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
        } else {
          io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
        }
      }
    }
  });

  socket.on('uno:start_game', async ({ roomCode }) => {
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState && roomState.hostId === userUuid && roomState.status === 'WAITING') {
      if (roomState.players.length < 2) return;
      if (!roomState.players.every(p => p.isReady)) return;

      roomState = UnoEngine.startGameState(roomState);
      await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);

      // Send GAME_STARTED to all
      io.to(`uno:${roomCode}`).emit('GAME_STARTED');

      // Send personalized hands
      roomState.players.forEach(p => {
        io.to(`user:${p.id}`).emit('GAME_STATE_UPDATED', {
          ...roomState,
          players: roomState.players.map(op => {
            if (op.id === p.id) return op; // Send full object to self
            const { hand, ...safeOp } = op;
            return safeOp;
          })
        });
      });
    }
  });

  socket.on('uno:leave', async ({ roomCode }) => {
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState) {
      roomState.players = roomState.players.filter(p => p.id !== userUuid);
      socket.leave(`uno:${roomCode}`);

      if (roomState.players.length === 0) {
        // delete room if empty
        await RedisHelper.delete(`uno:room:${roomCode}`);
        await RedisHelper.setRemove(`uno:user_rooms:${roomState.hostId}`, roomCode);
      } else {
        await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
        
        const safePlayers = roomState.players.map(p => {
          const { hand, ...safePlayer } = p;
          return safePlayer;
        });
        io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
      }
    }
  });

  socket.on('uno:play_card', async ({ roomCode, cardId, selectedColor }) => {
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (!roomState || roomState.status !== 'PLAYING') return;

    const currentPlayer = roomState.players[roomState.currentTurnIndex];
    if (currentPlayer.id !== userUuid) return; // Not their turn

    const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return; // Card not in hand

    const card = currentPlayer.hand[cardIndex];
    const topDiscard = roomState.discardPile[roomState.discardPile.length - 1];

    if (UnoEngine.validatePlay(card, roomState.activeColor, topDiscard, roomState.rules, currentPlayer.hand)) {
      // Valid play
      currentPlayer.hand.splice(cardIndex, 1);
      currentPlayer.cardCount = currentPlayer.hand.length;
      roomState.discardPile.push(card);

      const effect = UnoEngine.applyCardEffect(roomState, card, selectedColor);
      roomState.activeColor = effect.activeColor;
      roomState.turnDirection = effect.turnDirection;
      roomState.drawStack = effect.drawStack;
      
      // Handle Stacking Auto-Draw if Stacking is OFF
      if (roomState.rules.stacking === 'off' && effect.drawStack > 0) {
        const targetPlayer = roomState.players[effect.nextTurnIndex];
        const drawnCards = roomState.deck.splice(0, effect.drawStack);
        targetPlayer.hand.push(...drawnCards);
        targetPlayer.cardCount = targetPlayer.hand.length;
        
        io.to(`uno:${roomCode}`).emit('CARD_DRAWN', {
          roomId: roomCode,
          playerId: targetPlayer.id,
          count: effect.drawStack,
          eventId: Date.now().toString()
        });
        
        roomState.drawStack = 0; // Clear stack
        roomState.currentTurnIndex = UnoEngine.getNextTurnIndex(effect.nextTurnIndex, roomState.turnDirection, roomState.players.length, 1);
      } else {
        roomState.currentTurnIndex = effect.nextTurnIndex;
      }

      // Check win
      if (currentPlayer.cardCount === 0) {
        roomState.status = 'GAME_OVER';
        io.to(`uno:${roomCode}`).emit('GAME_OVER', { winnerId: currentPlayer.id });
      }

      await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);

      // Emit CARD_PLAYED event for animation
      io.to(`uno:${roomCode}`).emit('CARD_PLAYED', {
        roomId: roomCode,
        playerId: currentPlayer.id,
        card: card,
        eventId: Date.now().toString()
      });

      // Broadcast new state
      roomState.players.forEach(p => {
        io.to(`user:${p.id}`).emit('GAME_STATE_UPDATED', {
          ...roomState,
          players: roomState.players.map(op => {
            if (op.id === p.id) return op;
            const { hand, ...safeOp } = op;
            return safeOp;
          })
        });
      });
    }
  });

  socket.on('uno:draw_card', async ({ roomCode }) => {
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (!roomState || roomState.status !== 'PLAYING') return;

    const currentPlayer = roomState.players[roomState.currentTurnIndex];
    if (currentPlayer.id !== userUuid) return;

    let drawCount = 1;
    if (roomState.drawStack > 0) {
      drawCount = roomState.drawStack;
      roomState.drawStack = 0;
    }

    if (roomState.deck.length < drawCount) {
      // Reshuffle
      const topDiscard = roomState.discardPile.pop();
      roomState.deck = UnoEngine.shuffle([...roomState.deck, ...roomState.discardPile]);
      roomState.discardPile = [topDiscard];
    }

    const drawnCards = roomState.deck.splice(0, drawCount);
    currentPlayer.hand.push(...drawnCards);
    currentPlayer.cardCount = currentPlayer.hand.length;

    // Advance turn
    roomState.currentTurnIndex = UnoEngine.getNextTurnIndex(roomState.currentTurnIndex, roomState.turnDirection, roomState.players.length, 1);

    await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);

    io.to(`uno:${roomCode}`).emit('CARD_DRAWN', {
      roomId: roomCode,
      playerId: currentPlayer.id,
      count: drawCount,
      eventId: Date.now().toString()
    });

    // Broadcast new state
    roomState.players.forEach(p => {
      io.to(`user:${p.id}`).emit('GAME_STATE_UPDATED', {
        ...roomState,
        players: roomState.players.map(op => {
          if (op.id === p.id) return op;
          const { hand, ...safeOp } = op;
          return safeOp;
        })
      });
    });
  });

  // WEBRTC SIGNALING
  socket.on('webrtc:offer', ({ to, offer }) => {
    socket.to(`user:${to}`).emit('webrtc:offer', { from: userUuid, offer });
  });

  socket.on('webrtc:answer', ({ to, answer }) => {
    socket.to(`user:${to}`).emit('webrtc:answer', { from: userUuid, answer });
  });

  socket.on('webrtc:ice_candidate', ({ to, candidate }) => {
    socket.to(`user:${to}`).emit('webrtc:ice_candidate', { from: userUuid, candidate });
  });

  socket.on('uno:voice_status', async ({ roomCode, isMuted }) => {
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState) {
      const pIndex = roomState.players.findIndex(p => p.id === userUuid);
      if (pIndex !== -1) {
        roomState.players[pIndex].isMuted = isMuted;
        await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
        
        io.to(`uno:${roomCode}`).emit('VOICE_STATUS_UPDATED', { playerId: userUuid, isMuted });
      }
    }
  });

  socket.on('uno:toggle_ready', async ({ roomCode, isReady }) => {
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState) {
      const pIndex = roomState.players.findIndex(p => p.id === userUuid);
      if (pIndex !== -1) {
        roomState.players[pIndex].isReady = isReady;
        await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
        
        const safePlayers = roomState.players.map(p => {
          const { hand, ...safePlayer } = p;
          return safePlayer;
        });
        io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
      }
    }
  });

  socket.on('disconnect', async () => {
    // Handling disconnect cleanly in a real app would involve finding which room the user is in.
    // For this prototype we rely on the client emitting a leave event or the room tracking connections.
  });
};
