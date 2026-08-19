import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { chatStorage } from './chatStorage';

describe('chatStorage', () => {
  beforeEach(async () => {
    // Setup fake indexedDB environment if needed
    // Vitest jsdom usually provides it, but just in case
    await chatStorage.init('test-user-uuid');
    await chatStorage.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should save and retrieve conversations', async () => {
    const mockConversations = [
      { uuid: 'conv-1', name: 'Test Conv 1' },
      { uuid: 'conv-2', name: 'Test Conv 2' }
    ];

    await chatStorage.saveConversations(mockConversations);
    
    const retrieved = await chatStorage.getConversations();
    expect(retrieved).toHaveLength(2);
    expect(retrieved.find(c => c.uuid === 'conv-1')).toBeTruthy();
  });

  it('should save and retrieve messages by conversation', async () => {
    const mockMessages = [
      { uuid: 'msg-1', conversation_uuid: 'conv-1', message: 'Hello', sent_at: '2026-08-19T20:00:00Z' },
      { uuid: 'msg-2', conversation_uuid: 'conv-1', message: 'World', sent_at: '2026-08-19T20:05:00Z' },
      { uuid: 'msg-3', conversation_uuid: 'conv-2', message: 'Other', sent_at: '2026-08-19T20:01:00Z' }
    ];

    await chatStorage.saveMessages(mockMessages);
    
    const retrievedConv1 = await chatStorage.getMessages('conv-1');
    expect(retrievedConv1).toHaveLength(2);
    // Should be sorted descending by sent_at
    expect(retrievedConv1[0].uuid).toBe('msg-2');
    expect(retrievedConv1[1].uuid).toBe('msg-1');

    const retrievedConv2 = await chatStorage.getMessages('conv-2');
    expect(retrievedConv2).toHaveLength(1);
    expect(retrievedConv2[0].uuid).toBe('msg-3');
  });

  it('should handle outbox messages', async () => {
    const pendingMsg = { uuid: 'pending-1', conversation_uuid: 'conv-1', message: 'Offline message' };
    
    await chatStorage.saveOutboxMessage(pendingMsg);
    
    const outbox = await chatStorage.getOutboxMessages();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].uuid).toBe('pending-1');
    
    await chatStorage.deleteOutboxMessage('pending-1');
    const emptyOutbox = await chatStorage.getOutboxMessages();
    expect(emptyOutbox).toHaveLength(0);
  });
});
