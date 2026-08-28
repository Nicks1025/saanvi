import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCardsGame } from './useCardsGame';
import socketService from '../../../services/socket.client';

// Mock dependencies
vi.mock('../../../store/AuthContext', () => ({
  useAuth: () => ({ user: { uuid: 'test-user-id' } })
}));

vi.mock('../../../services/socket.client', () => {
  return {
    default: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }
  };
});

vi.mock('./services/unoService', () => ({
  createUnoRoom: vi.fn(),
  joinUnoRoom: vi.fn()
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// We only want to test that it doesn't crash on initialization and returns the expected contract
describe('useCardsGame Hook', () => {
  it('should initialize without crashing and return the full UI contract', () => {
    const { result } = renderHook(() => useCardsGame());
    
    // Check key destructured properties used by GameTableView
    expect(result.current).toHaveProperty('room');
    expect(result.current).toHaveProperty('players');
    expect(result.current).toHaveProperty('currentTurnPlayer');
    expect(result.current).toHaveProperty('isMyTurn');
    expect(result.current).toHaveProperty('topCard');
    expect(result.current).toHaveProperty('discardPile');
    expect(result.current).toHaveProperty('activeColor');
    expect(result.current).toHaveProperty('deckCount');
    expect(result.current).toHaveProperty('drawCard');
    expect(result.current).toHaveProperty('playLocalCard');
    expect(result.current).toHaveProperty('localHand');
    expect(result.current).toHaveProperty('playableCardIds');
    expect(result.current).toHaveProperty('direction');
    expect(result.current).toHaveProperty('activeStack');
    expect(result.current).toHaveProperty('lastPlayedBy');
    expect(result.current).toHaveProperty('unoTimeLeft');
    expect(result.current.unoTimeLeft).toBe(0);
    expect(result.current).toHaveProperty('catchableOpponents');
    expect(Array.isArray(result.current.catchableOpponents)).toBe(true);
    expect(result.current).toHaveProperty('isMicMuted');
    expect(result.current).toHaveProperty('isSpeakerMuted');
    expect(result.current).toHaveProperty('toggleMic');
    expect(result.current).toHaveProperty('toggleSpeaker');
  });

  it('should attach socket listeners on mount', () => {
    renderHook(() => useCardsGame());
    
    expect(socketService.on).toHaveBeenCalledWith('ROOM_UPDATED', expect.any(Function));
    expect(socketService.on).toHaveBeenCalledWith('GAME_STATE_UPDATED', expect.any(Function));
    expect(socketService.on).toHaveBeenCalledWith('CARD_PLAYED', expect.any(Function));
    expect(socketService.on).toHaveBeenCalledWith('CARD_DRAWN', expect.any(Function));
    expect(socketService.on).toHaveBeenCalledWith('GAME_STARTED', expect.any(Function));
    expect(socketService.on).toHaveBeenCalledWith('GAME_OVER', expect.any(Function));
  });
});
