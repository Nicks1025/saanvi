const BaseService = require('../../base/baseService');
const { rooms, userActiveRooms, userCreatedRooms } = require('./unoStore');
const { getIo } = require('../../socket');

class UnoService extends BaseService {
  
  constructor() {
    super(null); // No repository
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async createRoom(creator) {
    let roomCode;
    let exists = true;
    
    // Ensure collision-safe room code
    while (exists) {
      roomCode = this.generateRoomCode();
      exists = rooms.has(roomCode);
    }

    const newPlayer = {
      id: creator.uuid, // Use UUID as player ID
      name: creator.name,
      avatar: creator.avatar,
      isHost: true,
      cardCount: 0,
      isSpeaking: false,
      isMuted: false,
      connectionStatus: 'disconnected', // Will connect via socket
      hasCalledUno: false,
      missedUno: false,
      score: 0,
      isReady: true,
      hand: [] // Hidden from others
    };

    const roomState = {
      code: roomCode,
      status: 'WAITING',
      hostId: creator.uuid,
      players: [newPlayer],
      playerLimit: 8,
      rules: {
        stacking: 'on',
        wildDrawFour: 'always_allowed',
        turnTimer: 30
      },
      createdAt: new Date().toISOString()
    };

    rooms.set(roomCode, roomState);
    
    // Broadcast creation to ensure anyone listening gets it immediately
    const io = getIo();
    if (io) {
      io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', {
        ...roomState,
        players: roomState.players.map(({ hand, ...p }) => p)
      });
    }
    
    // Add to user's active rooms set
    if (!userCreatedRooms.has(creator.uuid)) {
      userCreatedRooms.set(creator.uuid, new Set());
    }
    userCreatedRooms.get(creator.uuid).add(roomCode);
    
    // Set the player's active room lock
    userActiveRooms.set(creator.uuid, roomCode);
    
    return roomCode;
  }

  async getUserRooms(userId) {
    const roomCodesSet = userCreatedRooms.get(userId);
    if (!roomCodesSet || roomCodesSet.size === 0) return [];
    
    const activeRooms = [];
    for (const code of roomCodesSet) {
      const roomState = rooms.get(code);
      if (roomState && (roomState.status === 'WAITING' || roomState.status === 'PLAYING')) {
        // Only return rooms where this user is the host/creator
        if (roomState.hostId === userId) {
          activeRooms.push({
            code: roomState.code,
            status: roomState.status,
            players: roomState.players.length,
            playerLimit: roomState.playerLimit,
            createdAt: roomState.createdAt
          });
        } else {
          // Cleanup from their personal list if they aren't the host
          userCreatedRooms.get(userId).delete(code);
        }
      } else {
        // Cleanup expired or finished rooms
        userCreatedRooms.get(userId).delete(code);
      }
    }
    
    // Sort by most recent
    return activeRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async deleteRoom(roomCode, userId) {
    const roomState = rooms.get(roomCode);
    if (roomState && roomState.hostId === userId) {
      const io = getIo();
      if (io) {
        io.to(`uno:${roomCode}`).emit('ROOM_DELETED', { roomCode });
      }
      rooms.delete(roomCode);
      if (userCreatedRooms.has(userId)) {
        userCreatedRooms.get(userId).delete(roomCode);
      }
      return true;
    }
    return false;
  }

  async joinRoom(roomCode, user) {
    const roomState = rooms.get(roomCode);
    
    if (!roomState) {
      throw new Error('ROOM_NOT_FOUND');
    }

    if (roomState.status === 'GAME_OVER') {
      throw new Error('This game has already concluded.');
    }

    // Check if player already in room
    const existingPlayerIndex = roomState.players.findIndex(p => p.id === user.uuid);

    if (existingPlayerIndex !== -1) {
      // Player is already in the room, let them rejoin regardless of status
      const safePlayers = roomState.players.map(p => {
        const { hand, ...safePlayer } = p;
        return safePlayer;
      });

      return {
        ...roomState,
        players: safePlayers
      };
    }

    if (roomState.status !== 'WAITING') {
      throw new Error('GAME_ALREADY_STARTED');
    }

    if (roomState.players.length >= roomState.playerLimit) {
      throw new Error('ROOM_FULL');
    }

    // We already returned early if the player was in the room, so we know they are not
    const newPlayer = {
      id: user.uuid,
      name: user.name,
      avatar: user.avatar,
      isHost: user.uuid === roomState.hostId,
      cardCount: 0,

      isSpeaking: false,
      isMuted: false,
      connectionStatus: 'disconnected',
      hasCalledUno: false,
      missedUno: false,
      score: 0,
      isReady: true,
      hand: []
    };
    roomState.players.push(newPlayer);
    rooms.set(roomCode, roomState);
      
    // Lock the player's active room
    userActiveRooms.set(user.uuid, roomCode);

    // Strip hands before returning for privacy
    const safePlayers = roomState.players.map(p => {
      const { hand, ...safePlayer } = p;
      return safePlayer;
    });

    const io = getIo();
    if (io) {
      io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', { ...roomState, players: safePlayers });
    }

    return {
      ...roomState,
      players: safePlayers
    };
  }
}

module.exports = UnoService;
