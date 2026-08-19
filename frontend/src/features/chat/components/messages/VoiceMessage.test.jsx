import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VoiceMessage from './VoiceMessage';
import { chatService } from '../../chat.service';

vi.mock('../../hooks/useAttachment', () => ({
  useAttachment: vi.fn(),
  ATTACHMENT_STATES: {
    NOT_DOWNLOADED: 'NOT_DOWNLOADED',
    DOWNLOADING: 'DOWNLOADING',
    DOWNLOADED: 'DOWNLOADED'
  }
}));

vi.mock('./MessageStatus', () => ({
  default: () => <div data-testid="msg-status" />
}));

const { useAttachment, ATTACHMENT_STATES } = await import('../../hooks/useAttachment');

describe('VoiceMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => setTimeout(cb, 16));
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => clearTimeout(id));
    window.HTMLElement.prototype.setPointerCapture = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    
    useAttachment.mockReturnValue({
      state: ATTACHMENT_STATES.DOWNLOADED,
      progress: 100,
      localUrl: 'blob:http://example.com/audio.webm',
      download: vi.fn(),
      cancel: vi.fn()
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders audio player and updates progress using refs and requestAnimationFrame', async () => {
    let renderResult;
    await act(async () => {
      renderResult = render(
        <VoiceMessage
          messageUuid="msg-1"
          attachment={{ uuid: 'att-1' }}
        />
      );
    });

    const audio = renderResult.container.querySelector('audio');
    expect(audio).toBeInTheDocument();

    // Mock play/pause on audio
    audio.play = vi.fn().mockResolvedValue();
    audio.pause = vi.fn();
    
    // Simulate metadata loaded
    act(() => {
      Object.defineProperty(audio, 'duration', { value: 60 });
      Object.defineProperty(audio, 'currentTime', { value: 0, writable: true });
      audio.dispatchEvent(new Event('loadedmetadata'));
    });

    // Check that total duration is rendered
    expect(renderResult.container.textContent).toContain('01:00');

    // Simulate play
    act(() => {
      Object.defineProperty(audio, 'paused', { value: false, writable: true });
      audio.dispatchEvent(new Event('play'));
    });

    // Progress updates should run
    act(() => {
      audio.currentTime = 30;
      vi.advanceTimersByTime(32); // let rAF fire
    });

    expect(window.requestAnimationFrame).toHaveBeenCalled();
    
    // Check playback timer rendering via the ref updating the text
    const currentTimer = renderResult.container.querySelector('.msg-voice-duration');
    expect(currentTimer.textContent).toBe('00:30');

    // Simulate pause
    act(() => {
      audio.dispatchEvent(new Event('pause'));
    });

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('handles unavailable duration fallback gracefully without NaN or Infinity', async () => {
    let renderResult;
    await act(async () => {
      renderResult = render(<VoiceMessage messageUuid="msg-2" attachment={{ uuid: 'att-2' }} />);
    });

    const audio = renderResult.container.querySelector('audio');
    act(() => {
      Object.defineProperty(audio, 'duration', { value: NaN });
      audio.dispatchEvent(new Event('loadedmetadata'));
    });

    expect(renderResult.container.textContent).not.toMatch(/NaN/i);
    expect(renderResult.container.textContent).not.toMatch(/Infinity/i);
    expect(renderResult.container.textContent).toContain('--:--');
  });

  it('aligns controls and metadata correctly and supports seeking', async () => {
    let renderResult;
    await act(async () => {
      renderResult = render(<VoiceMessage messageUuid="msg-3" attachment={{ uuid: 'att-3' }} />);
    });
    
    const audio = renderResult.container.querySelector('audio');
    act(() => {
      Object.defineProperty(audio, 'duration', { value: 100 });
      Object.defineProperty(audio, 'currentTime', { value: 0, writable: true });
      audio.dispatchEvent(new Event('loadedmetadata'));
    });

    const progressBar = renderResult.container.querySelector('.msg-voice-progress-bar');
    
    // Simulate drag seeking
    act(() => {
      progressBar.getBoundingClientRect = vi.fn().mockReturnValue({ left: 0, width: 100 });
      fireEvent.pointerDown(progressBar, { clientX: 50 }); // click at 50%
    });

    expect(audio.currentTime).toBe(50); // 50% of 100s
  });
});
