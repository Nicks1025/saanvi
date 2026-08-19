import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ImagePreviewStrip from './ImagePreviewStrip';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: key => key })
}));

describe('ImagePreviewStrip', () => {
  let images;
  
  beforeEach(() => {
    images = [
      { file: new File([''], 'img1.jpg', { type: 'image/jpeg' }), previewUrl: 'url1' },
    ];
  });

  it('renders image previews correctly', () => {
    const { container } = render(
      <ImagePreviewStrip images={images} onRemove={vi.fn()} onAddMore={vi.fn()} onSend={vi.fn()} onCancel={vi.fn()} sending={false} />
    );

    const img = container.querySelector('img.img-preview-thumb-img');
    
    expect(img).toBeInTheDocument();
  });


});
