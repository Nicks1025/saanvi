import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChatService from './chatService';

describe('chatService.markMessageStatus authorization', () => {
  let chatService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      queryHelper: {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn()
      },
      getUserConversations: vi.fn(),
      upsertMessageReceipt: vi.fn()
    };
    
    // We instantiate chatService, injecting mock dependencies
    chatService = new ChatService(null, mockRepository);
    chatService.chatRepository = mockRepository;
  });

  it('should throw an error if the message does not exist', async () => {
    mockRepository.queryHelper.execute.mockResolvedValueOnce([]); // No message found

    await expect(chatService.markMessageStatus('user-1', 'msg-1', 'delivered'))
      .rejects.toThrow('Message not found');
  });

  it('should throw an error if the user is not in the conversation', async () => {
    // Message exists in conv-1
    mockRepository.queryHelper.execute.mockResolvedValueOnce([{ uuid: 'msg-1', conversation_uuid: 'conv-1' }]);
    // User is in conv-2
    mockRepository.getUserConversations.mockResolvedValueOnce([{ uuid: 'conv-2' }]);

    await expect(chatService.markMessageStatus('user-1', 'msg-1', 'delivered'))
      .rejects.toThrow('User is not a member of this conversation');
  });

  it('should call upsertMessageReceipt if user is authorized', async () => {
    // Message exists in conv-1
    mockRepository.queryHelper.execute.mockResolvedValueOnce([{ uuid: 'msg-1', conversation_uuid: 'conv-1' }]);
    // User is in conv-1
    mockRepository.getUserConversations.mockResolvedValueOnce([{ uuid: 'conv-1' }]);
    mockRepository.upsertMessageReceipt.mockResolvedValueOnce({ id: 1 });

    const result = await chatService.markMessageStatus('user-1', 'msg-1', 'seen');
    expect(result).toEqual({ id: 1 });
    expect(mockRepository.upsertMessageReceipt).toHaveBeenCalledWith('msg-1', 'user-1', 'seen');
  });
});
