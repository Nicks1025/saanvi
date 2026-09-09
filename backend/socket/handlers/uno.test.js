const unoHandler = require('./uno');
const { rooms, userActiveRooms, userCreatedRooms } = require('../../features/uno/unoStore');
const UnoEngine = require('../../features/uno/unoEngine');

// Mock timers to test inactivity timeouts quickly
jest.useFakeTimers();

describe('Uno Socket Handler', () => {
  let io;
  let socket1;
  let socket2;
  let roomCode;

  beforeEach(() => {
    rooms.clear();
    userActiveRooms.clear();
    userCreatedRooms.clear();

    // Mock Socket.IO server
    io = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn()
    };

    // Helper to create a mock socket for a specific user
    const createMockSocket = (uuid, name) => {
      const handlers = {};
      return {
        user: { uuid, name },
        join: jest.fn(),
        leave: jest.fn(),
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
        on: jest.fn((event, cb) => { handlers[event] = cb; }),
        simulateEvent: async (event, data) => {
          if (handlers[event]) await handlers[event](data);
        }
      };
    };

    socket1 = createMockSocket('user-1', 'Player 1');
    socket2 = createMockSocket('user-2', 'Player 2');

    unoHandler(io, socket1);
    unoHandler(io, socket2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('simulates a full 2-player game scenario', async () => {
    // === 1. Room Creation (Simulated via Service) ===
    roomCode = 'TEST12';
    const roomState = {
      code: roomCode,
      status: 'WAITING',
      hostId: 'user-1',
      players: [{
        id: 'user-1', name: 'Player 1', avatar: null, isHost: true,
        cardCount: 0, isSpeaking: false, isMuted: false, connectionStatus: 'disconnected',
        hasCalledUno: false, missedUno: false, score: 0, isReady: true, hand: []
      }],
      playerLimit: 8,
      rules: { stacking: 'off', wildDrawFour: 'always_allowed', turnTimer: 30 },
      createdAt: new Date().toISOString()
    };
    rooms.set(roomCode, roomState);
    userActiveRooms.set('user-1', roomCode);
    userCreatedRooms.set('user-1', new Set([roomCode]));

    // Player 1 Joins
    await socket1.simulateEvent('uno:join', { roomCode });
    expect(socket1.join).toHaveBeenCalledWith(`uno:${roomCode}`);
    expect(rooms.get(roomCode).players[0].connectionStatus).toBe('connected');

    // === 2. Player 2 Joins ===
    const p2State = {
        id: 'user-2', name: 'Player 2', avatar: null, isHost: false,
        cardCount: 0, isSpeaking: false, isMuted: false, connectionStatus: 'connected',
        hasCalledUno: false, missedUno: false, score: 0, isReady: true, hand: []
    };
    rooms.get(roomCode).players.push(p2State); // Simulating UnoService.joinRoom
    userActiveRooms.set('user-2', roomCode);
    
    await socket2.simulateEvent('uno:join', { roomCode });
    expect(socket2.join).toHaveBeenCalledWith(`uno:${roomCode}`);

    // === 3. Start Game ===
    await socket1.simulateEvent('uno:start_game', { roomCode });
    
    let state = rooms.get(roomCode);
    expect(state.status).toBe('PLAYING');
    expect(state.players[0].hand.length).toBe(7);
    expect(state.players[1].hand.length).toBe(7);
    expect(io.to).toHaveBeenCalledWith(`uno:${roomCode}`);
    expect(io.emit).toHaveBeenCalledWith('GAME_STARTED');

    // === 4. Card Drawing ===
    // Force turn to Player 1 for predictability
    state.currentTurnIndex = 0;
    const initialDeckSize = state.deck.length;
    
    await socket1.simulateEvent('uno:draw_card', { roomCode });
    
    state = rooms.get(roomCode);
    expect(state.players[0].hand.length).toBe(8); // Player 1 drew a card
    expect(state.deck.length).toBe(initialDeckSize - 1);
    expect(state.currentTurnIndex).toBe(1); // Turn passed to Player 2
    
    // Check broadcast event
    expect(io.emit).toHaveBeenCalledWith('CARD_DRAWN', expect.objectContaining({
      playerId: 'user-1', count: 1
    }));

    // === 5. Card Playing ===
    // Player 2 plays a card. Let's rig their hand to ensure a valid play.
    const topDiscard = state.discardPile[state.discardPile.length - 1];
    // Create a mock card that is guaranteed to match the color
    const mockCard = { id: 'mock-1', color: topDiscard.color || 'Red', type: 'Number', value: '5' };
    state.players[1].hand.push(mockCard);
    
    await socket2.simulateEvent('uno:play_card', { 
        roomCode, 
        cardId: 'mock-1',
        selectedColor: null
    });

    state = rooms.get(roomCode);
    expect(state.discardPile[state.discardPile.length - 1].id).toBe('mock-1'); // Card is on top of discard
    expect(state.players[1].hand.findIndex(c => c.id === 'mock-1')).toBe(-1); // Card removed from hand
    expect(state.currentTurnIndex).toBe(0); // Turn back to Player 1

    // === 6. Turn Timeout ===
    // Player 1 doesn't do anything for 30 seconds
    expect(state.players[0].missedTurns || 0).toBe(0);
    
    // Fast-forward 30 seconds to trigger handleTurnTimeout
    jest.advanceTimersByTime(30000);
    
    // Promises inside timeouts require flushing the event loop
    await Promise.resolve();

    state = rooms.get(roomCode);
    expect(state.players[0].missedTurns).toBe(1); // Player 1 missed a turn
    expect(state.currentTurnIndex).toBe(1); // Turn passed to Player 2

    // === 7. Player Leaving ===
    // Player 2 leaves the game
    await socket2.simulateEvent('uno:leave', { roomCode });
    
    state = rooms.get(roomCode);
    expect(state).toBeUndefined(); // Room should be deleted since game over
    
    expect(io.emit).toHaveBeenCalledWith('GAME_OVER', expect.objectContaining({
      winnerId: 'user-1' // Player 1 is the winner because Player 2 left
    }));
    
    expect(userActiveRooms.has('user-2')).toBe(false);
  });
});
