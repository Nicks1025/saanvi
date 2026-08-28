const BaseService = require('../../base/baseService');
const RedisHelper = require('../../redis/redisHelper');
const { getIo } = require('../../socket');

class UnoService extends BaseService {
  
  constructor() {
    super(null); // No repository, using Redis
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
      exists = await RedisHelper.exists(`uno:room:${roomCode}`);
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

    await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24); // 24 hour TTL
    
    // Broadcast creation to ensure anyone listening gets it immediately
    const io = getIo();
    if (io) {
      io.to(`uno:${roomCode}`).emit('ROOM_UPDATED', {
        ...roomState,
        players: roomState.players.map(({ hand, ...p }) => p)
      });
    }
    
    // Add to user's active rooms set
    await RedisHelper.setAdd(`uno:user_rooms:${creator.uuid}`, roomCode);
    
    return roomCode;
  }

  async getUserRooms(userId) {
    const roomCodes = await RedisHelper.setMembers(`uno:user_rooms:${userId}`);
    if (!roomCodes || roomCodes.length === 0) return [];
    
    const activeRooms = [];
    for (const code of roomCodes) {
      const roomState = await RedisHelper.get(`uno:room:${code}`);
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
          await RedisHelper.setRemove(`uno:user_rooms:${userId}`, code);
        }
      } else {
        // Cleanup expired or finished rooms
        await RedisHelper.setRemove(`uno:user_rooms:${userId}`, code);
      }
    }
    
    // Sort by most recent
    return activeRooms.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async deleteRoom(roomCode, userId) {
    const roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    if (roomState && roomState.hostId === userId) {
      await RedisHelper.delete(`uno:room:${roomCode}`);
      await RedisHelper.setRemove(`uno:user_rooms:${userId}`, roomCode);
      return true;
    }
    return false;
  }

  async joinRoom(roomCode, user) {
    const roomState = await RedisHelper.get(`uno:room:${roomCode}`);
    
    if (!roomState) {
      throw new Error('ROOM_NOT_FOUND');
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
    await RedisHelper.set(`uno:room:${roomCode}`, roomState, 60 * 60 * 24);
      
    // Only the creator tracks this in their user_rooms set, so we do not add it for joining players.

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
