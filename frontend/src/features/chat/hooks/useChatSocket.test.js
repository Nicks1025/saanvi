import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import useChatSocket from './useChatSocket';
import socketService from '@/services/socket.client';

vi.mock('../../../services/socket.client', () => ({
  default: {
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn()
  }
}));

describe('useChatSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces sendTyping and allows explicit stopTyping', () => {
    const { result } = renderHook(() => useChatSocket('me'));

    act(() => {
      // Simulate selecting a conversation
      result.current.setActiveConversation('conv-1');
    });

    act(() => {
      result.current.sendTyping();
    });

    expect(socketService.emit).toHaveBeenCalledWith('typing:start', { conversation_uuid: 'conv-1' });
    
    // Fast forward 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(socketService.emit).not.toHaveBeenCalledWith('typing:stop', expect.any(Object));

    // Call stopTyping explicitly
    act(() => {
      result.current.stopTyping();
    });

    expect(socketService.emit).toHaveBeenCalledWith('typing:stop', { conversation_uuid: 'conv-1' });

    // Fast forward remaining 500ms for original debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should not have emitted twice because timeout was cleared
    const stopCalls = socketService.emit.mock.calls.filter(call => call[0] === 'typing:stop');
    expect(stopCalls.length).toBe(1);
  });
});
