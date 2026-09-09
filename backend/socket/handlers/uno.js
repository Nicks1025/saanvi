const { rooms, userActiveRooms, userCreatedRooms } = require('../../features/uno/unoStore');
const UnoEngine = require('../../features/uno/unoEngine');

const roomTimers = new Map();
const disconnectTimers = new Map(); // grace-period timers keyed by userUuid

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
  let roomState = rooms.get(roomCode);
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
    userActiveRooms.delete(currentPlayer.id);
    
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
       rooms.delete(roomCode);
       if (userCreatedRooms.has(roomState.hostId)) {
         userCreatedRooms.get(roomState.hostId).delete(roomCode);
       }
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
  rooms.set(roomCode, roomState);
  
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
    const roomState = rooms.get(roomCode);
    if (roomState) {
      // Cancel any pending disconnect grace-period timer for this player
      const pendingTimer = disconnectTimers.get(userUuid);
      if (pendingTimer) {
        clearTimeout(pendingTimer);
        disconnectTimers.delete(userUuid);
      }

      // Connect player
      const pIndex = roomState.players.findIndex(p => p.id === userUuid);
      if (pIndex !== -1) {
        roomState.players[pIndex].connectionStatus = 'connected';
        rooms.set(roomCode, roomState);
        
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
    let roomState = rooms.get(roomCode);
    if (roomState && roomState.hostId === userUuid && roomState.status === 'WAITING') {
      if (roomState.players.length < 2) return;
      if (!roomState.players.every(p => p.isReady)) return;

      roomState = UnoEngine.startGameState(roomState);
      roomState.turnExpiresAt = Date.now() + 30000;
      rooms.set(roomCode, roomState);
      
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
    let roomState = rooms.get(roomCode);
    if (roomState) {
      if (roomState.status === 'PLAYING') {
        const pIndex = roomState.players.findIndex(p => p.id === userUuid);
        if (pIndex !== -1) {
          // Remove player completely
          roomState.players.splice(pIndex, 1);
          
          if (roomState.players.length === 1) {
            // Only one player left - declare winner and end game
            roomState.status = 'GAME_OVER';
            userActiveRooms.delete(userUuid); // clean up leaving player
            
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
            rooms.delete(roomCode);
            if (userCreatedRooms.has(roomState.hostId)) {
              userCreatedRooms.get(roomState.hostId).delete(roomCode);
            }
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
      userActiveRooms.delete(userUuid);

      if (roomState.players.length === 0) {
        // delete room if empty
        rooms.delete(roomCode);
        if (userCreatedRooms.has(roomState.hostId)) {
          userCreatedRooms.get(roomState.hostId).delete(roomCode);
        }
        io.to(`uno:${roomCode}`).emit('ROOM_DELETED', { roomId: roomCode });
        clearTurnTimer(roomCode);
      } else {
        if (roomState.status === 'PLAYING') {
          roomState.turnExpiresAt = Date.now() + 30000;
        }
        rooms.set(roomCode, roomState);
        
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
    let roomState = rooms.get(roomCode);
    if (!roomState || roomState.status !== 'PLAYING') return;

    const currentPlayer = roomState.players[roomState.currentTurnIndex];
    if (currentPlayer.id !== userUuid) return; // Not their turn

    const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return; // Card not in hand

    const card = currentPlayer.hand[cardIndex];
    const topDiscard = roomState.discardPile[roomState.discardPile.length - 1];

    if (UnoEngine.validatePlay(card, roomState.activeColor, topDiscard, roomState, currentPlayer.hand)) {
      console.log(`[UNO] Valid play by ${userUuid}:`, card.value, card.color);
      // Valid play
      currentPlayer.hand.splice(cardIndex, 1);
      currentPlayer.cardCount = currentPlayer.hand.length;
      
      // Reset Uno state if they no longer have 1 card
      if (currentPlayer.cardCount !== 1) {
        currentPlayer.hasCalledUno = false;
        currentPlayer.missedUno = false;
      }
      
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
        rooms.delete(roomCode);
        if (userCreatedRooms.has(roomState.hostId)) {
          userCreatedRooms.get(roomState.hostId).delete(roomCode);
        }
        clearTurnTimer(roomCode);
        return;
      } else {
        currentPlayer.missedTurns = 0;
        roomState.turnExpiresAt = Date.now() + 30000;
      }

      rooms.set(roomCode, roomState);
      
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
    } else {
      console.log(`[UNO] Invalid play attempt by ${userUuid}:`, card, 'Active Color:', roomState.activeColor, 'Top Discard:', topDiscard);
    }
  });

  socket.on('uno:draw_card', async ({ roomCode }) => {
    let roomState = rooms.get(roomCode);
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
    currentPlayer.hasCalledUno = false;
    currentPlayer.missedUno = false;

    // Advance turn
    roomState.currentTurnIndex = UnoEngine.getNextTurnIndex(roomState.currentTurnIndex, roomState.turnDirection, roomState.players.length, 1);
    
    currentPlayer.missedTurns = 0;
    roomState.turnExpiresAt = Date.now() + 30000;

    rooms.set(roomCode, roomState);
    
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

  socket.on('uno:say_uno', async ({ roomCode }) => {
    let roomState = rooms.get(roomCode);
    if (!roomState || roomState.status !== 'PLAYING') return;

    const player = roomState.players.find(p => p.id === userUuid);
    if (!player || player.cardCount !== 1) return;

    player.hasCalledUno = true;
    player.missedUno = false;
    rooms.set(roomCode, roomState);

    io.to(`uno:${roomCode}`).emit('UNO_CALLED', { playerId: userUuid });

    const safePlayers = roomState.players.map(p => {
      const { hand, ...safeP } = p;
      return safeP;
    });
    io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
  });

  socket.on('uno:catch_uno', async ({ roomCode, targetId }) => {
    let roomState = rooms.get(roomCode);
    if (!roomState || roomState.status !== 'PLAYING') return;

    const target = roomState.players.find(p => p.id === targetId);
    if (!target || target.cardCount !== 1 || target.hasCalledUno || target.missedUno) return;

    target.missedUno = true;

    // Draw 2 cards penalty
    if (roomState.deck.length < 2) {
      const topDiscard = roomState.discardPile.pop();
      roomState.deck = UnoEngine.shuffle([...roomState.deck, ...roomState.discardPile]);
      roomState.discardPile = [topDiscard];
    }

    const drawnCards = roomState.deck.splice(0, 2);
    target.hand.push(...drawnCards);
    target.cardCount = target.hand.length;
    target.hasCalledUno = false;

    rooms.set(roomCode, roomState);

    io.to(`uno:${roomCode}`).emit('UNO_CAUGHT', { catcherId: userUuid, targetId: targetId });
    io.to(`uno:${roomCode}`).emit('CARD_DRAWN', {
      roomId: roomCode,
      playerId: targetId,
      count: 2,
      eventId: Date.now().toString()
    });

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
    let roomState = rooms.get(roomCode);
    if (roomState) {
      const pIndex = roomState.players.findIndex(p => p.id === userUuid);
      if (pIndex !== -1) {
        roomState.players[pIndex].isMuted = isMuted;
        rooms.set(roomCode, roomState);
        
        io.to(`uno:${roomCode}`).emit('VOICE_STATUS_UPDATED', { playerId: userUuid, isMuted });
      }
    }
  });

  socket.on('uno:toggle_ready', async ({ roomCode, isReady }) => {
    let roomState = rooms.get(roomCode);
    if (roomState) {
      const pIndex = roomState.players.findIndex(p => p.id === userUuid);
      if (pIndex !== -1) {
        roomState.players[pIndex].isReady = isReady;
        rooms.set(roomCode, roomState);
        
        const safePlayers = roomState.players.map(p => {
          const { hand, ...safePlayer } = p;
          return safePlayer;
        });
        io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
      }
    }
  });

  socket.on('disconnect', async () => {
    const activeRoomCode = userActiveRooms.get(userUuid);
    if (!activeRoomCode) return;

    let roomState = rooms.get(activeRoomCode);
    if (!roomState) return;

    const pIndex = roomState.players.findIndex(p => p.id === userUuid);
    if (pIndex === -1) return;

    // Mark player as disconnected immediately so others can see it
    roomState.players[pIndex].connectionStatus = 'disconnected';
    rooms.set(activeRoomCode, roomState);

    // Notify others of disconnection
    const safePlayers = roomState.players.map(p => { const { hand, ...s } = p; return s; });
    io.to(`uno:${activeRoomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });

    // Give the player 8 seconds to reconnect before removing them
    const GRACE_MS = 8000;
    const existingTimer = disconnectTimers.get(userUuid);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      disconnectTimers.delete(userUuid);

      // Re-read room state — it may have changed during the grace period
      let currentRoomState = rooms.get(activeRoomCode);
      if (!currentRoomState) return; // Room already gone

      const currentPIndex = currentRoomState.players.findIndex(p => p.id === userUuid);
      if (currentPIndex === -1) return; // Already removed (e.g. by explicit leave)

      // Still disconnected after grace period — remove them
      const disconnectedPlayer = currentRoomState.players[currentPIndex];
      if (disconnectedPlayer.connectionStatus !== 'disconnected') return; // Reconnected in time

      currentRoomState.players.splice(currentPIndex, 1);
      userActiveRooms.delete(userUuid);

      if (currentRoomState.status === 'PLAYING') {
        if (currentRoomState.players.length === 1) {
          // Only one player left — end the game
          currentRoomState.status = 'GAME_OVER';

          const allPlayers = [...currentRoomState.players, ...(currentRoomState.kickedPlayers || []),
            { id: userUuid, name: disconnectedPlayer.name, avatar: disconnectedPlayer.avatar, cardCount: disconnectedPlayer.cardCount || 0 }];
          const scores = allPlayers.map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar || null,
            cardsLeft: p.cardCount || 0,
            score: (p.id === currentRoomState.players[0].id) ? 100 : 0,
            isKicked: false
          }));

          io.to(`uno:${activeRoomCode}`).emit('GAME_OVER', {
            winnerId: currentRoomState.players[0].id,
            roomId: activeRoomCode,
            scores
          });
          rooms.delete(activeRoomCode);
          if (userCreatedRooms.has(currentRoomState.hostId)) {
            userCreatedRooms.get(currentRoomState.hostId).delete(activeRoomCode);
          }
          clearTurnTimer(activeRoomCode);
          return;
        } else {
          // Multiple players remain — adjust turn and continue
          if (currentRoomState.currentTurnIndex === currentPIndex) {
            currentRoomState.currentTurnIndex = currentPIndex % currentRoomState.players.length;
          } else if (currentRoomState.currentTurnIndex > currentPIndex) {
            currentRoomState.currentTurnIndex -= 1;
          }
          currentRoomState.turnExpiresAt = Date.now() + 30000;
          rooms.set(activeRoomCode, currentRoomState);
          startTurnTimer(activeRoomCode, io);

          currentRoomState.players.forEach(p => {
            io.to(`user:${p.id}`).emit('GAME_STATE_UPDATED', {
              ...currentRoomState,
              players: currentRoomState.players.map(op => {
                if (op.id === p.id) return op;
                const { hand, ...safeOp } = op;
                return safeOp;
              })
            });
          });
        }
      } else {
        // Waiting room: just remove them
        rooms.set(activeRoomCode, currentRoomState);
        const safe = currentRoomState.players.map(p => { const { hand, ...s } = p; return s; });
        io.to(`uno:${activeRoomCode}`).emit('ROOM_UPDATED', { ...currentRoomState, players: safe });
      }
    }, GRACE_MS);

    disconnectTimers.set(userUuid, timer);
  });
};
