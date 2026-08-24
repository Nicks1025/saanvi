import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ChatInput from './ChatInput';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: key => key })
}));

// Mock child components
vi.mock('./AttachmentPopover', () => ({ default: () => <div data-testid="attachment-popover" /> }));
vi.mock('./VoiceRecorder', () => ({ default: () => <div data-testid="voice-recorder" /> }));
vi.mock('./ImagePreviewStrip', () => ({ default: ({ onSend }) => <div data-testid="image-preview"><button onClick={() => onSend()} data-testid="preview-send" /></div> }));

describe('ChatInput', () => {
  let mockChatRealtime;

  beforeEach(() => {
    mockChatRealtime = {
      activeConversation: 'conv-1',
      sendMessage: vi.fn().mockResolvedValue(),
      sendTyping: vi.fn(),
      stopTyping: vi.fn(),
      addOptimisticMessage: vi.fn(),
      updateOptimisticMessage: vi.fn(),
      removeOptimisticMessage: vi.fn()
    };
  });

  it('calls stopTyping on input blur', () => {
    const { container } = render(<ChatInput chatRealtime={mockChatRealtime} user={{ uuid: 'me' }} />);
    const input = container.querySelector('input');
    
    act(() => {
      fireEvent.blur(input);
    });

    expect(mockChatRealtime.stopTyping).toHaveBeenCalled();
  });

  it('calls stopTyping on message send', async () => {
    const { container, getByRole } = render(<ChatInput chatRealtime={mockChatRealtime} user={{ uuid: 'me' }} />);
    const input = container.querySelector('input');
    
    act(() => {
      fireEvent.change(input, { target: { value: 'hello' } });
    });

    // Send button appears
    const sendBtn = getByRole('button', { name: 'chat.sendMessage' });
    
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(mockChatRealtime.sendMessage).toHaveBeenCalledWith('conv-1', 'hello');
    expect(mockChatRealtime.stopTyping).toHaveBeenCalled();
  });
});
