const BaseService = require('../../base/baseService');
const { rooms, userActiveRooms, userCreatedRooms } = require('./unoStore');
const { getIo } = require('../../socket');

class UnoService extends BaseService {
  constructor(context = null) {
    super(context);
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
      currentTurn: null,
      topDiscard: null,
      currentColor: null,
      direction: 1,
      drawStack: 0,
      drawPile: [],
      discardPile: [],
      winner: null,
      lastAction: null,
      messages: [],
      createdAt: Date.now()
    };

    rooms.set(roomCode, roomState);
    userActiveRooms.set(creator.uuid, roomCode);

    // Track rooms created by this user
    if (!userCreatedRooms.has(creator.uuid)) {
      userCreatedRooms.set(creator.uuid, new Set());
    }
    userCreatedRooms.get(creator.uuid).add(roomCode);

    return roomCode;
  }

  async joinRoom(roomCode, user) {
    const room = rooms.get(roomCode);

    if (!room) {
      throw new Error('Room not found');
    }

    if (room.status !== 'WAITING') {
      throw new Error('Game already in progress');
    }

    if (room.players.length >= 10) {
      throw new Error('Room is full (max 10 players)');
    }

    // Check if player is already in this room
    const existingPlayer = room.players.find(p => p.id === user.uuid);
    
    if (existingPlayer) {
      userActiveRooms.set(user.uuid, roomCode);
      return { roomCode, isHost: existingPlayer.isHost };
    }

    const newPlayer = {
      id: user.uuid,
      name: user.name,
      avatar: user.avatar,
      isHost: false,
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

    room.players.push(newPlayer);
    userActiveRooms.set(user.uuid, roomCode);

    // Broadcast updated player list
    const io = getIo();
    if (io) {
      const publicPlayers = room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.isHost,
        cardCount: p.cardCount,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted,
        connectionStatus: p.connectionStatus,
        hasCalledUno: p.hasCalledUno,
        missedUno: p.missedUno,
        score: p.score,
        isReady: p.isReady
      }));
      io.to(roomCode).emit('uno:player_joined', { players: publicPlayers });
    }

    return { roomCode, isHost: false };
  }

  async getUserRooms(userUuid) {
    const createdRoomCodes = userCreatedRooms.get(userUuid);
    if (!createdRoomCodes || createdRoomCodes.size === 0) {
      return [];
    }

    const activeRooms = [];
    for (const code of createdRoomCodes) {
      const room = rooms.get(code);
      if (room) {
        activeRooms.push({
          code: room.code,
          status: room.status,
          playerCount: room.players.length,
          maxPlayers: 10,
          createdAt: room.createdAt,
          players: room.players.map(p => ({
            name: p.name,
            avatar: p.avatar,
            isHost: p.isHost
          }))
        });
      } else {
        // Clean up stale reference
        createdRoomCodes.delete(code);
      }
    }

    return activeRooms;
  }

  async closeRoom(roomCode, userUuid) {
    const room = rooms.get(roomCode);
    if (!room) {
      throw new Error('Room not found');
    }

    if (room.hostId !== userUuid) {
      throw new Error('Only the host can close this room');
    }

    // Notify all connected players that the room was closed
    const io = getIo();
    if (io) {
      io.to(roomCode).emit('uno:room_closed', { reason: 'Host closed the room' });
    }

    // Clean up active room mappings for all players in this room
    for (const player of room.players) {
      if (userActiveRooms.get(player.id) === roomCode) {
        userActiveRooms.delete(player.id);
      }
    }

    // Clean up creator's tracked rooms
    const createdRooms = userCreatedRooms.get(userUuid);
    if (createdRooms) {
      createdRooms.delete(roomCode);
    }

    // Delete the room from memory
    rooms.delete(roomCode);

    return true;
  }
}

module.exports = UnoService;
