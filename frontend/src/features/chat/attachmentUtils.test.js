import * as attachmentUtils from './attachmentUtils';

const { getAttachmentCategory } = attachmentUtils;

describe('getAttachmentCategory', () => {
  it('identifies explicit types correctly', () => {
    expect(getAttachmentCategory({ attachment_type: 'image' })).toBe('image');
    expect(getAttachmentCategory({ attachment_type: 'document' })).toBe('document');
    expect(getAttachmentCategory({ attachment_type: 'file' })).toBe('file');
  });

  it('identifies legacy voice notes correctly', () => {
    expect(
      getAttachmentCategory({ attachment_type: 'audio', file_name: 'voice-message.ogg' })
    ).toBe('voice');
    expect(
      getAttachmentCategory({ attachment_type: 'audio', original_file_name: 'voice-message.mp4' })
    ).toBe('voice');
  });

  it('keeps normal audio files as audio', () => {
    expect(
      getAttachmentCategory({ attachment_type: 'audio', file_name: 'song.mp3' })
    ).toBe('audio');
  });

  it('falls back to mime_type if attachment_type is missing', () => {
    expect(getAttachmentCategory({ mime_type: 'image/jpeg' })).toBe('image');
    expect(getAttachmentCategory({ mime_type: 'application/pdf' })).toBe('document');
  });

  it('returns unknown for null or undefined', () => {
    expect(getAttachmentCategory(null)).toBe('unknown');
    expect(getAttachmentCategory(undefined)).toBe('unknown');
  });
});

describe('generatePreviewBase64', () => {
  it('returns null for non-media files', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const result = await attachmentUtils.generatePreviewBase64(file);
    expect(result).toBeNull();
  });
});
