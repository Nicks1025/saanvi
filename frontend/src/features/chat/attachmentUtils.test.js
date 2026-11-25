import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as attachmentUtils from './attachmentUtils.js';

const { getAttachmentCategory } = attachmentUtils;

describe('getAttachmentCategory', () => {
  it('identifies explicit types correctly', () => {
    assert.equal(getAttachmentCategory({ attachment_type: 'image' }), 'image');
    assert.equal(getAttachmentCategory({ attachment_type: 'document' }), 'document');
    assert.equal(getAttachmentCategory({ attachment_type: 'file' }), 'file');
  });

  it('identifies legacy voice notes correctly', () => {
    assert.equal(
      getAttachmentCategory({ attachment_type: 'audio', file_name: 'voice-message.ogg' }),
      'voice'
    );
    assert.equal(
      getAttachmentCategory({ attachment_type: 'audio', original_file_name: 'voice-message.mp4' }),
      'voice'
    );
  });

  it('keeps normal audio files as audio', () => {
    assert.equal(
      getAttachmentCategory({ attachment_type: 'audio', file_name: 'song.mp3' }),
      'audio'
    );
  });

  it('falls back to mime_type if attachment_type is missing', () => {
    assert.equal(getAttachmentCategory({ mime_type: 'image/jpeg' }), 'image');
    assert.equal(getAttachmentCategory({ mime_type: 'application/pdf' }), 'document');
  });

  it('returns unknown for null or undefined', () => {
    assert.equal(getAttachmentCategory(null), 'unknown');
    assert.equal(getAttachmentCategory(undefined), 'unknown');
  });
});

describe('generatePreviewBase64', () => {
  it('returns null for non-media files', async () => {
    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    const result = await attachmentUtils.generatePreviewBase64(file);
    assert.equal(result, null);
  });
});
