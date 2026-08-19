import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImageMessage from './ImageMessage';

vi.mock('../../hooks/useAttachment', () => ({
  useAttachment: vi.fn(),
  ATTACHMENT_STATES: {
    NOT_DOWNLOADED: 'NOT_DOWNLOADED',
    DOWNLOADING: 'DOWNLOADING',
    DOWNLOADED: 'DOWNLOADED'
  }
}));

// Mock IntersectionObserver
let mockIsIntersecting = true;
vi.mock('../../../../hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => {
    const ref = { current: null };
    return [ref, mockIsIntersecting];
  }
}));

const { useAttachment, ATTACHMENT_STATES } = await import('../../hooks/useAttachment');

describe('ImageMessage', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsIntersecting = true;
    useAttachment.mockReturnValue({
      state: ATTACHMENT_STATES.NOT_DOWNLOADED,
      progress: 0,
      localUrl: null,
      download: vi.fn(),
      cancel: vi.fn()
    });
  });

  it('attaches ref to a wrapper div for intersection observer', async () => {
    let renderResult;
    await act(async () => {
      renderResult = render(
        <ImageMessage
          messageUuid="msg-1"
          attachment={{ uuid: 'att-1' }}
        />
      );
    });

    const wrapper = renderResult.container.querySelector('.msg-image-content');
    expect(wrapper).toBeInTheDocument();
  });

  it('shows blurred image and download button when not downloaded', () => {
    const { container } = render(
      <ImageMessage
        messageUuid="msg-1"
        attachment={{ uuid: 'att-1' }}
      />
    );

    const overlay = container.querySelector('.msg-gallery-overlay');
    expect(overlay).toBeInTheDocument();
  });

  it('shows image after downloading', async () => {
    useAttachment.mockReturnValue({
      state: ATTACHMENT_STATES.DOWNLOADED,
      progress: 100,
      localUrl: 'blob:http://example.com/img',
      download: vi.fn(),
      cancel: vi.fn()
    });

    let renderResult;
    await act(async () => {
      renderResult = render(
        <ImageMessage
          messageUuid="msg-1"
          attachment={{ uuid: 'att-1', original_file_name: 'photo.jpg' }}
        />
      );
    });

    const img = renderResult.container.querySelector('.msg-image');
    expect(img).toBeInTheDocument();
    expect(img.getAttribute('src')).toBe('blob:http://example.com/img');
  });
});
