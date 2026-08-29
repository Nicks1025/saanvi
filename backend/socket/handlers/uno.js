const RedisHelper = require('../../redis/redisHelper');
const UnoEngine = require('../../features/uno/unoEngine');

const roomTimers = new Map();

function clearTurnTimer(roomCode) {
  if (roomTimers.has(roomCode)) {
    clearTimeout(roomTimers.get(roomCode));
    roomTimers.delete(roomCode);
  }
}

function startTurnTimer(roomCode, io) {
  clearTurnTimer(roomCode);
  
  const timer = setTimeout(async () => {
    await handleTurnTimeout(roomCode, io);
  }, 30000);
  
  roomTimers.set(roomCode, timer);
}

async function handleTurnTimeout(roomCode, io) {
  let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
  if (!roomState || roomState.status !== 'PLAYING') {
    clearTurnTimer(roomCode);
    return;
  }

  const currentPlayer = roomState.players[roomState.currentTurnIndex];
  if (!currentPlayer) return;
  
  currentPlayer.missedTurns = (currentPlayer.missedTurns || 0) + 1;
  
  if (currentPlayer.missedTurns >= 3) {
    // Kick player
    roomState.kickedPlayers = [...(roomState.kickedPlayers || []), currentPlayer];
    roomState.players.splice(roomState.currentTurnIndex, 1);
    await RedisHelper.delete(`uno:player_active_room:${currentPlayer.id}`);
    
    if (roomState.players.length === 1) {
       roomState.status = 'GAME_OVER';
       
       const allPlayers = [...roomState.players, ...(roomState.kickedPlayers || [])];
       const scores = allPlayers.map(p => ({
         id: p.id,
         name: p.name,
         avatar: p.avatar,
         cardsLeft: p.cardCount || 0,
         score: (p.id === roomState.players[0].id) ? 100 : 0,
         isKicked: !!roomState.kickedPlayers.find(k => k.id === p.id)
       }));

       io.to(`uno:${roomCode}`).emit('GAME_OVER', { winnerId: roomState.players[0].id, roomId: roomCode, scores });
       await RedisHelper.delete(`uno:room:${roomCode}`);
       await RedisHelper.setRemove(`uno:user_rooms:${roomState.hostId}`, roomCode);
       clearTurnTimer(roomCode);
       return;
    } else {
       io.to(`uno:${roomCode}`).emit('PLAYER_KICKED', { playerId: currentPlayer.id, reason: 'inactivity' });
       // Adjust turn index
       roomState.currentTurnIndex = roomState.currentTurnIndex % roomState.players.length;
    }
  } else {
    // Force draw a card and skip
    let drawCount = 1;
    if (roomState.drawStack > 0) {
      drawCount = roomState.drawStack;
      roomState.drawStack = 0;
    }
    
    if (roomState.deck.length < drawCount) {
      const topDiscard = roomState.discardPile.pop();
      roomState.deck = UnoEngine.shuffle([...roomState.deck, ...roomState.discardPile]);
      roomState.discardPile = [topDiscard];
    }
    
    const drawnCards = roomState.deck.splice(0, drawCount);
    currentPlayer.hand.push(...drawnCards);
    currentPlayer.cardCount = currentPlayer.hand.length;
    
    roomState.currentTurnIndex = UnoEngine.getNextTurnIndex(roomState.currentTurnIndex, roomState.turnDirection, roomState.players.length, 1);
    
    io.to(`uno:${roomCode}`).emit('CARD_DRAWN', {
      roomId: roomCode,
      playerId: currentPlayer.id,
      count: drawCount,
      eventId: Date.now().toString(),
      timeout: true
    });
  }
  
  roomState.turnExpiresAt = Date.now() + 30000;
  await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
  
  // Broadcast state
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
  
  startTurnTimer(roomCode, io);
}

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
      roomState.turnExpiresAt = Date.now() + 30000;
      await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
      
      startTurnTimer(roomCode, io);

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
    socket.leave(`uno:${roomCode}`); // Leave immediately so they don't receive GAME_OVER broadcast
    let roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState) {
      if (roomState.status === 'PLAYING') {
        const pIndex = roomState.players.findIndex(p => p.id === userUuid);
        if (pIndex !== -1) {
          // Remove player completely
          roomState.players.splice(pIndex, 1);
          
          if (roomState.players.length === 1) {
            // Only one player left - declare winner and end game
            roomState.status = 'GAME_OVER';
            
            const allPlayers = [...roomState.players, ...(roomState.kickedPlayers || [])];
            const scores = allPlayers.map(p => ({
              id: p.id,
              name: p.name,
              avatar: p.avatar,
              cardsLeft: p.cardCount || 0,
              score: (p.id === roomState.players[0].id) ? 100 : 0,
              isKicked: !!roomState.kickedPlayers?.find(k => k.id === p.id)
            }));
            
            io.to(`uno:${roomCode}`).emit('GAME_OVER', { winnerId: roomState.players[0].id, roomId: roomCode, scores });
            await RedisHelper.delete(`uno:room:${roomCode}`);
            await RedisHelper.setRemove(`uno:user_rooms:${roomState.hostId}`, roomCode);
            clearTurnTimer(roomCode);
            return;
          } else if (roomState.players.length > 1) {
            // Adjust turn index
            if (roomState.currentTurnIndex === pIndex) {
               roomState.currentTurnIndex = pIndex % roomState.players.length;
            } else if (roomState.currentTurnIndex > pIndex) {
               roomState.currentTurnIndex -= 1;
            }
          }
        }
      } else {
        roomState.players = roomState.players.filter(p => p.id !== userUuid);
      }
      await RedisHelper.delete(`uno:player_active_room:${userUuid}`);

      if (roomState.players.length === 0) {
        // delete room if empty
        await RedisHelper.delete(`uno:room:${roomCode}`);
        await RedisHelper.setRemove(`uno:user_rooms:${roomState.hostId}`, roomCode);
        io.to(`uno:${roomCode}`).emit('ROOM_DELETED', { roomId: roomCode });
        clearTurnTimer(roomCode);
      } else {
        if (roomState.status === 'PLAYING') {
          roomState.turnExpiresAt = Date.now() + 30000;
        }
        await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
        
        if (roomState.status === 'PLAYING') {
          startTurnTimer(roomCode, io);
        }
        
        const safePlayers = roomState.players.map(p => {
          const { hand, ...safePlayer } = p;
          return safePlayer;
        });
        
        if (roomState.status === 'PLAYING') {
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
        } else {
           io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
        }
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
        
        const allPlayers = [...roomState.players, ...(roomState.kickedPlayers || [])];
        const scores = allPlayers.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          cardsLeft: p.cardCount || 0,
          score: (p.id === currentPlayer.id) ? 100 : 0,
          isKicked: !!roomState.kickedPlayers?.find(k => k.id === p.id)
        }));
        
        io.to(`uno:${roomCode}`).emit('GAME_OVER', { winnerId: currentPlayer.id, roomId: roomCode, scores });
        await RedisHelper.delete(`uno:room:${roomCode}`);
        await RedisHelper.setRemove(`uno:user_rooms:${roomState.hostId}`, roomCode);
        clearTurnTimer(roomCode);
        return;
      } else {
        currentPlayer.missedTurns = 0;
        roomState.turnExpiresAt = Date.now() + 30000;
      }

      await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
      
      if (roomState.status === 'PLAYING') {
        startTurnTimer(roomCode, io);
      }

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
    
    currentPlayer.missedTurns = 0;
    roomState.turnExpiresAt = Date.now() + 30000;

    await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
    
    startTurnTimer(roomCode, io);

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
    // If the socket drops without explicit leave, we just mark them as disconnected.
    // They can reconnect within the TTL. Only explicit 'uno:leave' removes them.
    const activeRoomCode = await RedisHelper.get(`uno:player_active_room:${userUuid}`);
    if (activeRoomCode) {
      let roomState = await RedisHelper.get(`uno:room:${activeRoomCode}`);
      if (roomState) {
        const pIndex = roomState.players.findIndex(p => p.id === userUuid);
        if (pIndex !== -1) {
          roomState.players[pIndex].connectionStatus = 'disconnected';
          await RedisHelper.set(`uno:room:${activeRoomCode}`, roomState, 60 * 60 * 24);
          
          const safePlayers = roomState.players.map(p => {
            const { hand, ...safePlayer } = p;
            return safePlayer;
          });
          
          if (roomState.status === 'PLAYING') {
            roomState.players.forEach(p => {
              if (p.connectionStatus === 'connected') {
                io.to(`user:${p.id}`).emit('GAME_STATE_UPDATED', {
                  ...roomState,
                  players: roomState.players.map(op => {
                    if (op.id === p.id) return op;
                    const { hand, ...safeOp } = op;
                    return safeOp;
                  })
                });
              }
            });
            io.to(`uno:${activeRoomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
          } else {
             io.to(`uno:${activeRoomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
          }
        }
      }
    }
  });
};
